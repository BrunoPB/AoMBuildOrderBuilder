import { describe, expect, it } from "vitest";
import { loadGameData } from "../../src/data/load.ts";
import { readRawData } from "../../src/data/raw-node.ts";
import { decodeBuild, encodeBuild } from "../../src/io/share.ts";
import { readPresets } from "../../src/presets/node.ts";

const data = loadGameData(readRawData());
const krush = readPresets().find((b) => b.id === "preset:krush")!;

describe("share links", () => {
  it("a build survives the round trip through a link", async () => {
    const code = await encodeBuild(krush);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    const back = await decodeBuild(code, data);
    expect(back).toEqual({ ok: true, build: krush });
  });

  it("stays short enough for a URL", async () => {
    const code = await encodeBuild(krush);
    console.log(`krush link: ${code.length} characters`);
    expect(code.length).toBeLessThan(4000);
  });

  it("rejects a broken or foreign code", async () => {
    expect((await decodeBuild("not-a-build", data)).ok).toBe(false);
    const other = await encodeBuild({ ...krush, format: "x" } as never);
    expect((await decodeBuild(other, data)).ok).toBe(false);
    const unknown = await encodeBuild({ ...krush, god: "nobody" });
    expect((await decodeBuild(unknown, data)).ok).toBe(false);
  });
});
