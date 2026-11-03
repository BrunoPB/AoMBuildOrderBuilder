import { z } from "zod";

export const LOCALES = ["pt-BR", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const RESOURCE_IDS = ["food", "wood", "gold", "favor"] as const;
export const GATHER_RESOURCES = ["food", "wood", "gold"] as const;
export const AGES = ["archaic", "classical", "heroic", "mythic"] as const;
export const SOURCE_IDS = ["hunt", "herd", "berries", "farm", "fish", "wood", "gold"] as const;
export const PANTHEON_IDS = ["greeks", "egyptians", "norse", "atlanteans"] as const;

export const LocaleSchema = z.enum(LOCALES);
export const ResourceIdSchema = z.enum(RESOURCE_IDS);
export const GatherResourceSchema = z.enum(GATHER_RESOURCES);
export const AgeSchema = z.enum(AGES);
export const SourceIdSchema = z.enum(SOURCE_IDS);
export const PantheonIdSchema = z.enum(PANTHEON_IDS);

export type ResourceId = z.infer<typeof ResourceIdSchema>;
export type GatherResource = z.infer<typeof GatherResourceSchema>;
export type Age = z.infer<typeof AgeSchema>;
export type SourceId = z.infer<typeof SourceIdSchema>;
export type PantheonId = z.infer<typeof PantheonIdSchema>;

const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "ids are kebab-case");

export const LocalizedTextSchema = z.strictObject({
  "pt-BR": z.string().min(1),
  en: z.string().min(1),
});
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const CostSchema = z.partialRecord(ResourceIdSchema, z.number().nonnegative());
export type Cost = z.infer<typeof CostSchema>;

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const MetaSchema = z.strictObject({
  source: z.string().min(1),
  checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  confidence: ConfidenceSchema,
  note: z.string().optional(),
});
export type Meta = z.infer<typeof MetaSchema>;

/** Per-field overrides when one value of an entity has a different source or confidence. */
const FieldMetaSchema = z.record(z.string(), MetaSchema).optional();

export const ModifierSchema = z.strictObject({
  target: z.enum([
    "buildTime",
    "trainTime",
    "researchTime",
    "gatherRate",
    "favorRate",
    "cost",
    "popCap",
    "buildRate",
    "pop",
    "promotionTime",
    "promotionCost",
    "builderRate",
  ]),
  /** mul: × value · add: + value · pct: + value × base, summed with other pct (game "BasePercent"). */
  op: z.enum(["mul", "add", "pct"]),
  value: z.number(),
  scope: z
    .strictObject({
      ids: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      sources: z.array(SourceIdSchema).optional(),
      resources: z.array(ResourceIdSchema).optional(),
    })
    .optional(),
  condition: z.enum(["always", "nearManor", "custom"]).optional(),
  except: z.array(z.string()).optional(),
  note: z.string().optional(),
});
export type Modifier = z.infer<typeof ModifierSchema>;

export const WorkerSchema = z.strictObject({
  /** Gather rate per minute, per source. */
  gatherRates: z.partialRecord(SourceIdSchema, z.number().nonnegative()),
  /** Build speed multiplier relative to the pantheon's base builder (1 = base). */
  buildRate: z.number().positive().optional(),
  canBuild: z.boolean().optional(),
  /** Only these building ids (absent = any building). */
  builds: z.array(z.string()).optional(),
  needsDropsite: z.boolean(),
});

export const UnitSchema = z.strictObject({
  id,
  name: LocalizedTextSchema,
  plural: LocalizedTextSchema.partial().optional(),
  icon: z.string().min(1),
  pantheon: PantheonIdSchema,
  tags: z.array(z.string()),
  cost: CostSchema,
  pop: z.number().nonnegative(),
  trainTime: z.number().nonnegative(),
  trainedAt: z.array(z.string()),
  age: AgeSchema,
  requires: z.array(z.string()).optional(),
  worker: WorkerSchema.optional(),
  /** Atlantean hero promotion. */
  promotion: z
    .strictObject({ to: z.string(), cost: CostSchema, time: z.number().nonnegative() })
    .optional(),
  /** Favor per minute produced by this unit (e.g. Atlantean Oracle), before modifiers. */
  favorRate: z.number().nonnegative().optional(),
  /** Resources per minute generated just by existing (e.g. Norse Hersir favor). */
  trickle: CostSchema.optional(),
  /** Trained in its own queue, without blocking the building (Greek heroes). */
  splitQueue: z.boolean().optional(),
  /** Food left when the animal is killed (Set's animals). */
  carcass: z.number().nonnegative().optional(),
  /** Major gods that do not have this unit. */
  excludeGods: z.array(z.string()).optional(),
  meta: MetaSchema,
  fieldMeta: FieldMetaSchema,
});
export type Unit = z.infer<typeof UnitSchema>;

export const BuildingSchema = z.strictObject({
  id,
  name: LocalizedTextSchema,
  plural: LocalizedTextSchema.partial().optional(),
  icon: z.string().min(1),
  pantheon: PantheonIdSchema,
  tags: z.array(z.string()).optional(),
  cost: CostSchema,
  /** Seconds with a single base builder. */
  buildTime: z.number().nonnegative(),
  popCap: z.number().nonnegative().optional(),
  limit: z.number().int().positive().optional(),
  age: AgeSchema,
  requires: z.array(z.string()).optional(),
  trains: z.array(z.string()).optional(),
  researches: z.array(z.string()).optional(),
  trainQueues: z.number().int().positive().optional(),
  dropsiteFor: z.array(SourceIdSchema).optional(),
  /** Favor per minute generated while it stands (e.g. Egyptian Monuments). */
  favorRate: z.number().nonnegative().optional(),
  /** Resources per minute generated while it stands. */
  trickle: CostSchema.optional(),
  /** Major gods that do not have this building (e.g. Thor has no Armory). */
  excludeGods: z.array(z.string()).optional(),
  meta: MetaSchema,
  fieldMeta: FieldMetaSchema,
});
export type Building = z.infer<typeof BuildingSchema>;

export const ResearchSchema = z.strictObject({
  id,
  name: LocalizedTextSchema,
  icon: z.string().min(1),
  pantheon: PantheonIdSchema.optional(),
  tags: z.array(z.string()).optional(),
  cost: CostSchema,
  time: z.number().nonnegative(),
  at: z.string(),
  age: AgeSchema,
  requires: z.array(z.string()).optional(),
  effects: z.array(ModifierSchema),
  /** Resources per minute once researched (e.g. Vaults of Erebus). */
  trickle: CostSchema.optional(),
  /** Units created when the research completes (e.g. Thor's free Dwarf). */
  spawn: z.record(z.string(), z.number().int().positive()).optional(),
  excludeGods: z.array(z.string()).optional(),
  meta: MetaSchema,
  fieldMeta: FieldMetaSchema,
});
export type Research = z.infer<typeof ResearchSchema>;

export const AgeUpSchema = z.strictObject({
  pantheon: PantheonIdSchema,
  to: AgeSchema.exclude(["archaic"]),
  cost: CostSchema,
  time: z.number().positive(),
  at: z.string(),
  /** At least one inner list must be fully satisfied. */
  requiresAnyOf: z.array(z.array(z.string())).optional(),
  meta: MetaSchema,
  fieldMeta: FieldMetaSchema,
});
export type AgeUp = z.infer<typeof AgeUpSchema>;

export const StartStateSchema = z.strictObject({
  resources: CostSchema,
  units: z.record(z.string(), z.number().int().nonnegative()),
  buildings: z.record(z.string(), z.number().int().nonnegative()).optional(),
  popCap: z.number().nonnegative(),
});
export type StartState = z.infer<typeof StartStateSchema>;

export const FavorRuleSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("templeWorkers"),
    building: z.string(),
    /** Favor/min for 1..n workers praying (global across temples); index 0 = 1 worker. */
    table: z.array(z.number().nonnegative()).min(1),
    meta: MetaSchema,
  }),
  z.strictObject({
    type: z.literal("monuments"),
    /** Monument building id → favor/min. */
    rates: z.record(z.string(), z.number().nonnegative()),
    meta: MetaSchema,
  }),
  z.strictObject({
    type: z.literal("combat"),
    damagePerFavor: z.number().positive(),
    decayFrom: z.number().nonnegative(),
    decayTo: z.number().nonnegative(),
    defaultPerMinute: z.number().nonnegative(),
    meta: MetaSchema,
  }),
  z.strictObject({
    type: z.literal("oracles"),
    unit: z.string(),
    defaultRate: z.number().nonnegative(),
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
    heroMultiplier: z.number().positive(),
    heroUnit: z.string().optional(),
    meta: MetaSchema,
  }),
]);
export type FavorRule = z.infer<typeof FavorRuleSchema>;

/** A building boost issued by a unit (Egyptian Pharaoh/Priest "Empower"). Rates are at full strength. */
export const EmpowerSchema = z.strictObject({
  sources: z.array(
    z.strictObject({
      unit: z.string(),
      /** Share of the full effect (Ra's Priests: 0.6). */
      strength: z.number().positive(),
      gods: z.array(z.string()).optional(),
    }),
  ),
  targets: z.array(z.string()),
  buildRate: z.number().positive(),
  researchRate: z.number().positive(),
  /** Training speed for military units only. */
  militaryTrainRate: z.number().positive(),
  /** Resources dropped at an empowered dropsite. */
  dropsiteRate: z.number().positive(),
  /** Favor of an empowered Monument; per-god overrides (Isis). */
  favorRate: z.number().positive(),
  favorRateByGod: z.record(z.string(), z.number().positive()).optional(),
  /** Units whose training is not sped up (economic units). */
  economicUnits: z.array(z.string()),
  meta: MetaSchema,
});
export type Empower = z.infer<typeof EmpowerSchema>;

/** Units a unit can summon with favor (Set's Pharaoh: Animals of Set). */
export const SummonSchema = z.strictObject({
  by: z.string(),
  gods: z.array(z.string()),
  units: z.array(z.string()),
  meta: MetaSchema,
});
export type Summon = z.infer<typeof SummonSchema>;

export const PantheonSchema = z.strictObject({
  id: PantheonIdSchema,
  name: LocalizedTextSchema,
  icon: z.string(),
  /** Main worker unit id(s); the first is the default for "train worker". */
  workers: z.array(z.string()).min(1),
  townCenter: z.string(),
  start: StartStateSchema,
  favor: FavorRuleSchema,
  /** Maximum favor that can be stored; absent = no cap. */
  favorCap: z.number().positive().optional(),
  empower: EmpowerSchema.optional(),
  summon: SummonSchema.optional(),
  gods: z.array(z.string()).length(3),
  ageUps: z.array(AgeUpSchema),
  units: z.array(UnitSchema),
  buildings: z.array(BuildingSchema),
  researches: z.array(ResearchSchema),
  meta: MetaSchema,
});
export type Pantheon = z.infer<typeof PantheonSchema>;

export const MajorGodSchema = z.strictObject({
  id,
  pantheon: PantheonIdSchema,
  name: LocalizedTextSchema,
  icon: z.string(),
  portrait: z.string().optional(),
  modifiers: z.array(ModifierSchema),
  startExtras: StartStateSchema.partial().optional(),
  /** Free myth units of the chosen minor god on each age up (e.g. Cronos: 2). */
  ageUpFreeUnits: z.number().int().nonnegative().optional(),
  powers: z.array(z.string()),
  minors: z.strictObject({
    classical: z.array(z.string()),
    heroic: z.array(z.string()),
    mythic: z.array(z.string()),
  }),
  /** Kronos: which buildings can be Time Shifted (major_gods.xml <timeshifting>). */
  timeShift: z
    .strictObject({
      maxConcurrent: z.number().int().positive(),
      buildings: z.array(
        z.strictObject({
          id: z.string(),
          /** Share of the building cost paid to shift it. */
          costRatio: z.number().nonnegative(),
          /** Share of the building's build time the shift takes. */
          timeRatio: z.number().positive(),
        }),
      ),
    })
    .optional(),
  /** Ids of units/buildings/researches only this god has access to. */
  unlocks: z.array(z.string()).optional(),
  meta: MetaSchema,
  fieldMeta: FieldMetaSchema,
});
export type MajorGod = z.infer<typeof MajorGodSchema>;

export const MinorGodSchema = z.strictObject({
  id,
  pantheon: PantheonIdSchema,
  name: LocalizedTextSchema,
  icon: z.string(),
  portrait: z.string().optional(),
  age: AgeSchema.exclude(["archaic"]),
  freeUnitsOnAgeUp: z.record(z.string(), z.number().int().nonnegative()).optional(),
  /** Myth units, researches and other things this minor god makes available. */
  unlocks: z.array(z.string()),
  powers: z.array(z.string()),
  modifiers: z.array(ModifierSchema).optional(),
  meta: MetaSchema,
  fieldMeta: FieldMetaSchema,
});
export type MinorGod = z.infer<typeof MinorGodSchema>;

export const PowerEffectSchema = z.strictObject({
  kind: z.enum(["economy", "military", "utility", "timeShift", "deconstruction"]),
  modifiers: z.array(ModifierSchema).optional(),
  duration: z.number().nonnegative().optional(),
  grant: CostSchema.optional(),
  spawn: z.record(z.string(), z.number().int().nonnegative()).optional(),
  /** Resources per minute while the effect lasts (e.g. Plenty, Flood of the Nile). */
  trickle: CostSchema.optional(),
  /** Fraction of the target building's build time a relocation takes (Time Shift). */
  buildTimeFraction: z.number().nonnegative().optional(),
});
export type PowerEffect = z.infer<typeof PowerEffectSchema>;

export const PowerSchema = z.strictObject({
  id,
  name: LocalizedTextSchema,
  icon: z.string(),
  pantheon: PantheonIdSchema,
  cost: CostSchema.optional(),
  cooldown: z.number().nonnegative().optional(),
  uses: z.number().int().positive().optional(),
  /** Time to cast/charge before the effect, if any. */
  castTime: z.number().nonnegative().optional(),
  effect: PowerEffectSchema,
  meta: MetaSchema,
  fieldMeta: FieldMetaSchema,
});
export type Power = z.infer<typeof PowerSchema>;

export const SourceSchema = z.strictObject({
  id: SourceIdSchema,
  name: LocalizedTextSchema,
  icon: z.string(),
  resource: GatherResourceSchema,
  defaultAmount: z.number().positive(),
  /** Infinite sources (farms) ignore defaultAmount. */
  infinite: z.boolean().optional(),
  fallback: SourceIdSchema.optional(),
  meta: MetaSchema,
});
export type Source = z.infer<typeof SourceSchema>;

export const ResourceSchema = z.strictObject({
  id: ResourceIdSchema,
  name: LocalizedTextSchema,
  icon: z.string(),
});

export const AgeInfoSchema = z.strictObject({
  id: AgeSchema,
  name: LocalizedTextSchema,
  icon: z.string(),
});

export const CommonSchema = z.strictObject({
  game: z.literal("aom-retold"),
  patch: z.string(),
  checkedAt: z.string(),
  ages: z.array(AgeInfoSchema).length(4),
  pantheons: z.array(
    z.strictObject({ id: PantheonIdSchema, name: LocalizedTextSchema, icon: z.string() }),
  ),
  defaults: z.strictObject({
    efficiency: z.number().positive().max(1.5),
    tick: z.number().positive(),
    foodChain: z.array(SourceIdSchema).min(1),
    norseFavorPerMinute: z.number().nonnegative(),
    /** Share of the 2nd builder's rate that counts (game: buildingefficiency). */
    secondBuilderEfficiency: z.number().nonnegative().optional(),
    /** Share of each further builder's rate (game: extrabuildingefficiency). */
    extraBuilderEfficiency: z.number().nonnegative().optional(),
  }),
  meta: MetaSchema,
});
export type Common = z.infer<typeof CommonSchema>;

export const ResourcesFileSchema = z.array(ResourceSchema);
export const SourcesFileSchema = z.array(SourceSchema);
export const PowersFileSchema = z.array(PowerSchema);

export const IconEntrySchema = z.strictObject({
  id: z.string(),
  file: z.string(),
  file128: z.string().optional(),
  origin: z.string(),
  license: z.string(),
  placeholder: z.boolean().optional(),
});
export const IconManifestSchema = z.strictObject({
  generatedAt: z.string(),
  icons: z.array(IconEntrySchema),
});
export type IconManifest = z.infer<typeof IconManifestSchema>;
