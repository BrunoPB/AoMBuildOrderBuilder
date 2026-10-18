import { describe, expect, it } from "vitest";
import { applyCostModifiers, applyModifiers } from "../../src/engine/modifiers.ts";

describe("modifiers", () => {
  it("sums pct on the base and multiplies mul", () => {
    const mods = [
      { target: "gatherRate" as const, op: "pct" as const, value: 0.1 },
      { target: "gatherRate" as const, op: "pct" as const, value: 0.1 },
      { target: "gatherRate" as const, op: "mul" as const, value: 2 },
    ];
    expect(applyModifiers(10, "gatherRate", mods, {})).toBeCloseTo(24);
  });

  it("respects scope, condition and except", () => {
    const mods = [
      {
        target: "buildRate" as const,
        op: "mul" as const,
        value: 1.25,
        condition: "nearManor" as const,
        except: ["wonder"],
      },
      { target: "trainTime" as const, op: "add" as const, value: -2, scope: { tags: ["myth"] } },
    ];
    expect(applyModifiers(1, "buildRate", mods, { nearManor: true })).toBe(1.25);
    expect(applyModifiers(1, "buildRate", mods, { nearManor: false })).toBe(1);
    expect(applyModifiers(1, "buildRate", mods, { id: "wonder", nearManor: true })).toBe(1);
    expect(applyModifiers(10, "trainTime", mods, { tags: ["myth"] })).toBe(8);
    expect(applyModifiers(10, "trainTime", mods, { tags: ["human"] })).toBe(10);
  });

  it("applies cost modifiers per resource", () => {
    const mods = [
      {
        target: "cost" as const,
        op: "mul" as const,
        value: 0.5,
        scope: { resources: ["gold" as const] },
      },
    ];
    expect(applyCostModifiers({ food: 100, gold: 100 }, mods, {})).toEqual({ food: 100, gold: 50 });
  });
});
