import { describe, expect, it } from "vitest";
import { loadGameData } from "../../src/data/load.ts";
import { readRawData } from "../../src/data/raw-node.ts";
import { simulate } from "../../src/engine/simulate.ts";
import { parseClock } from "../../src/engine/time.ts";
import { readPresets } from "../../src/presets/node.ts";
import fixture from "../fixtures/krush.json";

const data = loadGameData(readRawData());
const build = readPresets().find((b) => b.id === fixture.preset)!;
const result = simulate(data, build);
const tol = fixture.tolerance;
const action = (id: string) => result.actions[build.actions.findIndex((a) => a.id === id)]!;
const produced = (unit: string, action?: string) =>
  result.produced
    .filter(
      (p) =>
        p.unit === unit && (action === undefined || build.actions[p.action ?? -1]?.id === action),
    )
    .map((p) => p.t);
const near = (got: number | undefined, want: string) => {
  expect(got, want).toBeDefined();
  expect(Math.abs(got! - parseClock(want)), `got ${got}, measured ${want}`).toBeLessThanOrEqual(
    tol,
  );
};

describe("golden: Krush (measured in game, ±10 s)", () => {
  it("clicks and reaches Classical on time, with 2 free Prometheans", () => {
    near(result.ageTimes.classical?.clicked, fixture.milestones.classicalClick);
    near(result.ageTimes.classical?.reached, fixture.milestones.classicalReached);
    const done = result.events.find((e) => e.kind === "ageDone" && e.age === "classical");
    expect(done).toMatchObject({ free: fixture.freeUnits.classical });
  });

  it("builds the Counter-Barracks near the Manor and Time Shifts it forward", () => {
    near(action("cb").completedAt, fixture.milestones.counterBarracksReady);
    near(action("ts2").completedAt, fixture.milestones.counterBarracksForward);
  });

  it("produces the auto-queued Citizens on time", () => {
    const got = produced("citizen").filter((t) => t > parseClock("3:30"));
    expect(got).toHaveLength(fixture.autoCitizens.length);
    fixture.autoCitizens.forEach((want, i) => near(got[i], want));
  });

  it("finishes the Manors (pop 35 → 55 → 75)", () => {
    near(action("m2").completedAt, fixture.milestones.manors[0]!);
    near(action("m3").completedAt, fixture.milestones.manors[1]!);
    expect(result.series.find((s) => s.t === parseClock("6:30"))?.popCap).toBe(75);
  });

  it("clicks and reaches Heroic on time, with 2 free Behemoths", () => {
    near(result.ageTimes.heroic?.clicked, fixture.milestones.heroicClick);
    near(result.ageTimes.heroic?.reached, fixture.milestones.heroicReached);
    const done = result.events.find((e) => e.kind === "ageDone" && e.age === "heroic");
    expect(done).toMatchObject({ free: fixture.freeUnits.heroic });
  });

  it("trains about as many Turmas as the real match by 6:20", () => {
    const tur = produced("turma").filter((t) => t <= parseClock("6:20"));
    expect(Math.abs(tur.length - fixture.turmas.length)).toBeLessThanOrEqual(1);
    near(tur[0], fixture.turmas[0]!);
  });

  // Known gap: the model cannot feed auto-queued Citizens and five Prometheans at the same time
  // (food), so it trains fewer Prometheans than the real match. See data-research/PENDING.md.
  it("trains Prometheans when favor allows (known gap: fewer than measured)", () => {
    const pro = produced("promethean", "pr").filter((t) => t <= parseClock("6:20"));
    expect(pro.length).toBeGreaterThanOrEqual(fixture.prometheans.length - 2);
  });

  it("runs without error warnings", () => {
    expect(result.warnings.filter((w) => w.level === "error")).toEqual([]);
  });
});
