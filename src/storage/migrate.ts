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
  /** The build-wide reserve window became a setting of each "when affordable" train action. */
  2: (b) => {
    const { affordableWindow, ...settings } = (b.settings ?? {}) as Record<string, unknown>;
    if (affordableWindow === undefined) return b;
    const actions = Array.isArray(b.actions)
      ? b.actions.map((a: Record<string, unknown>) =>
          a.do === "train" && a.mode === "affordable" && a.window === undefined
            ? { ...a, window: affordableWindow }
            : a,
        )
      : b.actions;
    return { ...b, settings, actions };
  },
  /** "When affordable" is gone (it becomes an auto queue) and so is the stop action: an auto queue
   *  ends at its own `until`, taken from the stop at a fixed time that ended it. */
  3: (b) => untilV4(b),
};

function untilV4(b: Record<string, unknown>): Record<string, unknown> {
  if (!Array.isArray(b.actions)) return b;
  const actions = (b.actions as Record<string, unknown>[]).map((a) => ({ ...a }));
  actions.forEach((stop, i) => {
    if (stop.do !== "stopTrain") return;
    if (typeof stop.when !== "string" || !/^\d+:\d\d$/.test(stop.when)) return;
    for (const a of actions.slice(0, i)) {
      if (a.do !== "train" || !a.mode || a.until !== undefined) continue;
      if (stop.mode && a.mode !== stop.mode) continue;
      if (!stop.unit || a.unit === stop.unit) a.until = stop.when;
    }
  });
  const stops = new Set(actions.filter((a) => a.do === "stopTrain").map((a) => a.id));
  stops.delete(undefined);
  const kept = actions
    .filter((a) => a.do !== "stopTrain")
    .map((a) => {
      if (a.do !== "train" || !a.mode) return a;
      const { window: _window, ...rest } = a;
      return { ...rest, mode: "auto" };
    })
    .map((a) =>
      stops.has((a.when as { after?: unknown } | undefined)?.after) ? { ...a, when: "asap" } : a,
    );
  const milestones = Array.isArray(b.milestones)
    ? (b.milestones as { atAction?: unknown }[]).filter((m) => !stops.has(m.atAction))
    : b.milestones;
  return { ...b, actions: kept, milestones };
}

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
