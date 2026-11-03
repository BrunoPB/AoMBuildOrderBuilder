import { describe, expect, it } from "vitest";
import { loadGameData } from "../../src/data/load.ts";
import { readRawData } from "../../src/data/raw-node.ts";
import type { Action } from "../../src/engine/build.ts";
import type { SimResult } from "../../src/engine/types.ts";
import { addIndex } from "../../src/ui/editor/labels.ts";
import { viewEnd } from "../../src/ui/editor/timeline.tsx";
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
  const result = (times: number[], open = false) =>
    ({
      actions: times.map((t) => ({ startedAt: t, completedAt: t })),
      production: { spans: open ? [{ start: 100 }] : [], lanes: [] },
      endTime: 900,
    }) as unknown as SimResult;
  it("follows what the build does, not a simulation run to its safety limit", () => {
    expect(viewEnd(result([0, 600]))).toBe(630);
  });
  it("shows at least 8 minutes", () => {
    expect(viewEnd(result([0, 20], true))).toBe(480);
    expect(viewEnd(undefined, [30])).toBe(480);
  });
});
