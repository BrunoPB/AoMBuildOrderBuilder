import { describe, expect, it } from "vitest";
import { loadGameData } from "../../src/data/load.ts";
import { readRawData } from "../../src/data/raw-node.ts";
import { findShareCode, makePreset, proposalUrl } from "../../src/io/proposal.ts";
import { encodeBuild } from "../../src/io/share.ts";
import { readPresets } from "../../src/presets/node.ts";

const data = loadGameData(readRawData());
const krush = readPresets().find((b) => b.id === "preset:krush")!;
const issue = (link: string) =>
  `### Link da build / Build link\n\n${link}\n\n### Comentários / Notes\n\n_No response_\n`;

describe("standard build proposals", () => {
  it("finds the build in an issue body, as a link or a bare code", async () => {
    const code = await encodeBuild(krush);
    expect(findShareCode(issue(`https://x.github.io/app/#/import/${code}`))).toBe(code);
    expect(findShareCode(issue(code))).toBe(code);
    expect(findShareCode(issue("no build here"))).toBeUndefined();
  });

  it("accepts a build that simulates without errors, with a free preset id", async () => {
    const code = await encodeBuild({ ...krush, id: "u-1", author: undefined });
    const r = await makePreset(issue(`#/import/${code}`), data, {
      author: "someone",
      taken: new Set(["krush"]),
      now: new Date("2026-11-02T00:00:00Z"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.file).toBe("krush-2.json");
    expect(r.preset).toMatchObject({ id: "preset:krush-2", author: "someone", name: "Krush" });
    expect(r.report).toContain("simulates without errors");
  });

  it("refuses a missing link and a build with errors", async () => {
    const opts = { author: "x", taken: new Set<string>() };
    expect((await makePreset("nothing", data, opts)).ok).toBe(false);
    const broken = await encodeBuild({
      ...krush,
      actions: [{ when: "0:00", do: "research", research: "sons-of-the-sun" }],
      milestones: [],
    });
    const r = await makePreset(issue(broken), data, opts);
    expect(r.ok).toBe(false);
    expect(r.report).toContain("without errors");
  });

  it("opens the GitHub form already filled in", () => {
    const url = new URL(proposalUrl(krush, "https://x/#/import/abc"));
    expect(url.pathname).toMatch(/\/issues\/new$/);
    expect(url.searchParams.get("template")).toBe("propose-build.yml");
    expect(url.searchParams.get("link")).toBe("https://x/#/import/abc");
  });
});
