/**
 * Turns a "build proposal" issue into a standard build file (run by .github/workflows/build-proposal.yml).
 * Input in env: ISSUE_BODY, ISSUE_AUTHOR. Writes src/presets/<name>.json when the build is accepted,
 * proposal-report.md for the issue comment, and ok/file/name to GITHUB_OUTPUT.
 */
import { appendFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadGameData } from "../src/data/load.ts";
import { readRawData } from "../src/data/raw-node.ts";
import { makePreset } from "../src/io/proposal.ts";

const presetsDir = join(import.meta.dirname, "..", "src", "presets");
const taken = new Set(
  readdirSync(presetsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, "")),
);

const result = await makePreset(process.env.ISSUE_BODY ?? "", loadGameData(readRawData()), {
  author: process.env.ISSUE_AUTHOR ?? "",
  taken,
});

writeFileSync("proposal-report.md", `${result.report}\n`);
const out: Record<string, string> = { ok: String(result.ok) };
if (result.ok) {
  const file = join("src", "presets", result.file);
  writeFileSync(file, `${JSON.stringify(result.preset, null, 2)}\n`);
  out.file = file;
  out.name = result.preset.name;
}
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    Object.entries(out)
      .map(([k, v]) => `${k}=${v.replace(/[\r\n]/g, " ")}\n`)
      .join(""),
  );
}
console.log(result.report);
