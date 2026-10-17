/** Merges data-research/<pantheon>/powers.json into src/data/powers.json (research tooling). */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PowersFileSchema, type Power } from "../src/data/schema.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const RESEARCH = join(ROOT, "data-research");
const all: Power[] = [];
for (const dir of readdirSync(RESEARCH, { withFileTypes: true })) {
  const file = join(RESEARCH, dir.name, "powers.json");
  if (!dir.isDirectory() || !existsSync(file)) continue;
  all.push(...PowersFileSchema.parse(JSON.parse(readFileSync(file, "utf8"))));
}
const ids = new Set<string>();
for (const p of all) {
  if (ids.has(p.id)) throw new Error(`duplicate power id "${p.id}"`);
  ids.add(p.id);
}
all.sort((a, b) => a.pantheon.localeCompare(b.pantheon) || a.id.localeCompare(b.id));
writeFileSync(join(ROOT, "src", "data", "powers.json"), `${JSON.stringify(all, null, 2)}\n`);
console.log(`powers.json: ${all.length} powers`);
