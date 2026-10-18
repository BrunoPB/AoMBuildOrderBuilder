import { describe, expect, it } from "vitest";
import { loadGameData } from "../../src/data/load.ts";
import { readRawData } from "../../src/data/raw-node.ts";
import { compareWithReference, type ReferenceMatch } from "../../src/engine/reference.ts";
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
