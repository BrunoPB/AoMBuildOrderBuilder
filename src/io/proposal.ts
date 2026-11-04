import type { GameData } from "../data/load.ts";
import { BUILD_VERSION, type Build } from "../engine/build.ts";
import { simulate } from "../engine/simulate.ts";
import { formatClock } from "../engine/time.ts";
import { slug } from "./files.ts";
import { decodeBuild } from "./share.ts";

/** GitHub repository that receives proposals for standard builds. */
export const REPO = "BrunoPB/AoMBuildOrderBuilder";
export const REPO_URL = `https://github.com/${REPO}`;
export const PROPOSAL_TEMPLATE = "propose-build.yml";

/** A share link (or a bare share code) inside free text, such as an issue body. */
export function findShareCode(text: string): string | undefined {
  const link = /#\/import\/([A-Za-z0-9_-]+)/.exec(text);
  if (link) return link[1];
  return /(?:^|\s)([A-Za-z0-9_-]{100,})(?=\s|$)/.exec(text)?.[1];
}

/** URL of a new GitHub issue with the proposal form already filled in. */
export function proposalUrl(build: Build, link: string): string {
  const q = new URLSearchParams({
    template: PROPOSAL_TEMPLATE,
    title: `[Build] ${build.name}`,
    link,
  });
  return `${REPO_URL}/issues/new?${q.toString()}`;
}

export type Proposal =
  { ok: true; preset: Build; file: string; report: string } | { ok: false; report: string };

/** Turns a proposed build into a standard build: checked like an import, simulated, and given a
 *  preset id that does not clash with the existing ones. Never evaluates anything it reads. */
export async function makePreset(
  text: string,
  data: GameData,
  opts: { author: string; taken: Set<string>; now?: Date },
): Promise<Proposal> {
  const fail = (why: string) => ({
    ok: false as const,
    report: `### ❌ Not accepted\n\n${why}`,
  });
  const code = findShareCode(text);
  if (!code) return fail("No build link found. Use “Propose as standard build” in the app.");
  const decoded = await decodeBuild(code, data);
  if (!decoded.ok) return fail(`The link is not a valid build (${decoded.error}).`);
  const build = decoded.build;
  const result = simulate(data, build);
  const errors = result.warnings.filter((w) => w.level === "error");
  if (errors.length > 0) {
    const list = errors.map((w) => `- \`${w.key}\` ${JSON.stringify(w.params)}`).join("\n");
    return fail(`Standard builds must simulate without errors:\n\n${list}`);
  }

  const base = slug(build.name);
  let name = base;
  for (let k = 2; opts.taken.has(name); k++) name = `${base}-${k}`;
  const now = (opts.now ?? new Date()).toISOString();
  const preset: Build = {
    ...build,
    version: BUILD_VERSION,
    id: `preset:${name}`,
    author: build.author || opts.author,
    updatedAt: now,
  };

  const ages = (["classical", "heroic", "mythic"] as const)
    .filter((a) => result.ageTimes[a])
    .map((a) => {
      const t = result.ageTimes[a]!;
      const reached = t.reached !== undefined ? ` → ${formatClock(t.reached)}` : "";
      return `| ${a} | ${formatClock(t.clicked)}${reached} |`;
    });
  const count = (level: string) => result.warnings.filter((w) => w.level === level).length;
  const report = [
    `### ✅ “${build.name}” simulates without errors`,
    "",
    `${build.pantheon} · ${build.god} · ${build.type} · ${build.actions.length} actions · by ${preset.author}`,
    "",
    ...(ages.length ? ["| Age | Click → reached |", "| --- | --- |", ...ages, ""] : []),
    `Warnings: ${count("delay")} delay.`,
    "",
    `A pull request adds it as \`src/presets/${name}.json\`; merging it publishes the build.`,
  ].join("\n");
  return { ok: true, preset, file: `${name}.json`, report };
}
