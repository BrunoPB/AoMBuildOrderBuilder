/**
 * Downloads the icon sources listed in data-research/<pantheon>/icons.json and data-research/common-icons.json,
 * converts them to WebP (64 px and 128 px) under public/icons/<category>/, and writes public/icons/manifest.json.
 * Icons used by the data but without a source get a placeholder entry (the UI draws initials).
 *
 *   npm run fetch-icons            # download what is missing
 *   npm run fetch-icons -- --force # download everything again
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { z } from "zod";
import { usedIcons } from "../src/data/check.ts";
import { loadGameData } from "../src/data/load.ts";
import { readRawData } from "../src/data/raw-node.ts";
import type { IconManifest } from "../src/data/schema.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const RESEARCH = join(ROOT, "data-research");
const OUT = join(ROOT, "public", "icons");
const CACHE = join(ROOT, ".cache", "icons");
const force = process.argv.includes("--force");

const SourceList = z.array(
  z.object({ id: z.string(), url: z.string().url(), origin: z.string(), license: z.string() }),
);
type Source = z.infer<typeof SourceList>[number];

function readSources(): Map<string, Source> {
  const files = [join(RESEARCH, "common-icons.json")];
  for (const dir of readdirSync(RESEARCH, { withFileTypes: true })) {
    if (dir.isDirectory()) files.push(join(RESEARCH, dir.name, "icons.json"));
  }
  const map = new Map<string, Source>();
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const s of SourceList.parse(JSON.parse(readFileSync(file, "utf8")))) {
      if (!map.has(s.id)) map.set(s.id, s);
    }
  }
  return map;
}

async function download(url: string): Promise<Buffer> {
  const name = createHash("sha1").update(url).digest("hex");
  const cached = join(CACHE, name);
  if (!force && existsSync(cached)) return readFileSync(cached);
  const res = await fetch(url, {
    headers: { "User-Agent": "aomr-build-order-builder icon fetcher" },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) throw new Error(`not an image (${type}) ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(cached, buf);
  return buf;
}

const KRIES = "https://raw.githubusercontent.com/Kries-Dev/BuildOrders/main/Icons/";
const MIGUEL = "https://raw.githubusercontent.com/MiguelMG24/aom-retold-build-order/main/";
const LICENSE = "Game asset © Microsoft; fan use under the Game Content Usage Rules";
const SINGULAR: Record<string, string> = {
  greeks: "greek",
  egyptians: "egyptian",
  norse: "norse",
  atlanteans: "atlantean",
};

function listFile(name: string): string[] {
  const file = join(RESEARCH, name);
  return existsSync(file) ? readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean) : [];
}
const kries = listFile("kries-icons.txt");
const miguel = listFile("miguel-icons.txt").filter((f) => f.endsWith(".png"));

/** Guesses icon files in the two public icon repos when the listed source fails (e.g. wiki CDN blocks scripts). */
function fallbacks(id: string): Source[] {
  const [category, rest = ""] = id.split("/");
  const pantheon = Object.keys(SINGULAR).find((p) => rest.startsWith(`${p}-`));
  const name = (pantheon ? rest.slice(pantheon.length + 1) : rest).replace(/-/g, "_");
  const sing = pantheon ? SINGULAR[pantheon]! : "";
  const names =
    category === "gods" && name.endsWith("_portrait")
      ? [name]
      : [`${name}_icon`, `${name}_${sing}_icon`, `${sing}_${name}_icon`, name];
  const out: Source[] = [];
  for (const n of names) {
    const k = kries.find((f) => f.toLowerCase() === `${n}.png`.toLowerCase());
    if (k)
      out.push({
        id,
        url: KRIES + k,
        origin: "github.com/Kries-Dev/BuildOrders",
        license: LICENSE,
      });
    const m = miguel
      .filter((f) => f.split("/").pop()!.toLowerCase() === `${n}.png`.toLowerCase())
      .sort((a, b) => Number(b.includes(`/${sing}/`)) - Number(a.includes(`/${sing}/`)));
    for (const f of m.slice(0, 2))
      out.push({
        id,
        url: MIGUEL + f,
        origin: "github.com/MiguelMG24/aom-retold-build-order",
        license: LICENSE,
      });
  }
  return out;
}

const data = loadGameData(readRawData());
const needed = usedIcons(data);
const sources = readSources();
const entries: IconManifest["icons"] = [];
const failed: string[] = [];

for (const id of [...needed].sort()) {
  const listed = sources.get(id);
  const candidates = [...(listed ? [listed] : []), ...fallbacks(id)];
  const base = `${id}`;
  const file64 = `${base}-64.webp`;
  const file128 = `${base}-128.webp`;
  if (candidates.length === 0) {
    entries.push({ id, file: "", origin: "none", license: "n/a", placeholder: true });
    continue;
  }
  let source = candidates[0]!;
  try {
    const out64 = join(OUT, file64);
    const out128 = join(OUT, file128);
    if (force || !existsSync(out64) || !existsSync(out128)) {
      let input: Buffer | undefined;
      let lastError: unknown;
      for (const c of candidates) {
        try {
          input = await download(c.url);
          source = c;
          break;
        } catch (error) {
          lastError = error;
        }
      }
      if (!input) throw lastError;
      mkdirSync(dirname(out64), { recursive: true });
      const img = sharp(input).ensureAlpha();
      await img
        .clone()
        .resize(64, 64, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 88 })
        .toFile(out64);
      await img
        .clone()
        .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 88 })
        .toFile(out128);
    }
    entries.push({
      id,
      file: file64,
      file128,
      origin: source.origin || source.url,
      license: source.license,
    });
  } catch (error) {
    failed.push(`${id}: ${(error as Error).message}`);
    entries.push({ id, file: "", origin: source.url, license: source.license, placeholder: true });
  }
}

const manifest: IconManifest = { generatedAt: new Date().toISOString(), icons: entries };
writeFileSync(join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
const real = entries.filter((e) => !e.placeholder).length;
console.log(`icons: ${real} converted · ${entries.length - real} placeholders`);
if (failed.length) console.log(`failed (${failed.length}):\n  ${failed.join("\n  ")}`);
