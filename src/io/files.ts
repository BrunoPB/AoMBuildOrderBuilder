import type { GameData } from "../data/load.ts";
import { BUILD_FORMAT, BUILD_VERSION, type Build } from "../engine/build.ts";
import { validateRefs } from "../engine/validate.ts";
import { migrateBuild } from "../storage/migrate.ts";

export function slug(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "build"
  );
}

export function buildFileName(build: Build): string {
  return `${slug(build.god)}-${slug(build.name)}.aomr-bob.json`;
}

export function allBuildsFileName(date = new Date()): string {
  return `aomr-bob-builds-${date.toISOString().slice(0, 10)}.json`;
}

export function exportPayload(builds: Build[]): string {
  return `${JSON.stringify({ format: BUILD_FORMAT, version: BUILD_VERSION, builds }, null, 2)}\n`;
}

export type ImportResult =
  { ok: true; builds: Build[] } | { ok: false; error: string; newer?: number };

/** Parses an exported file (or a single build). Never evaluates anything from the file. */
export function parseImport(content: string, data: GameData): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    return { ok: false, error: "JSON" };
  }
  if (typeof json !== "object" || json === null) return { ok: false, error: "JSON" };
  const obj = json as Record<string, unknown>;
  if (obj.format !== BUILD_FORMAT) return { ok: false, error: `format ≠ ${BUILD_FORMAT}` };
  if (typeof obj.version === "number" && obj.version > BUILD_VERSION) {
    return { ok: false, error: "newer", newer: obj.version };
  }
  const items = Array.isArray(obj.builds) ? obj.builds : "builds" in obj ? null : [obj];
  if (!items) return { ok: false, error: "builds" };
  const builds: Build[] = [];
  for (const [i, item] of items.entries()) {
    const migrated = migrateBuild(item);
    if (!migrated.ok) {
      return migrated.newer
        ? { ok: false, error: "newer", newer: migrated.newer }
        : { ok: false, error: `#${i + 1}: ${migrated.error}` };
    }
    const issues = validateRefs(migrated.build, data);
    if (issues.length) return { ok: false, error: `#${i + 1}: ${issues.slice(0, 3).join("; ")}` };
    builds.push(migrated.build);
  }
  return { ok: true, builds };
}

export function newBuildId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `u-${Date.now().toString(36)}${rand}`;
}

export function downloadText(fileName: string, content: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
