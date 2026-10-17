import { z } from "zod";
import { BUILD_FORMAT, BUILD_VERSION, type Build, BuildSchema } from "../engine/build.ts";

export type MigrateResult =
  { ok: true; build: Build } | { ok: false; error: string; newer?: number };

/** One step per old version: migrations[n] turns a version-n build into version n+1. */
const migrations: Record<number, (b: Record<string, unknown>) => Record<string, unknown>> = {};

export function migrateBuild(raw: unknown): MigrateResult {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "not an object" };
  let value = { ...(raw as Record<string, unknown>) };
  if (value.format !== BUILD_FORMAT)
    return { ok: false, error: `format must be "${BUILD_FORMAT}"` };
  let version = typeof value.version === "number" ? value.version : NaN;
  if (!Number.isInteger(version) || version < 1) return { ok: false, error: "invalid version" };
  if (version > BUILD_VERSION) return { ok: false, error: "newer version", newer: version };
  while (version < BUILD_VERSION) {
    const step = migrations[version];
    if (!step) return { ok: false, error: `no migration from version ${version}` };
    value = { ...step(value), version: version + 1 };
    version++;
  }
  const parsed = BuildSchema.safeParse(value);
  if (!parsed.success) return { ok: false, error: z.prettifyError(parsed.error) };
  return { ok: true, build: parsed.data };
}
