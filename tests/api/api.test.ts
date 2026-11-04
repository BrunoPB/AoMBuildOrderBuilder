import { describe, expect, it } from "vitest";
import { generateApi } from "../../src/api/generate.ts";
import { loadGameData } from "../../src/data/load.ts";
import { readRawData } from "../../src/data/raw-node.ts";
import { BuildSchema } from "../../src/engine/build.ts";
import { readPresets } from "../../src/presets/node.ts";

const raw = readRawData();
const data = loadGameData(raw);
const presets = readPresets();
const files = generateApi(data, raw, presets, {
  appVersion: "0.0.0",
  generatedAt: "2026-10-17T00:00:00Z",
  base: "https://example.github.io/repo/",
});

describe("static API", () => {
  it("generates every route of section 13", () => {
    for (const path of [
      "api/v1/index.json",
      "api/v1/presets/index.json",
      "api/v1/data/index.json",
      "api/v1/icons/manifest.json",
    ]) {
      expect(files.has(path), path).toBe(true);
    }
    for (const suffix of [".json", ".dashboard.json", ".timeline.json"]) {
      expect(files.has(`api/v1/presets/krush${suffix}`), suffix).toBe(true);
    }
    expect(files.has("api/v1/data/pantheons/atlanteans.json")).toBe(true);
  });

  it("stamps every file with version and generatedAt", () => {
    for (const [path, content] of files) {
      const c = content as Record<string, unknown>;
      expect(c.generatedAt, path).toBe("2026-10-17T00:00:00Z");
      expect(c.version ?? c.apiVersion, path).toBeDefined();
    }
  });

  it("serves presets that pass the build schema and absolute URLs", () => {
    const index = files.get("api/v1/presets/index.json") as { presets: { url: string }[] };
    expect(index.presets.map((p) => p.url)).toContain(
      "https://example.github.io/repo/api/v1/presets/krush.json",
    );
    expect(BuildSchema.safeParse(files.get("api/v1/presets/krush.json")).success).toBe(true);
    expect(index.presets).toHaveLength(presets.length);
  });

  it("contains timelines in both languages", () => {
    const tl = files.get("api/v1/presets/krush.timeline.json") as {
      locales: Record<string, { steps: unknown[] }>;
    };
    expect(tl.locales["pt-BR"]!.steps.length).toBeGreaterThan(5);
    expect(tl.locales.en!.steps.length).toBe(tl.locales["pt-BR"]!.steps.length);
  });
});
