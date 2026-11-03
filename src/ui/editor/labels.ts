import { entityName } from "../../data/catalog.ts";
import type { GameData } from "../../data/load.ts";
import { AGES, type Age, type Locale, type PantheonId, SOURCE_IDS } from "../../data/schema.ts";
import type { Action, ActionKind, Build, TaskTarget } from "../../engine/build.ts";
import { formatClock } from "../../engine/time.ts";
import { translate } from "../../i18n/index.ts";
import { KIND_ICON } from "../svg.tsx";

type Ctx = { data: GameData; pantheon: PantheonId; locale: Locale };

function n(c: Ctx, id: string, count = 1): string {
  return entityName(c.data, c.pantheon, id, c.locale, count);
}

export function targetLabel(c: Ctx, target: TaskTarget): string {
  if (target === "idle") return translate(c.locale, "res.idle");
  return n(c, target).toLocaleLowerCase(c.locale);
}

/** Kind of an action for its icon, color and name; a train that keeps going is its mode. */
export function actionKind(a: Action): string {
  return a.do === "train" && a.mode ? `train.${a.mode}` : a.do;
}

export function actionKindIcon(a: Action): string {
  return KIND_ICON[actionKind(a)] ?? "info";
}

/** Entity ids shown on the left of an action: who/what acts. */
export function actionIcons(a: Action, worker?: string): string[] {
  switch (a.do) {
    case "train":
    case "promote":
    case "summon":
      return [a.unit];
    case "empower":
      return [a.by];
    case "build":
    case "timeShift":
      return [a.building];
    case "research":
      return [a.research];
    case "age":
      return [a.to, a.minor];
    case "power":
      return [a.power];
    case "move":
      return [a.unit ?? worker ?? a.to];
    case "event":
      return [
        ...Object.keys(a.lose ?? {}),
        ...Object.keys(a.gainResource ?? {}),
        ...(a.gainFavor ? ["favor"] : []),
      ];
  }
}

/** What the action points at, shown on the right: a resource/source, or a target building. */
export function actionTarget(a: Action): string | undefined {
  if (a.do === "empower") return a.building;
  if (a.do === "power") return a.target;
  const target =
    a.do === "train" ? a.rally : a.do === "build" ? a.then : a.do === "move" ? a.to : undefined;
  return target === "idle" ? undefined : target;
}

/** Actions that take time: their start and their end are different moments. */
export function hasDuration(a: Action): boolean {
  if (a.do === "train") return !a.mode;
  return ["build", "research", "age", "timeShift", "promote", "summon"].includes(a.do);
}

/** The moment an action is done, as the timeline shows it ("Heroic ✓", "Temple ✓"…). */
export function doneText(c: Ctx, a: Action): string {
  const t = (key: string, params: Record<string, string>) => translate(c.locale, key, params);
  switch (a.do) {
    case "age":
      return t("step.ageDone", { age: n(c, a.to) });
    case "build":
      return t("step.buildDoneAlone", { building: n(c, a.building) });
    case "research":
      return t("step.researchDone", { research: n(c, a.research) });
    case "timeShift":
      return t("step.timeShiftDone", { building: n(c, a.building) });
    default:
      return hasDuration(a) ? `${actionText(c, a)} ✓` : actionText(c, a);
  }
}

/** "45 s" under a minute, "2:30" from there. */
export function durationLabel(seconds: number): string {
  return seconds < 60 ? `${seconds} s` : formatClock(seconds);
}

export function actionText(c: Ctx, a: Action): string {
  const t = (key: string, params: Record<string, string | number | undefined> = {}) =>
    translate(c.locale, key, params);
  const worker = c.data.pantheons.get(c.pantheon)?.def.workers[0] ?? "";
  switch (a.do) {
    case "train": {
      const count = a.count ?? 1;
      const base = !a.mode
        ? t("step.train", { count, unit: n(c, a.unit, count) })
        : a.duration !== undefined
          ? t("step.autoTrainFor", { unit: n(c, a.unit, 2), time: durationLabel(a.duration) })
          : a.until
            ? t("step.autoTrainUntil", { unit: n(c, a.unit, 2), until: a.until })
            : t("step.autoTrain", { unit: n(c, a.unit, 2) });
      return a.rally ? `${base} → ${targetLabel(c, a.rally)}` : base;
    }
    case "build": {
      const from =
        a.builder && "from" in a.builder
          ? ` (${t("step.builderFrom", { count: a.builders ?? 1, from: targetLabel(c, a.builder.from) })}${a.then ? "" : " ↩"})`
          : "";
      const base = `${t("step.build", { building: n(c, a.building) })}${from}`;
      return a.then ? `${base} → ${targetLabel(c, a.then)}` : base;
    }
    case "research":
      return t("step.research", { research: n(c, a.research) });
    case "age":
      return t("step.age", { age: n(c, a.to), minor: n(c, a.minor) });
    case "move":
      return t("step.move", {
        count: a.count,
        worker: n(c, a.unit ?? worker, a.count),
        from: targetLabel(c, a.from),
        to: targetLabel(c, a.to),
      });
    case "power": {
      const base = a.target
        ? t("step.powerOn", { power: n(c, a.power), target: n(c, a.target) })
        : t("step.power", { power: n(c, a.power) });
      return a.note ? `${base} · ${a.note}` : base;
    }
    case "timeShift":
      return `${t("action.timeShift")}: ${n(c, a.building)}`;
    case "promote":
      return t("step.promote", {
        count: a.count ?? 1,
        unit: n(c, a.unit, a.count ?? 1),
        to: n(
          c,
          c.data.pantheons.get(c.pantheon)?.units.get(a.unit)?.promotion?.to ?? a.unit,
          a.count ?? 1,
        ),
      });
    case "empower":
      return t("step.empower", { building: n(c, a.building), unit: n(c, a.by) });
    case "summon": {
      const count = a.count ?? 1;
      const base = t("step.summon", { count, unit: n(c, a.unit, count) });
      return a.hunt ? `${base} → ${t("row.huntIt").toLocaleLowerCase(c.locale)}` : base;
    }
    case "event": {
      const parts: string[] = [];
      for (const [u, k] of Object.entries(a.lose ?? {}))
        parts.push(t("step.lose", { count: k, unit: n(c, u, k) }));
      if (a.gainFavor)
        parts.push(t("step.gain", { count: a.gainFavor, resource: n(c, "favor").toLowerCase() }));
      for (const [r, k] of Object.entries(a.gainResource ?? {})) {
        parts.push(t("step.gain", { count: k, resource: n(c, r).toLowerCase() }));
      }
      if (a.note) parts.push(a.note);
      return parts.join(" · ") || t("action.event");
    }
  }
}

/** Where workers can be sent; with `unit`, only what that unit gathers (plus idle). */
export function taskTargets(data: GameData, pantheon: PantheonId, unit?: string): TaskTarget[] {
  const def = data.pantheons.get(pantheon)?.def;
  const rates = unit
    ? data.pantheons.get(pantheon)?.units.get(unit)?.worker?.gatherRates
    : undefined;
  const gathers = (s: string) => !unit || (rates?.[s as keyof typeof rates] ?? 0) > 0;
  const favor = def?.favor.type === "templeWorkers" && (!unit || def.workers[0] === unit);
  const resources = (["food", "wood", "gold"] as const).filter((r) =>
    SOURCE_IDS.some((s) => gathers(s) && data.sources.get(s)?.resource === r),
  );
  const sources = SOURCE_IDS.filter(
    (s) => data.sources.has(s) && s !== "wood" && s !== "gold" && gathers(s),
  );
  return [...resources, ...(favor ? (["favor"] as const) : []), ...sources, "idle"];
}

/** Units that gather resources (villagers, fishing ships…): only they have a rally target. */
export function isGatherer(data: GameData, pantheon: PantheonId, unit: string): boolean {
  const rates = data.pantheons.get(pantheon)?.units.get(unit)?.worker?.gatherRates ?? {};
  return Object.values(rates).some((v) => (v ?? 0) > 0);
}

/** Minor gods picked in the build's age-up actions, by age. */
export function chosenMinors(build: Build): Partial<Record<Exclude<Age, "archaic">, string>> {
  const out: Partial<Record<Exclude<Age, "archaic">, string>> = {};
  for (const a of build.actions) if (a.do === "age") out[a.to] = a.minor;
  return out;
}

export function ageRank(age: Age): number {
  return AGES.indexOf(age);
}

/** Where a palette action goes: last, but before the age ups at the end of the list (picked in
 *  the Gods tab, they usually come after what the player adds). */
export function addIndex(actions: readonly Action[]): number {
  let k = actions.length;
  while (k > 0 && actions[k - 1]!.do === "age") k--;
  return k;
}

export function nextActionId(build: Build): string {
  const used = new Set(build.actions.map((a) => a.id));
  let i = build.actions.length + 1;
  while (used.has(`a${i}`)) i++;
  return `a${i}`;
}

/** Palette action kinds by group, most common first; god-specific actions last. */
export const PALETTE_GROUPS: { id: string; kinds: ActionKind[] }[] = [
  { id: "economy", kinds: ["move", "train", "build", "research", "age"] },
  { id: "god", kinds: ["power", "timeShift", "promote", "empower", "summon"] },
  { id: "other", kinds: ["event"] },
];

/** What the build starts with: the pantheon's start state plus the major god's extras. */
export function startState(data: GameData, build: Build) {
  const start = data.pantheons.get(build.pantheon)?.def.start;
  const extras = data.gods.get(build.god)?.startExtras ?? {};
  const units: Record<string, number> = { ...start?.units, ...extras.units };
  const resources: Record<string, number> = {};
  for (const r of ["food", "wood", "gold", "favor"] as const) {
    const v = (start?.resources[r] ?? 0) + (extras.resources?.[r] ?? 0);
    if (v > 0) resources[r] = v;
  }
  return {
    units: Object.entries(units).filter(([, count]) => count > 0),
    buildings: Object.entries(start?.buildings ?? {}).filter(([, count]) => count > 0),
    resources: Object.entries(resources),
  };
}

/** Drag-and-drop type for an action dragged from the palette into the list. */
export const ACTION_MIME = "application/x-aomr-action";
