import { entityName } from "../../data/catalog.ts";
import type { GameData } from "../../data/load.ts";
import { AGES, type Age, type Locale, type PantheonId, SOURCE_IDS } from "../../data/schema.ts";
import type { Action, ActionKind, Build, TaskTarget } from "../../engine/build.ts";
import { translate } from "../../i18n/index.ts";

type Ctx = { data: GameData; pantheon: PantheonId; locale: Locale };

function n(c: Ctx, id: string, count = 1): string {
  return entityName(c.data, c.pantheon, id, c.locale, count);
}

export function targetLabel(c: Ctx, target: TaskTarget): string {
  if (target === "idle") return translate(c.locale, "res.idle");
  return n(c, target).toLocaleLowerCase(c.locale);
}

/** Entity ids shown as icons for an action. */
export function actionIcons(a: Action): string[] {
  switch (a.do) {
    case "train":
    case "autoTrain":
    case "trainWhenAffordable":
    case "promote":
      return [a.unit];
    case "stopAutoTrain":
    case "stopTrainWhenAffordable":
      return a.unit ? [a.unit] : [];
    case "build":
    case "timeShift":
      return [a.building];
    case "research":
      return [a.research];
    case "age":
      return [a.to, a.minor];
    case "power":
      return a.target ? [a.power, a.target] : [a.power];
    case "move":
      return a.to === "idle" ? [] : [a.to];
    case "event":
      return [
        ...Object.keys(a.lose ?? {}),
        ...Object.keys(a.gainResource ?? {}),
        ...(a.gainFavor ? ["favor"] : []),
      ];
  }
}

export function actionText(c: Ctx, a: Action): string {
  const t = (key: string, params: Record<string, string | number | undefined> = {}) =>
    translate(c.locale, key, params);
  const worker = c.data.pantheons.get(c.pantheon)?.def.workers[0] ?? "";
  switch (a.do) {
    case "train": {
      const count = a.count ?? 1;
      const base = t("step.train", { count, unit: n(c, a.unit, count) });
      return a.rally ? `${base} → ${targetLabel(c, a.rally)}` : base;
    }
    case "build":
      return a.then
        ? `${t("step.build", { building: n(c, a.building) })} → ${targetLabel(c, a.then)}`
        : t("step.build", { building: n(c, a.building) });
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
    case "power":
      return a.target
        ? t("step.powerOn", { power: n(c, a.power), target: n(c, a.target) })
        : t("step.power", { power: n(c, a.power) });
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
    case "autoTrain":
      return a.rally
        ? t("step.autoTrainTo", { unit: n(c, a.unit, 2), to: targetLabel(c, a.rally) })
        : t("step.autoTrain", { unit: n(c, a.unit, 2) });
    case "stopAutoTrain":
      return t("step.autoTrainOff");
    case "trainWhenAffordable":
      return t("step.affordable", { unit: n(c, a.unit, 2) });
    case "stopTrainWhenAffordable":
      return a.unit
        ? t("step.affordableOffUnit", { unit: n(c, a.unit, 2) })
        : t("step.affordableOff");
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

export function taskTargets(data: GameData, pantheon: PantheonId): TaskTarget[] {
  const favor = data.pantheons.get(pantheon)?.def.favor.type === "templeWorkers";
  const sources = SOURCE_IDS.filter((s) => data.sources.has(s) && s !== "wood" && s !== "gold");
  return ["food", "wood", "gold", ...(favor ? (["favor"] as const) : []), ...sources, "idle"];
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

export function nextActionId(build: Build): string {
  const used = new Set(build.actions.map((a) => a.id));
  let i = build.actions.length + 1;
  while (used.has(`a${i}`)) i++;
  return `a${i}`;
}

export const PALETTE_KINDS: ActionKind[] = [
  "train",
  "build",
  "research",
  "age",
  "move",
  "power",
  "timeShift",
  "promote",
  "autoTrain",
  "stopAutoTrain",
  "trainWhenAffordable",
  "stopTrainWhenAffordable",
  "event",
];
