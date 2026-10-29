import { describe, expect, it } from "vitest";
import { loadGameData } from "../../src/data/load.ts";
import { readRawData } from "../../src/data/raw-node.ts";
import type { Build } from "../../src/engine/build.ts";
import { simulate } from "../../src/engine/simulate.ts";

const data = loadGameData(readRawData());

function build(pantheon: Build["pantheon"], god: string, actions: Build["actions"]): Build {
  return {
    format: "aomr-bob",
    version: 1,
    id: "t",
    name: "t",
    createdAt: "2026-10-29T00:00:00Z",
    updatedAt: "2026-10-29T00:00:00Z",
    pantheon,
    god,
    type: "other",
    settings: { tail: 5 },
    actions,
  };
}

describe("god-specific actions (game files)", () => {
  it("only Kronos has Time Shift", () => {
    const shifters = [...data.gods.values()].filter((g) => g.timeShift).map((g) => g.id);
    expect(shifters).toEqual(["kronos"]);
    const r = simulate(
      data,
      build("atlanteans", "gaia", [{ when: "0:00", do: "timeShift", building: "temple" }]),
    );
    expect(r.warnings.some((w) => w.level === "error" && w.key === "warn.powerUnavailable")).toBe(
      true,
    );
  });

  it("Kronos cannot Time Shift a Town Center", () => {
    const r = simulate(
      data,
      build("atlanteans", "kronos", [{ when: "0:00", do: "timeShift", building: "town-center" }]),
    );
    expect(r.warnings.some((w) => w.key === "warn.cannotTimeShift")).toBe(true);
  });

  it("Norse promote a Gatherer to Berserk instantly, Loki at half price", () => {
    const actions: Build["actions"] = [
      { when: "0:00", do: "move", count: 3, from: "idle", to: "food" },
      { when: "0:05", do: "promote", unit: "gatherer" },
      { when: "0:10", do: "event", note: "end" },
    ];
    const odin = simulate(data, build("norse", "odin", actions));
    const loki = simulate(data, build("norse", "loki", actions));
    const at5 = (r: ReturnType<typeof simulate>) => r.series.find((s) => s.t === 5)!;
    expect(at5(odin).alloc.food).toBe(2);
    const foodSpent = (r: ReturnType<typeof simulate>) => {
      const before = r.series.find((s) => s.t === 4)!.resources;
      const after = at5(r).resources;
      return { food: before.food - after.food, gold: before.gold - after.gold };
    };
    expect(foodSpent(odin).gold).toBeCloseTo(20, 0);
    expect(foodSpent(loki).gold).toBeCloseTo(10, 0);
    expect(odin.warnings.filter((w) => w.level === "error")).toEqual([]);
  });

  it("Greeks and Egyptians have no promotions", () => {
    for (const p of ["greeks", "egyptians"] as const) {
      expect([...data.pantheons.get(p)!.units.values()].some((u) => u.promotion)).toBe(false);
    }
  });
});
