import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadGameData } from "../../src/data/load.ts";
import { readRawData } from "../../src/data/raw-node.ts";
import { simulate } from "../../src/engine/simulate.ts";
import { readPresets } from "../../src/presets/node.ts";
import { migrateBuild } from "../../src/storage/migrate.ts";

const data = loadGameData(readRawData());
const dir = join(import.meta.dirname, "..", "fixtures", "examples");
const examples = readdirSync(dir).map((f) => {
  const r = migrateBuild(JSON.parse(readFileSync(join(dir, f), "utf8")));
  if (!r.ok) throw new Error(`${f}: ${r.error}`);
  return r.build;
});

describe("example build of each pantheon", () => {
  for (const build of examples) {
    it(`${build.pantheon}: simulates without errors and reaches Classical`, () => {
      const result = simulate(data, build);
      expect(result.warnings.filter((w) => w.level === "error")).toEqual([]);
      expect(result.ageTimes.classical?.reached).toBeGreaterThan(0);
      expect(
        Math.min(...result.series.flatMap((s) => Object.values(s.resources))),
      ).toBeGreaterThanOrEqual(0);
    });
  }

  it("Greek villagers in the Temple produce favor", () => {
    const r = simulate(
      data,
      examples.find((b) => b.pantheon === "greeks")!,
    );
    expect(r.series.at(-1)!.resources.favor).toBeGreaterThan(10);
    expect(r.series.some((s) => s.alloc.favor > 0)).toBe(true);
  });

  it("Egyptian monuments produce favor", () => {
    const r = simulate(
      data,
      examples.find((b) => b.pantheon === "egyptians")!,
    );
    expect(r.series.at(-1)!.resources.favor).toBeGreaterThan(0);
  });

  it("Thor starts with dwarves instead of gatherers", () => {
    const r = simulate(
      data,
      examples.find((b) => b.pantheon === "norse")!,
    );
    expect(r.series[0]!.alloc.gold).toBe(3);
  });
});

describe("presets", () => {
  for (const build of readPresets()) {
    it(`${build.id} simulates without error warnings`, () => {
      const r = simulate(data, build);
      expect(r.warnings.filter((w) => w.level === "error")).toEqual([]);
    });
  }
});
