import { describe, expect, it } from "vitest";
import { loadGameData } from "../../src/data/load.ts";
import { readRawData } from "../../src/data/raw-node.ts";
import { compareWithReference, type ReferenceMatch } from "../../src/engine/reference.ts";
import { simulate } from "../../src/engine/simulate.ts";
import { readPresets } from "../../src/presets/node.ts";
import fixture from "../fixtures/krush.json";

// The Krush times were measured in one real match: a reference, not the truth (the game files are).
// Only rows that follow directly from the game data and fixed action times are asserted; the rest
// (economy-dependent) is reported by `npm run compare:krush`.
const ref = fixture as unknown as ReferenceMatch;
const data = loadGameData(readRawData());
const build = readPresets().find((b) => b.id === ref.preset)!;
const { result, rows } = compareWithReference(data, build, ref);
const rowOf = (label: string) => rows.find((r) => r.label === label)!;

describe("Krush preset against the measured match (reference)", () => {
  for (const label of [
    "Classical click",
    "Classical reached",
    "Counter Barracks ready",
    "Counter Barracks forward",
  ]) {
    it(`${label} is within ±${fixture.tolerance} s`, () => {
      expect(Math.abs(rowOf(label).diff ?? Infinity)).toBeLessThanOrEqual(fixture.tolerance);
    });
  }

  it("gets the free myth units of Kronos on both age ups", () => {
    const done = result.events.filter((e) => e.kind === "ageDone");
    expect(done[0]).toMatchObject({ free: fixture.freeUnits.classical });
    expect(done[1]).toMatchObject({ free: fixture.freeUnits.heroic });
  });

  it("produces a value for most reference rows and runs without errors", () => {
    expect(rows.filter((r) => r.diff !== undefined).length).toBeGreaterThan(rows.length / 2);
    expect(result.warnings.filter((w) => w.level === "error")).toEqual([]);
  });
});

describe("an auto queue and an action waiting at the same building", () => {
  it("the queue keeps training while the Heroic age-up waits for food (as in the game)", () => {
    const long = structuredClone(build);
    const queue = long.actions.find(
      (a) => a.do === "train" && a.mode === "auto" && a.unit === "citizen",
    )!;
    (queue as { duration?: number }).duration = 376;
    const r = simulate(data, long);
    const heroic = r.events.find((e) => e.kind === "ageStart" && e.age === "heroic")!;
    const index = long.actions.indexOf(queue);
    const waited = r.warnings.find(
      (w) => w.action === long.actions.findIndex((a) => a.do === "age" && a.to === "heroic"),
    );
    const wanted = heroic.t - Number(waited?.params.waited ?? 0);
    const citizens = r.events.filter((e) => e.kind === "unitReady" && e.action === index);
    expect(citizens.some((e) => e.t > wanted + 30 && e.t < heroic.t)).toBe(true);
  });
});
