import type { Age, Cost, LocalizedText, ResourceId, SourceId } from "../data/schema.ts";
import type { TaskTarget, TrainMode } from "./build.ts";

export type WarningLevel = "info" | "delay" | "error";
export type Params = Record<string, string | number>;

/** Resources paid by an action (or a rule's action) at time t. */
export type Spend = { t: number; action?: number; cost: Cost };

/** Why a delay happened: when the wait began and, for missing resources, the numbers. */
export type WaitDetail = {
  since: number;
  resource?: ResourceId;
  /** What the action costs in that resource. */
  need?: number;
  /** Stock when the wait began. */
  have?: number;
  /** Other spends of that resource during the wait. */
  spent?: Spend[];
  /** Earlier reasons of the same wait, when it changed (e.g. queue busy, then no food). */
  phases?: { t: number; key: string; params: Params }[];
};

export type SimWarning = {
  t: number;
  level: WarningLevel;
  key: string;
  params: Params;
  action?: number;
  detail?: WaitDetail;
};

export type BuilderRef =
  | { kind: "new"; unit: string }
  | { kind: "from"; unit: string; from: TaskTarget }
  | { kind: "same"; unit: string }
  | { kind: "unit"; unit: string };

export type SimEvent = { t: number; action?: number } & (
  | { kind: "trainStart"; unit: string; count: number; rally?: TaskTarget; summon?: boolean }
  | { kind: "unitReady"; unit: string; count: number; to?: ResourceId | "idle" }
  | { kind: "buildStart"; building: string; by: BuilderRef; then?: TaskTarget }
  | { kind: "buildDone"; building: string; builderTo?: ResourceId | "idle"; builderUnit?: string }
  | { kind: "researchStart"; research: string }
  | { kind: "researchDone"; research: string }
  | { kind: "ageStart"; age: Age; minor: string }
  | { kind: "ageDone"; age: Age; minor: string; free: Record<string, number> }
  | { kind: "move"; count: number; unit: string; from: TaskTarget; to: TaskTarget }
  | { kind: "power"; power: string; target?: string }
  | { kind: "timeShiftStart"; building: string; duration: number }
  | { kind: "timeShiftDone"; building: string }
  | { kind: "promote"; unit: string; to: string; count: number }
  | { kind: "empower"; unit: string; building: string }
  | { kind: "hunted"; unit: string; food: number }
  | { kind: "trainOn"; mode: TrainMode; unit: string; rally?: TaskTarget }
  | { kind: "trainOff"; unit: string }
  | { kind: "rally"; unit: string; to: TaskTarget }
  | { kind: "lose"; units: Record<string, number> }
  | { kind: "gain"; cost: Cost }
  | { kind: "note"; text: string }
  /** `count` workers (mostly `unit`) were on it and go to `next` (or idle). */
  | { kind: "sourceDepleted"; source: SourceId; next?: SourceId; count: number; unit: string }
);
export type EventKind = SimEvent["kind"];

export type Allocation = Record<ResourceId, number> & { idle: number; build: number; busy: number };

export type Snapshot = {
  t: number;
  age: Age;
  resources: Record<ResourceId, number>;
  pop: number;
  popCap: number;
  alloc: Allocation;
};

export type ActionOutcome = {
  index: number;
  status: "pending" | "active" | "done" | "blocked";
  startedAt?: number;
  completedAt?: number;
  waited: number;
};

export type MilestoneResult = {
  id: string;
  action: number;
  t?: number;
  resources?: Record<ResourceId, number>;
  label?: LocalizedText;
};

/** Something occupying a building over time (training, research, age up, construction, Time Shift). */
export type ProductionSpan = {
  lane: number;
  kind: "unit" | "research" | "age" | "build" | "shift";
  id: string;
  minor?: string;
  start: number;
  /** Absent when still running at the end of the simulation. */
  end?: number;
  /** A finished unit waiting inside the building for population room, from this time. */
  held?: number;
  action?: number;
};

/** One building instance, in the order it was placed. */
export type ProductionLane = { uid: number; building: string; n: number; initial: boolean };

export type SimResult = {
  events: SimEvent[];
  warnings: SimWarning[];
  series: Snapshot[];
  actions: ActionOutcome[];
  milestones: MilestoneResult[];
  ageTimes: Partial<Record<Age, { clicked: number; reached?: number }>>;
  produced: { t: number; unit: string; action?: number; rule?: number }[];
  production: { lanes: ProductionLane[]; spans: ProductionSpan[] };
  /** Last moment of the simulation (the build end plus the `tail`). */
  endTime: number;
  /** When every action is done: the build ends here; what follows is only context. */
  buildEnd: number;
};
