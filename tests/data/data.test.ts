import { describe, expect, it } from "vitest";
import { checkReferences, usedIcons } from "../../src/data/check.ts";
import { loadGameData } from "../../src/data/load.ts";
import { readRawData } from "../../src/data/raw-node.ts";
import { PANTHEON_IDS } from "../../src/data/schema.ts";

const data = loadGameData(readRawData());

describe("game database", () => {
  it("passes every zod schema", () => {
    expect(() => loadGameData(readRawData())).not.toThrow();
  });

  it("covers the four base pantheons and their twelve major gods", () => {
    for (const id of PANTHEON_IDS) {
      const p = data.pantheons.get(id);
      expect(p, id).toBeDefined();
      for (const g of p!.def.gods) expect(data.gods.get(g)?.pantheon, g).toBe(id);
    }
    expect(data.gods.size).toBeGreaterThanOrEqual(12);
  });

  it("has no broken references", () => {
    expect(checkReferences(data)).toEqual([]);
  });

  it("has an icon manifest entry for every icon id", () => {
    const missing = [...usedIcons(data)].filter((id) => !data.icons.has(id));
    expect(missing).toEqual([]);
  });

  it("has every name in pt-BR and en", () => {
    const names = [
      ...[...data.pantheons.values()].flatMap((p) => [
        ...p.units.values(),
        ...p.buildings.values(),
        ...p.researches.values(),
      ]),
      ...data.gods.values(),
      ...data.minors.values(),
      ...data.powers.values(),
      ...data.sources.values(),
    ].map((e) => e.name);
    for (const n of names) {
      expect(n["pt-BR"].trim()).not.toBe("");
      expect(n.en.trim()).not.toBe("");
    }
  });

  it("never calls myth units 'míticas'", () => {
    const units = [...data.pantheons.values()].flatMap((p) => [...p.units.values()]);
    for (const u of units) expect(u.name["pt-BR"].toLowerCase()).not.toContain("unidade mítica");
  });
});
