import type { GameData } from "../data/load.ts";
import type { Build } from "../engine/build.ts";
import { parseImport } from "./files.ts";

/** Id under which a build opened from a share link is shown until it is saved. */
export const SHARED_ID = "shared";

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code: string): Uint8Array {
  const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** The whole build, gzipped, in a URL-safe string: a link carries the build itself. */
export async function encodeBuild(build: Build): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(build));
  return toBase64Url(await pipe(json, new CompressionStream("gzip")));
}

/** Reads a share code like an imported file: migrated and checked, never evaluated. */
export async function decodeBuild(
  code: string,
  data: GameData,
): Promise<{ ok: true; build: Build } | { ok: false; error: string; newer?: number }> {
  let text: string;
  try {
    text = new TextDecoder().decode(
      await pipe(fromBase64Url(code), new DecompressionStream("gzip")),
    );
  } catch {
    return { ok: false, error: "link" };
  }
  const result = parseImport(text, data);
  if (!result.ok) return result;
  if (result.builds.length !== 1) return { ok: false, error: "link" };
  return { ok: true, build: result.builds[0]! };
}

export function shareUrl(code: string): string {
  return `${location.origin}${location.pathname}#/import/${code}`;
}
