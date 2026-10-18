import { z } from "zod";
import {
  AgeSchema,
  CostSchema,
  LocalizedTextSchema,
  PantheonIdSchema,
  ResourceIdSchema,
  SourceIdSchema,
} from "../data/schema.ts";
import { isClock } from "./time.ts";

export const BUILD_FORMAT = "aomr-bob";
export const BUILD_VERSION = 1;

export const BUILD_TYPES = ["rush", "eco", "timing", "water", "other"] as const;
export const BuildTypeSchema = z.enum(BUILD_TYPES);
export type BuildType = z.infer<typeof BuildTypeSchema>;

/** Where a worker goes: a resource (uses the current source for it), a specific source, or idle. */
export const TaskTargetSchema = z.union([ResourceIdSchema, SourceIdSchema, z.literal("idle")]);
export type TaskTarget = z.infer<typeof TaskTargetSchema>;

export const WhenSchema = z.union([
  z.literal("asap"),
  z.literal("always"),
  z.string().refine(isClock, "expected m:ss"),
  z.strictObject({ after: z.string(), delay: z.number().nonnegative().optional() }),
]);
export type When = z.infer<typeof WhenSchema>;

const base = {
  id: z.string().min(1).optional(),
  when: WhenSchema,
  note: z.string().optional(),
};

export const BuilderSchema = z.union([
  z.strictObject({ new: z.string() }),
  z.strictObject({ from: TaskTargetSchema }),
  z.strictObject({ same: z.string() }),
]);
export type Builder = z.infer<typeof BuilderSchema>;

const count = z.number().int().positive().optional();

export const ActionSchema = z.discriminatedUnion("do", [
  z.strictObject({
    ...base,
    do: z.literal("train"),
    unit: z.string(),
    count,
    rally: TaskTargetSchema.optional(),
    at: z.string().optional(),
  }),
  z.strictObject({
    ...base,
    do: z.literal("build"),
    building: z.string(),
    builder: BuilderSchema.optional(),
    builders: count,
    then: TaskTargetSchema.optional(),
    nearManor: z.boolean().optional(),
  }),
  z.strictObject({
    ...base,
    do: z.literal("research"),
    research: z.string(),
    at: z.string().optional(),
  }),
  z.strictObject({
    ...base,
    do: z.literal("age"),
    to: AgeSchema.exclude(["archaic"]),
    minor: z.string(),
  }),
  z.strictObject({
    ...base,
    do: z.literal("move"),
    count: z.number().int().positive(),
    from: TaskTargetSchema,
    to: TaskTargetSchema,
    unit: z.string().optional(),
  }),
  z.strictObject({
    ...base,
    do: z.literal("power"),
    power: z.string(),
    target: z.string().optional(),
  }),
  z.strictObject({ ...base, do: z.literal("timeShift"), building: z.string() }),
  z.strictObject({ ...base, do: z.literal("promote"), unit: z.string(), count }),
  z.strictObject({
    ...base,
    do: z.literal("autoTrain"),
    unit: z.string(),
    rally: TaskTargetSchema.optional(),
    at: z.string().optional(),
  }),
  z.strictObject({ ...base, do: z.literal("stopAutoTrain"), unit: z.string().optional() }),
  z.strictObject({
    ...base,
    do: z.literal("trainWhenAffordable"),
    unit: z.string(),
    from: z.string().optional(),
    rally: TaskTargetSchema.optional(),
  }),
  z.strictObject({
    ...base,
    do: z.literal("stopTrainWhenAffordable"),
    unit: z.string().optional(),
  }),
  z.strictObject({
    ...base,
    do: z.literal("event"),
    lose: z.record(z.string(), z.number().int().positive()).optional(),
    gainFavor: z.number().positive().optional(),
    gainResource: CostSchema.optional(),
    text: LocalizedTextSchema.optional(),
  }),
]);
export type Action = z.infer<typeof ActionSchema>;
export type ActionKind = Action["do"];
export const ACTION_KINDS: ActionKind[] = [
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

export const SettingsSchema = z.strictObject({
  efficiency: z.number().positive().max(1.5).optional(),
  tick: z.number().positive().max(5).optional(),
  foodChain: z.array(SourceIdSchema).min(1).optional(),
  /** Favor/min per Atlantean Oracle (before the hero multiplier). */
  oracleRate: z.number().nonnegative().optional(),
  norseFavorPerMinute: z.number().nonnegative().optional(),
  popReservedAt: z.enum(["start", "end"]).optional(),
  affordableWindow: z.number().nonnegative().optional(),
  /** Override the amount of each source (e.g. a bigger hunt). */
  sourceAmounts: z.partialRecord(SourceIdSchema, z.number().positive()).optional(),
  /** Seconds to simulate after the last action; default 30. */
  tail: z.number().nonnegative().optional(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const MatchupSchema = z.strictObject({
  god: z.string(),
  fit: z.enum(["good", "neutral", "bad"]),
  why: LocalizedTextSchema.optional(),
});
export type Matchup = z.infer<typeof MatchupSchema>;

export const MilestoneSchema = z.strictObject({
  id: z.string(),
  atAction: z.string(),
  /** Start (click) or completion of the referenced action. */
  on: z.enum(["start", "end"]).optional(),
  label: LocalizedTextSchema.optional(),
});

export const BuildSchema = z.object({
  format: z.literal(BUILD_FORMAT),
  version: z.literal(BUILD_VERSION),
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  author: z.string().max(80).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  pantheon: PantheonIdSchema,
  god: z.string(),
  type: BuildTypeSchema,
  objective: LocalizedTextSchema.partial().optional(),
  /** Where the build ends (an attack, an age, a unit…); the rest of the game is up to the player. */
  end: LocalizedTextSchema.partial().optional(),
  settings: SettingsSchema.optional(),
  milestones: z.array(MilestoneSchema).optional(),
  matchups: z.array(MatchupSchema).optional(),
  refs: z.array(z.strictObject({ name: z.string(), url: z.string() })).optional(),
  actions: z.array(ActionSchema),
});
export type Build = z.infer<typeof BuildSchema>;

export const BuildFileSchema = z.strictObject({
  format: z.literal(BUILD_FORMAT),
  version: z.number().int().positive(),
  builds: z.array(z.unknown()),
});
