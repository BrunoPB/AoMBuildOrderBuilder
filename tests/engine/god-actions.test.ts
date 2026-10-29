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

describe("god actions researched for the 12 major gods", () => {
  const gain = (food = 0, wood = 0, gold = 0, favor = 0) => ({
    when: "0:00" as const,
    do: "event" as const,
    gainResource: { food, wood, gold, favor },
  });

  it("the Pharaoh empowering the Town Center speeds up the age up ×1.75", () => {
    const base: Build["actions"] = [
      gain(1000, 1000, 1000),
      { id: "t", when: "0:00", do: "build", building: "temple", builder: { from: "idle" } },
      { id: "c", when: { after: "t" }, do: "age", to: "classical", minor: "bast" },
    ];
    const plain = simulate(data, build("egyptians", "ra", base));
    const empowered = simulate(
      data,
      build("egyptians", "ra", [
        ...base,
        { when: "0:00", do: "empower", by: "pharaoh", building: "town-center" },
      ]),
    );
    const dur = (r: ReturnType<typeof simulate>) =>
      r.ageTimes.classical!.reached! - r.ageTimes.classical!.clicked;
    expect(dur(plain)).toBe(60);
    expect(dur(empowered)).toBeCloseTo(60 / 1.75, -1);
    expect(empowered.warnings.filter((w) => w.level === "error")).toEqual([]);
  });

  it("only Ra's Priests can empower", () => {
    const action: Build["actions"] = [
      { when: "0:00", do: "empower", by: "priest", building: "town-center" },
    ];
    expect(
      simulate(data, build("egyptians", "ra", action)).warnings.some((w) => w.level === "error"),
    ).toBe(false);
    expect(
      simulate(data, build("egyptians", "isis", action)).warnings.some(
        (w) => w.key === "warn.cannotEmpower",
      ),
    ).toBe(true);
  });

  it("Set summons a Gazelle with favor and hunting it adds its food to the hunt", () => {
    const r = simulate(
      data,
      build("egyptians", "set", [
        gain(0, 0, 0, 10),
        { when: "0:00", do: "summon", unit: "baboon-of-set", count: 1, hunt: true },
      ]),
    );
    expect(r.events.some((e) => e.kind === "hunted" && e.food === 93.75)).toBe(true);
    expect(r.warnings.filter((w) => w.level === "error")).toEqual([]);
    const other = simulate(
      data,
      build("egyptians", "ra", [{ when: "0:00", do: "summon", unit: "baboon-of-set" }]),
    );
    expect(other.warnings.some((w) => w.key === "warn.cannotSummon")).toBe(true);
  });

  it("Thor has no Armory and gets a free Dwarf per Dwarven Armory research", () => {
    const r = simulate(
      data,
      build("norse", "thor", [
        gain(1000, 1000, 1000),
        {
          id: "a",
          when: "0:00",
          do: "build",
          building: "dwarven-armory",
          builder: { unit: "berserk" },
        },
        { when: { after: "a" }, do: "research", research: "copper-weapons-thor" },
        { when: "0:00", do: "build", building: "armory", builder: { unit: "berserk" } },
      ]),
    );
    expect(r.produced.some((p) => p.unit === "dwarf")).toBe(true);
    expect(r.warnings.some((w) => w.key === "warn.notForGod")).toBe(true);
  });

  it("Greek heroes train in their own queue without blocking the Town Center", () => {
    const r = simulate(
      data,
      build("greeks", "zeus", [
        gain(2000, 2000, 2000),
        { id: "t", when: "0:00", do: "build", building: "temple", builder: { from: "idle" } },
        { when: { after: "t" }, do: "train", unit: "villager", count: 2 },
        { when: { after: "t" }, do: "train", unit: "jason" },
      ]),
    );
    const done = (u: string) => r.produced.filter((p) => p.unit === u).map((p) => p.t);
    const t = r.actions[1]!.completedAt!;
    expect(done("jason")[0]).toBeLessThan(t + 6);
    expect(done("villager")[0]).toBeLessThan(t + 20);
  });

  it("Loki's +10% build speed is on the builder", () => {
    const actions: Build["actions"] = [
      gain(1000, 1000, 1000),
      { id: "t", when: "0:00", do: "build", building: "temple", builder: { unit: "berserk" } },
    ];
    const odin = simulate(data, build("norse", "odin", actions)).actions[1]!.completedAt!;
    const loki = simulate(data, build("norse", "loki", actions)).actions[1]!.completedAt!;
    expect(loki).toBeLessThan(odin);
  });
});

describe("Berserk transform and population (owner)", () => {
  it("waits for a free population slot, since a Berserk takes 2 pop instead of 1", () => {
    const r = simulate(
      data,
      build("norse", "odin", [
        { when: "0:00", do: "event", gainResource: { food: 2000, gold: 2000 } },
        { when: "0:00", do: "train", unit: "gatherer", count: 10 },
        { when: "3:00", do: "promote", unit: "gatherer" },
      ]),
    );
    const at = r.series.find((s) => s.t === 180)!;
    expect(at.pop).toBe(at.popCap);
    expect(r.actions[2]!.startedAt).toBeUndefined();
    expect(
      r.warnings.some((w) => w.key === "warn.popCapped" || w.key === "warn.neverStarted"),
    ).toBe(true);
  });
});
