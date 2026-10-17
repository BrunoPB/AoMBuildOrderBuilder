import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BuildSchema } from "../../src/engine/build.ts";

const DIST = join(process.cwd(), "dist", "api", "v1");
const enabled = process.env.CHECK_DIST === "1";

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)],
  );
}

/** Runs after `npm run build` in CI (CHECK_DIST=1). */
describe.skipIf(!enabled)("built static API in dist/", () => {
  it("exists and every file is valid JSON", () => {
    expect(existsSync(join(DIST, "index.json"))).toBe(true);
    for (const file of walk(DIST))
      expect(() => JSON.parse(readFileSync(file, "utf8")), file).not.toThrow();
  });

  it("serves valid presets", () => {
    const index = JSON.parse(readFileSync(join(DIST, "presets", "index.json"), "utf8")) as {
      presets: { url: string }[];
    };
    expect(index.presets.length).toBeGreaterThan(0);
    for (const file of readdirSync(join(DIST, "presets")).filter(
      (f) => /^[^.]+\.json$/.test(f) && f !== "index.json",
    )) {
      const preset: unknown = JSON.parse(readFileSync(join(DIST, "presets", file), "utf8"));
      expect(BuildSchema.safeParse(preset).success, file).toBe(true);
    }
  });
});
