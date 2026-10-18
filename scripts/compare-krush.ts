/** Prints the Krush preset simulation next to the times measured in a real match (reference only). */
import { readFileSync } from "node:fs";
import { loadGameData } from "../src/data/load.ts";
import { readRawData } from "../src/data/raw-node.ts";
import { compareWithReference, type ReferenceMatch } from "../src/engine/reference.ts";
import { readPresets } from "../src/presets/node.ts";

const ref = JSON.parse(
  readFileSync(new URL("../tests/fixtures/krush.json", import.meta.url), "utf8"),
) as ReferenceMatch;
const build = readPresets().find((b) => b.id === ref.preset)!;
const { rows } = compareWithReference(loadGameData(readRawData()), build, ref);

console.log("| Milestone | Measured | Simulated | Diff (s) |\n|---|---|---|---|");
for (const r of rows) {
  const diff = r.diff === undefined ? "—" : r.diff > 0 ? `+${r.diff}` : String(r.diff);
  console.log(`| ${r.label} | ${r.measured} | ${r.simulated} | ${diff} |`);
}
