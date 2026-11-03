import { describe, expect, it } from "vitest";
import { loadGameData } from "../../src/data/load.ts";
import { readRawData } from "../../src/data/raw-node.ts";
import type { Action } from "../../src/engine/build.ts";
import type { SimResult } from "../../src/engine/types.ts";
import { addIndex } from "../../src/ui/editor/labels.ts";
import { buildStop, viewEnd } from "../../src/ui/editor/timeline.tsx";
import { simulate } from "../../src/engine/simulate.ts";
import { PRESETS } from "../../src/presets/index.ts";
import { newBuild, onlyStartActions } from "../../src/ui/sim.ts";

const data = loadGameData(readRawData());

describe("a new build", () => {
  it("starts by sending the idle villagers to food", () => {
    const b = newBuild(data, "x");
    expect(b.actions).toHaveLength(1);
    expect(b.actions[0]).toMatchObject({ when: "0:00", do: "move", from: "idle", to: "food" });
    expect((b.actions[0] as { count: number }).count).toBeGreaterThan(0);
    expect(onlyStartActions(data, b)).toBe(true);
  });
});

describe("where a palette action goes", () => {
  const a = (id: string, age = false): Action =>
    age
      ? { id, when: "asap", do: "age", to: "classical", minor: "zeus" }
      : { id, when: "asap", do: "event", note: "" };
  it("before the age ups at the end of the list", () => {
    expect(addIndex([a("m"), a("c", true), a("h", true)])).toBe(1);
  });
  it("after an action that already follows an age up", () => {
    expect(addIndex([a("m"), a("c", true), a("x"), a("h", true)])).toBe(3);
    expect(addIndex([])).toBe(0);
  });
});

describe("timeline length", () => {
  const event: Action = { when: "asap", do: "event", note: "" };
  const build = (n: number) => ({ ...newBuild(data, "x"), actions: Array<Action>(n).fill(event) });
  const result = (times: number[], settled: boolean, open = false) =>
    ({
      actions: times.map((t) => ({ startedAt: t, completedAt: t, status: "done" })),
      production: { spans: open ? [{ start: 100 }] : [], lanes: [] },
      buildEnd: settled ? 367 : 900,
      endTime: settled ? 397 : 900,
    }) as unknown as SimResult;
  it("ends with the build: its last action or job done", () => {
    expect(viewEnd(build(2), result([0, 349], true))).toBe(377);
  });
  it("with an action that never happens, up to the last thing the build does", () => {
    const r = result([0, 600], false);
    r.actions.push({ index: 2, status: "pending", waited: 0 });
    expect(viewEnd(build(3), r)).toBe(610);
  });
  it("a build with almost nothing in it still shows a minute", () => {
    expect(viewEnd(build(0))).toBe(60);
  });
  it("a job still running when the simulation stops counts from its start", () => {
    const r = result([5], false, true);
    r.actions.push({ index: 1, status: "pending", waited: 0 });
    expect(viewEnd(build(2), r)).toBe(110);
  });
  it("the Krush preset ends where its build ends", () => {
    const krush = PRESETS.find((b) => b.id === "preset:krush")!;
    const r = simulate(data, krush);
    expect(viewEnd(krush, r)).toBe(Math.ceil(r.buildEnd) + 10);
    // auto queues without a duration and running jobs stop at the build's end, not the margin
    expect(buildStop(krush, r)).toBe(r.buildEnd);
  });
});
