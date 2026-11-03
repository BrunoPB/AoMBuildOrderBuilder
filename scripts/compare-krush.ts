/** Prints the simulation of the Krush build played in a real match next to the times measured
 *  there (reference only). */
import { readFileSync } from "node:fs";
import { loadGameData } from "../src/data/load.ts";
import { readRawData } from "../src/data/raw-node.ts";
import { compareWithReference, type ReferenceMatch } from "../src/engine/reference.ts";
import { BuildSchema } from "../src/engine/build.ts";

const ref = JSON.parse(
  readFileSync(new URL("../tests/fixtures/krush.json", import.meta.url), "utf8"),
) as ReferenceMatch;
const build = BuildSchema.parse(
  JSON.parse(readFileSync(new URL(`../tests/fixtures/${ref.build}`, import.meta.url), "utf8")),
);
const { rows } = compareWithReference(loadGameData(readRawData()), build, ref);

console.log("| Milestone | Measured | Simulated | Diff (s) |\n|---|---|---|---|");
for (const r of rows) {
  const diff = r.diff === undefined ? "—" : r.diff > 0 ? `+${r.diff}` : String(r.diff);
  console.log(`| ${r.label} | ${r.measured} | ${r.simulated} | ${diff} |`);
}
