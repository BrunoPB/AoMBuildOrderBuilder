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
export const BUILD_VERSION = 5;

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
  /** After another action finishes (default) or, with `on: "start"`, after it starts. */
  z.strictObject({
    after: z.string(),
    on: z.literal("start").optional(),
    delay: z.number().nonnegative().optional(),
  }),
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
  /** A non-gathering unit that can build (e.g. Norse infantry); it returns to the army after. */
  z.strictObject({ unit: z.string() }),
]);
export type Builder = z.infer<typeof BuilderSchema>;

const count = z.number().int().positive().optional();

/** `auto` = the building's auto queue (trains whenever it is free and the stock pays, for
 *  `duration` seconds). Without a mode a train action trains `count` units. */
export const TrainModeSchema = z.enum(["auto"]);
export type TrainMode = z.infer<typeof TrainModeSchema>;

export const ActionSchema = z.discriminatedUnion("do", [
  z.strictObject({
    ...base,
    do: z.literal("train"),
    unit: z.string(),
    count,
    mode: TrainModeSchema.optional(),
    /** `auto`: the queue stops at this time (m:ss); without it, it runs to the end. */
    /** `auto`: seconds the queue stays on, from when the action starts; none = to the end. */
    duration: z.number().positive().optional(),
    /** Version 4 end time (m:ss), kept until the editor turns it into `duration`. */
    until: z.string().refine(isClock, "expected m:ss").optional(),
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
    /** Kronos: how many Manors are within range of this building (default 1 once a Manor exists). */
    manors: z.number().int().min(0).max(8).optional(),
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
  /** Egyptian Pharaoh/Priest boosts one building (`slot` picks which Pharaoh/Priest). */
  z.strictObject({
    ...base,
    do: z.literal("empower"),
    by: z.string(),
    building: z.string(),
    slot: z.number().int().positive().optional(),
  }),
  /** Set's Pharaoh summons Animals of Set; `hunt` kills them for their food. */
  z.strictObject({
    ...base,
    do: z.literal("summon"),
    unit: z.string(),
    count,
    hunt: z.boolean().optional(),
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
  "empower",
  "summon",
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
