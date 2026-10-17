import { checkReferences, listLowConfidence, usedIcons } from "../src/data/check.ts";
import { DataError, loadGameData } from "../src/data/load.ts";
import { readRawData } from "../src/data/raw-node.ts";

let data;
try {
  data = loadGameData(readRawData());
} catch (error) {
  if (error instanceof DataError) {
    console.error(`✗ schema errors (${error.issues.length})\n${error.issues.join("\n\n")}`);
    process.exit(1);
  }
  throw error;
}

const refs = checkReferences(data);
const icons = usedIcons(data);
const missingIcons = [...icons].filter((id) => !data.icons.has(id)).sort();
const placeholders = [...icons].filter((id) => data.icons.get(id)?.placeholder).sort();
const low = listLowConfidence(data);

console.log(
  `pantheons ${data.pantheons.size} · gods ${data.gods.size} · minors ${data.minors.size} · powers ${data.powers.size}`,
);
for (const [id, p] of data.pantheons) {
  console.log(
    `  ${id}: ${p.units.size} units · ${p.buildings.size} buildings · ${p.researches.size} researches`,
  );
}

if (refs.length) console.log(`\n✗ broken references (${refs.length})\n  ${refs.join("\n  ")}`);
else console.log("\n✓ references");

if (missingIcons.length)
  console.log(
    `\n✗ icons missing from manifest (${missingIcons.length})\n  ${missingIcons.join("\n  ")}`,
  );
else console.log("✓ every icon id is in the manifest");
if (placeholders.length)
  console.log(`\n⚠ placeholder icons (${placeholders.length})\n  ${placeholders.join("\n  ")}`);

console.log(`\n⚠ low-confidence values (${low.length})`);
for (const l of low)
  console.log(
    `  ${l.where}${l.field ? `.${l.field}` : ""}${l.meta.note ? ` — ${l.meta.note}` : ""}`,
  );

process.exit(refs.length || missingIcons.length ? 1 : 0);
