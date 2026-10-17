/**
 * Generates the static API (dist/api/v1/...) from src/presets and src/data. Runs inside `npm run build`.
 * SITE_URL (e.g. https://user.github.io/repo/) makes URLs absolute; otherwise BASE_PATH or "/" is used.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateApi } from "../src/api/generate.ts";
import { loadGameData } from "../src/data/load.ts";
import { readRawData } from "../src/data/raw-node.ts";
import { readPresets } from "../src/presets/node.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "dist");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { version: string };

const basePath =
  process.env.BASE_PATH && process.env.BASE_PATH !== "./" ? process.env.BASE_PATH : "/";
const raw = readRawData();
const files = generateApi(loadGameData(raw), raw, readPresets(), {
  appVersion: pkg.version,
  generatedAt: new Date().toISOString(),
  base: process.env.SITE_URL ?? basePath,
});

for (const [path, content] of files) {
  const target = join(OUT, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(content, null, 2)}\n`);
}
console.log(`api: ${files.size} files written to dist/api/v1`);
