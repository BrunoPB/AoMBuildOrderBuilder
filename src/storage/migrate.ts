import { z } from "zod";
import { BUILD_FORMAT, BUILD_VERSION, type Build, BuildSchema } from "../engine/build.ts";

export type MigrateResult =
  { ok: true; build: Build } | { ok: false; error: string; newer?: number };

/** One step per old version: migrations[n] turns a version-n build into version n+1. */
const migrations: Record<number, (b: Record<string, unknown>) => Record<string, unknown>> = {
  /** autoTrain / trainWhenAffordable (and their stops) became modes of train / stopTrain. */
  1: (b) => ({
    ...b,
    actions: Array.isArray(b.actions) ? b.actions.map(trainModesV2) : b.actions,
  }),
};

function trainModesV2(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const a = raw as Record<string, unknown>;
  switch (a.do) {
    case "autoTrain":
      return { ...a, do: "train", mode: "auto" };
    case "trainWhenAffordable": {
      const { from, ...rest } = a;
      return { ...rest, do: "train", mode: "affordable", ...(from !== undefined && { at: from }) };
    }
    case "stopAutoTrain":
      return { ...a, do: "stopTrain", mode: "auto" };
    case "stopTrainWhenAffordable":
      return { ...a, do: "stopTrain", mode: "affordable" };
    default:
      return raw;
  }
}

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
