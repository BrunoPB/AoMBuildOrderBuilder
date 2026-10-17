import { z } from "zod";
import {
  type Age,
  type AgeUp,
  type Building,
  type Common,
  CommonSchema,
  type IconManifest,
  IconManifestSchema,
  type MajorGod,
  MajorGodSchema,
  type MinorGod,
  MinorGodSchema,
  type Pantheon,
  type PantheonId,
  PantheonSchema,
  type Power,
  PowersFileSchema,
  type Research,
  ResourcesFileSchema,
  type Source,
  type SourceId,
  SourcesFileSchema,
  type Unit,
} from "./schema.ts";

/** Raw JSON contents, keyed by file name (without folder or extension where noted). */
export type RawData = {
  common: unknown;
  resources: unknown;
  sources: unknown;
  powers: unknown;
  pantheons: Record<string, unknown>;
  gods: Record<string, unknown>;
  minors: Record<string, unknown>;
  icons?: unknown;
};

export type PantheonIndex = {
  def: Pantheon;
  units: Map<string, Unit>;
  buildings: Map<string, Building>;
  researches: Map<string, Research>;
  ageUps: Map<Exclude<Age, "archaic">, AgeUp>;
};

export type GameData = {
  common: Common;
  resources: z.infer<typeof ResourcesFileSchema>;
  sources: Map<SourceId, Source>;
  pantheons: Map<PantheonId, PantheonIndex>;
  gods: Map<string, MajorGod>;
  minors: Map<string, MinorGod>;
  powers: Map<string, Power>;
  icons: Map<string, IconManifest["icons"][number]>;
};

export class DataError extends Error {
  constructor(
    message: string,
    readonly issues: string[],
  ) {
    super(message);
  }
}

function parse<T>(schema: z.ZodType<T>, value: unknown, where: string, issues: string[]): T | null {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  issues.push(`${where}: ${z.prettifyError(result.error)}`);
  return null;
}

function byId<T extends { id: string }>(items: T[], where: string, issues: string[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    if (map.has(item.id)) issues.push(`${where}: duplicate id "${item.id}"`);
    map.set(item.id, item);
  }
  return map;
}

export function loadGameData(raw: RawData): GameData {
  const issues: string[] = [];
  const common = parse(CommonSchema, raw.common, "common.json", issues);
  const resources = parse(ResourcesFileSchema, raw.resources, "resources.json", issues) ?? [];
  const sources = parse(SourcesFileSchema, raw.sources, "sources.json", issues) ?? [];
  const powers = parse(PowersFileSchema, raw.powers, "powers.json", issues) ?? [];

  const pantheons = new Map<PantheonId, PantheonIndex>();
  for (const [file, value] of Object.entries(raw.pantheons)) {
    const def = parse(PantheonSchema, value, `pantheons/${file}.json`, issues);
    if (!def) continue;
    const where = `pantheons/${file}.json`;
    pantheons.set(def.id, {
      def,
      units: byId(def.units, where, issues),
      buildings: byId(def.buildings, where, issues),
      researches: byId(def.researches, where, issues),
      ageUps: new Map(def.ageUps.map((a) => [a.to, a])),
    });
  }

  const gods = new Map<string, MajorGod>();
  for (const [file, value] of Object.entries(raw.gods)) {
    const god = parse(MajorGodSchema, value, `gods/${file}.json`, issues);
    if (god) gods.set(god.id, god);
  }
  const minors = new Map<string, MinorGod>();
  for (const [file, value] of Object.entries(raw.minors)) {
    const minor = parse(MinorGodSchema, value, `minors/${file}.json`, issues);
    if (minor) minors.set(minor.id, minor);
  }

  const icons = new Map<string, IconManifest["icons"][number]>();
  if (raw.icons !== undefined) {
    const manifest = parse(IconManifestSchema, raw.icons, "icons/manifest.json", issues);
    for (const icon of manifest?.icons ?? []) icons.set(icon.id, icon);
  }

  const powerMap = byId(powers, "powers.json", issues);
  if (!common || issues.length > 0) throw new DataError("invalid game data", issues);

  return {
    common,
    resources,
    sources: new Map(sources.map((s) => [s.id, s])),
    pantheons,
    gods,
    minors,
    powers: powerMap,
    icons,
  };
}

export function pantheonOf(data: GameData, id: PantheonId): PantheonIndex {
  const p = data.pantheons.get(id);
  if (!p) throw new Error(`unknown pantheon "${id}"`);
  return p;
}
