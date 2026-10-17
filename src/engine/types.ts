import type { Age, Cost, LocalizedText, ResourceId, SourceId } from "../data/schema.ts";
import type { TaskTarget } from "./build.ts";

export type WarningLevel = "info" | "delay" | "error";
export type Params = Record<string, string | number>;

export type SimWarning = {
  t: number;
  level: WarningLevel;
  key: string;
  params: Params;
  action?: number;
};

export type BuilderRef =
  | { kind: "new"; unit: string }
  | { kind: "from"; unit: string; from: TaskTarget }
  | { kind: "same"; unit: string };

export type SimEvent = { t: number; action?: number } & (
  | { kind: "trainStart"; unit: string; count: number; rally?: TaskTarget }
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
  | { kind: "autoTrainOn"; unit: string; rally?: TaskTarget }
  | { kind: "autoTrainOff"; unit?: string }
  | { kind: "affordableOn"; unit: string }
  | { kind: "affordableOff"; unit?: string }
  | { kind: "lose"; units: Record<string, number> }
  | { kind: "gain"; cost: Cost }
  | { kind: "note"; text: string }
  | { kind: "sourceDepleted"; source: SourceId; next?: SourceId }
);
export type EventKind = SimEvent["kind"];

export type Allocation = Record<ResourceId, number> & { idle: number; build: number };

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

export type SimResult = {
  events: SimEvent[];
  warnings: SimWarning[];
  series: Snapshot[];
  actions: ActionOutcome[];
  milestones: MilestoneResult[];
  ageTimes: Partial<Record<Age, { clicked: number; reached?: number }>>;
  produced: { t: number; unit: string; action?: number; rule?: number }[];
  endTime: number;
};
