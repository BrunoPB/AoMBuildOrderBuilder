import type { GameData } from "./load.ts";
import type { Locale, LocalizedText, Meta, PantheonId } from "./schema.ts";
import { pluralize, text } from "../i18n/index.ts";

export type EntityKind =
  | "unit"
  | "building"
  | "research"
  | "god"
  | "minor"
  | "power"
  | "source"
  | "resource"
  | "age"
  | "pantheon";

export type Entity = {
  kind: EntityKind;
  id: string;
  name: LocalizedText;
  plural?: Partial<LocalizedText>;
  icon: string;
  meta?: Meta;
};

/** Finds any named game entity by id, looking in the pantheon first. */
export function findEntity(data: GameData, pantheon: PantheonId, id: string): Entity | undefined {
  const p = data.pantheons.get(pantheon);
  const unit = p?.units.get(id);
  if (unit) return { kind: "unit", ...unit };
  const building = p?.buildings.get(id);
  if (building) return { kind: "building", ...building };
  const research = p?.researches.get(id);
  if (research) return { kind: "research", ...research };
  const god = data.gods.get(id);
  if (god) return { kind: "god", ...god, icon: god.portrait ?? god.icon };
  const minor = data.minors.get(id);
  if (minor) return { kind: "minor", ...minor };
  const power = data.powers.get(id);
  if (power) return { kind: "power", ...power };
  const age = data.common.ages.find((a) => a.id === id || `age:${a.id}` === id);
  if (age) return { kind: "age", ...age };
  const resource = data.resources.find((r) => r.id === id);
  if (resource) return { kind: "resource", ...resource };
  const source = data.sources.get(id as never);
  if (source) return { kind: "source", ...source };
  const pan = data.common.pantheons.find((x) => x.id === id);
  if (pan) return { kind: "pantheon", ...pan };
  return undefined;
}

export function entityName(
  data: GameData,
  pantheon: PantheonId,
  id: string,
  locale: Locale,
  count = 1,
): string {
  const e = findEntity(data, pantheon, id);
  if (!e) return id;
  const singular = text(locale, e.name);
  if (count === 1) return singular;
  return e.plural?.[locale] ?? pluralize(locale, singular);
}

export function entityIcon(data: GameData, pantheon: PantheonId, id: string): string {
  return findEntity(data, pantheon, id)?.icon ?? `missing/${id}`;
}
