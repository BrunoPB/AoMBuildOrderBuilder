import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RawData } from "./load.ts";

export const DATA_DIR = fileURLToPath(new URL(".", import.meta.url));
export const ICON_MANIFEST = fileURLToPath(
  new URL("../../public/icons/manifest.json", import.meta.url),
);

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

function readFolder(folder: string): Record<string, unknown> {
  const dir = join(DATA_DIR, folder);
  if (!existsSync(dir)) return {};
  const out: Record<string, unknown> = {};
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()) {
    out[basename(file, ".json")] = readJson(join(dir, file));
  }
  return out;
}

/** Reads the game database from disk (scripts and tests). The app uses raw-vite.ts. */
export function readRawData(): RawData {
  return {
    common: readJson(join(DATA_DIR, "common.json")),
    resources: readJson(join(DATA_DIR, "resources.json")),
    sources: readJson(join(DATA_DIR, "sources.json")),
    powers: readJson(join(DATA_DIR, "powers.json")),
    pantheons: readFolder("pantheons"),
    gods: readFolder("gods"),
    minors: readFolder("minors"),
    icons: existsSync(ICON_MANIFEST) ? readJson(ICON_MANIFEST) : undefined,
  };
}
