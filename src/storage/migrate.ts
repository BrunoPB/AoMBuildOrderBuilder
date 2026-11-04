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
  /** An auto queue runs for a duration instead of until a time: computed here when the action
   *  starts at a fixed time; otherwise the editor does it once it knows the start. */
  4: (b) => ({
    ...b,
    actions: Array.isArray(b.actions)
      ? (b.actions as Record<string, unknown>[]).map(durationV5)
      : b.actions,
  }),
  /** Population always counts when a unit leaves the building, as in the game: no setting. */
  5: (b) => {
    const { popReservedAt: _pop, ...settings } = (b.settings ?? {}) as Record<string, unknown>;
    return b.settings === undefined ? b : { ...b, settings };
  },
  /** "As soon as possible" waited on the previous action in the list; now it names the action it
   *  waits on: that same one, from its start. "Always" is gone: it starts at 0:00. */
  6: (b) => ({
    ...b,
    actions: Array.isArray(b.actions) ? asapV7(b.actions as Record<string, unknown>[]) : b.actions,
  }),
};

function asapV7(list: Record<string, unknown>[]): Record<string, unknown>[] {
  const used = new Set(list.map((a) => a.id).filter((id) => typeof id === "string" && id));
  let n = 1;
  const actions = list.map((a) => {
    if (typeof a.id === "string" && a.id) return a;
    while (used.has(`a${n}`)) n++;
    used.add(`a${n}`);
    return { ...a, id: `a${n}` };
  });
  return actions.map((a, i) => {
    if (a.when === "always") return { ...a, when: "0:00" };
    if (a.when !== "asap") return a;
    const prev = actions[i - 1];
    return { ...a, when: prev ? { after: prev.id, on: "start", asap: true } : "0:00" };
  });
}

const clock = (v: unknown) =>
  typeof v === "string" && /^\d+:\d\d$/.test(v)
    ? Number(v.split(":")[0]) * 60 + Number(v.split(":")[1])
    : undefined;

function durationV5(a: Record<string, unknown>): Record<string, unknown> {
  const start = clock(a.when);
  const end = clock(a.until);
  if (a.do !== "train" || start === undefined || end === undefined) return a;
  const { until: _until, ...rest } = a;
  return end > start ? { ...rest, duration: end - start } : rest;
}

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
