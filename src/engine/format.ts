import { entityIcon, entityName } from "../data/catalog.ts";
import type { GameData } from "../data/load.ts";
import type { Age, Locale, PantheonId, ResourceId } from "../data/schema.ts";
import { translate } from "../i18n/index.ts";
import type { Build, TaskTarget } from "./build.ts";
import { formatClock } from "./time.ts";
import type { SimEvent, SimResult, SimWarning, Snapshot } from "./types.ts";

export type StepKind =
  | "train"
  | "ready"
  | "build"
  | "research"
  | "age"
  | "move"
  | "power"
  | "promote"
  | "rule"
  | "event";

export type StepAction = {
  kind: StepKind;
  icons: string[];
  text: string;
  to?: ResourceId;
  by?: string;
  byLabel?: string;
  action?: number;
};

export type Step = {
  t: string;
  seconds: number;
  age?: Age;
  pop: string;
  alloc: string;
  actions: StepAction[];
  notice?: string;
};

type Ctx = { data: GameData; pantheon: PantheonId; locale: Locale };

const name = (c: Ctx, id: string, count = 1) => entityName(c.data, c.pantheon, id, c.locale, count);
const icon = (c: Ctx, id: string) => entityIcon(c.data, c.pantheon, id);

function targetName(c: Ctx, target: TaskTarget | undefined): string {
  if (!target) return "";
  if (target === "idle") return translate(c.locale, "res.idle");
  return name(c, target).toLocaleLowerCase(c.locale);
}

function resourceOf(c: Ctx, target: TaskTarget | undefined): ResourceId | undefined {
  if (!target || target === "idle") return undefined;
  if (target === "food" || target === "wood" || target === "gold" || target === "favor")
    return target;
  return c.data.sources.get(target)?.resource;
}

function describe(c: Ctx, e: SimEvent): StepAction | null {
  const t = (key: string, params: Record<string, string | number | undefined> = {}) =>
    translate(c.locale, key, params);
  const base = { action: e.action };
  switch (e.kind) {
    case "trainStart":
      return {
        ...base,
        kind: "train",
        icons: [icon(c, e.unit)],
        text: t(e.summon ? "step.summon" : "step.train", {
          count: e.count,
          unit: name(c, e.unit, e.count),
        }),
        to: resourceOf(c, e.rally),
      };
    case "unitReady":
      return {
        ...base,
        kind: "ready",
        icons: [icon(c, e.unit)],
        text: e.to
          ? t("step.ready", { unit: name(c, e.unit), to: targetName(c, e.to) })
          : t("step.readyMilitary", { unit: name(c, e.unit) }),
        to: e.to === "idle" ? undefined : e.to,
      };
    case "buildStart": {
      const byLabel =
        e.by.kind === "new"
          ? t("step.byNew", { unit: name(c, e.by.unit) })
          : e.by.kind === "same"
            ? t("step.bySame")
            : e.by.kind === "unit"
              ? t("step.byUnit", { unit: name(c, e.by.unit) })
              : t("step.byFrom", { unit: name(c, e.by.unit), from: targetName(c, e.by.from) });
      return {
        ...base,
        kind: "build",
        icons: [icon(c, e.building)],
        text: t("step.build", { building: name(c, e.building) }),
        by: e.by.unit,
        byLabel,
        to: resourceOf(c, e.then),
      };
    }
    case "buildDone":
      return {
        ...base,
        kind: "build",
        icons: [icon(c, e.building)],
        text: e.builderTo
          ? t("step.buildDone", { building: name(c, e.building), to: targetName(c, e.builderTo) })
          : t("step.buildDoneAlone", { building: name(c, e.building) }),
        to: e.builderTo === "idle" ? undefined : e.builderTo,
      };
    case "researchStart":
      return {
        ...base,
        kind: "research",
        icons: [icon(c, e.research)],
        text: t("step.research", { research: name(c, e.research) }),
      };
    case "researchDone":
      return {
        ...base,
        kind: "research",
        icons: [icon(c, e.research)],
        text: t("step.researchDone", { research: name(c, e.research) }),
      };
    case "ageStart":
      return {
        ...base,
        kind: "age",
        icons: [icon(c, e.age), icon(c, e.minor)],
        text: t("step.age", { age: name(c, e.age), minor: name(c, e.minor) }),
      };
    case "ageDone": {
      const free = Object.entries(e.free);
      return {
        ...base,
        kind: "age",
        icons: [icon(c, e.age), ...free.map(([u]) => icon(c, u))],
        text: free.length
          ? t("step.ageDoneFree", {
              age: name(c, e.age),
              free: free.map(([u, n]) => `${n} ${name(c, u, n)}`).join(", "),
            })
          : t("step.ageDone", { age: name(c, e.age) }),
      };
    }
    case "move":
      return {
        ...base,
        kind: "move",
        icons: [icon(c, e.unit)],
        text: t("step.move", {
          count: e.count,
          worker: name(c, e.unit, e.count),
          from: targetName(c, e.from),
          to: targetName(c, e.to),
        }),
        to: resourceOf(c, e.to),
      };
    case "power":
      return {
        ...base,
        kind: "power",
        icons: [icon(c, e.power)],
        text: e.target
          ? t("step.powerOn", { power: name(c, e.power), target: name(c, e.target) })
          : t("step.power", { power: name(c, e.power) }),
      };
    case "timeShiftStart":
      return {
        ...base,
        kind: "power",
        icons: [icon(c, "time-shift"), icon(c, e.building)],
        text: t("step.timeShift", { building: name(c, e.building), seconds: e.duration }),
      };
    case "timeShiftDone":
      return {
        ...base,
        kind: "power",
        icons: [icon(c, e.building)],
        text: t("step.timeShiftDone", { building: name(c, e.building) }),
      };
    case "promote":
      return {
        ...base,
        kind: "promote",
        icons: [icon(c, e.to)],
        text: t("step.promote", {
          count: e.count,
          unit: name(c, e.unit, e.count),
          to: name(c, e.to, e.count),
        }),
      };
    case "empower":
      return {
        ...base,
        kind: "power",
        icons: [icon(c, e.unit), icon(c, e.building)],
        text: t("step.empower", { building: name(c, e.building), unit: name(c, e.unit) }),
      };
    case "hunted":
      return {
        ...base,
        kind: "ready",
        icons: [icon(c, e.unit)],
        text: t("step.hunted", { unit: name(c, e.unit), food: Math.round(e.food) }),
        to: "food",
      };
    case "autoTrainOn":
      return {
        ...base,
        kind: "rule",
        icons: [icon(c, e.unit)],
        text: e.rally
          ? t("step.autoTrainTo", { unit: name(c, e.unit, 2), to: targetName(c, e.rally) })
          : t("step.autoTrain", { unit: name(c, e.unit, 2) }),
        to: resourceOf(c, e.rally),
      };
    case "autoTrainOff":
      return {
        ...base,
        kind: "rule",
        icons: e.unit ? [icon(c, e.unit)] : [],
        text: t("step.autoTrainOff"),
      };
    case "affordableOn":
      return {
        ...base,
        kind: "rule",
        icons: [icon(c, e.unit)],
        text: t("step.affordable", { unit: name(c, e.unit, 2) }),
      };
    case "affordableOff":
      return {
        ...base,
        kind: "rule",
        icons: e.unit ? [icon(c, e.unit)] : [],
        text: e.unit
          ? t("step.affordableOffUnit", { unit: name(c, e.unit, 2) })
          : t("step.affordableOff"),
      };
    case "lose":
      return {
        ...base,
        kind: "event",
        icons: Object.keys(e.units).map((u) => icon(c, u)),
        text: Object.entries(e.units)
          .map(([u, n]) => t("step.lose", { count: n, unit: name(c, u, n) }))
          .join(" · "),
      };
    case "gain":
      return {
        ...base,
        kind: "event",
        icons: Object.keys(e.cost).map((r) => icon(c, r)),
        text: Object.entries(e.cost)
          .map(([r, n]) =>
            t("step.gain", { count: n, resource: name(c, r).toLocaleLowerCase(c.locale) }),
          )
          .join(" · "),
      };
    case "note":
      return { ...base, kind: "event", icons: [], text: e.text };
    case "sourceDepleted":
      return null;
  }
}

export function allocString(s: Snapshot): string {
  return `${s.alloc.food}/${s.alloc.wood}/${s.alloc.gold}/${s.alloc.favor}`;
}

export function snapshotAt(series: Snapshot[], t: number): Snapshot | undefined {
  let found: Snapshot | undefined;
  for (const s of series) {
    if (s.t > t + 1e-6) break;
    found = s;
  }
  return found;
}

/** The player-facing timeline: one Step per second that has events. */
export function buildSteps(
  data: GameData,
  build: Build,
  result: SimResult,
  locale: Locale,
): Step[] {
  const c: Ctx = { data, pantheon: build.pantheon, locale };
  const groups = new Map<number, SimEvent[]>();
  for (const e of result.events) {
    const second = Math.round(e.t);
    const list = groups.get(second) ?? [];
    list.push(e);
    groups.set(second, list);
  }
  const steps: Step[] = [];
  for (const [second, events] of [...groups].sort((a, b) => a[0] - b[0])) {
    const snap = snapshotAt(result.series, second);
    const actions = events.map((e) => describe(c, e)).filter((a): a is StepAction => a !== null);
    const notices = events
      .filter(
        (e): e is Extract<SimEvent, { kind: "sourceDepleted" }> => e.kind === "sourceDepleted",
      )
      .map((e) =>
        translate(locale, "step.depleted", {
          source: name(c, e.source),
          next: e.next ? name(c, e.next) : translate(locale, "res.idle"),
        }),
      );
    if (actions.length === 0 && notices.length === 0) continue;
    steps.push({
      t: formatClock(second),
      seconds: second,
      age: snap?.age,
      pop: snap ? `${snap.pop}/${snap.popCap}` : "",
      alloc: snap ? allocString(snap) : "",
      actions,
      notice: notices.length ? notices.join(" · ") : undefined,
    });
  }
  return steps;
}

export function warningText(data: GameData, build: Build, w: SimWarning, locale: Locale): string {
  const c: Ctx = { data, pantheon: build.pantheon, locale };
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(w.params)) {
    if (typeof v === "number") params[k] = v;
    else if (k === "req" && v.startsWith("age:")) params[k] = name(c, v.slice(4));
    else if (k === "req" && v.includes("|")) {
      params[k] = v
        .split("|")
        .map((g) =>
          g
            .split("+")
            .map((id) => name(c, id))
            .join(" + "),
        )
        .join(translate(locale, "word.or"));
    } else params[k] = v === "any" ? translate(locale, "res.any") : name(c, v);
  }
  return translate(locale, w.key, params);
}
