import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Build } from "../engine/build.ts";
import { migrateBuild } from "../storage/migrate.ts";

const DIR = fileURLToPath(new URL(".", import.meta.url));

/** Presets read from disk (scripts and tests); throws on an invalid preset. */
export function readPresets(): Build[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const result = migrateBuild(JSON.parse(readFileSync(join(DIR, f), "utf8")));
      if (!result.ok) throw new Error(`preset ${f}: ${result.error}`);
      return result.build;
    });
}
