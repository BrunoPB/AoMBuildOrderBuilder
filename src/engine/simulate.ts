import type { GameData, PantheonIndex } from "../data/load.ts";
import {
  AGES,
  type Age,
  type Building,
  type Cost,
  type MajorGod,
  type Meta,
  type Modifier,
  type Power,
  RESOURCE_IDS,
  type ResourceId,
  type SourceId,
  type Unit,
} from "../data/schema.ts";
import type { Action, Build, TaskTarget, TrainMode } from "./build.ts";
import { applyCostModifiers, applyModifiers, type ModContext } from "./modifiers.ts";
import { parseClock } from "./time.ts";
import type {
  ActionOutcome,
  Allocation,
  BuilderRef,
  MilestoneResult,
  Params,
  ProductionLane,
  ProductionSpan,
  SimEvent,
  SimResult,
  SimWarning,
  Snapshot,
  Spend,
  WaitDetail,
  WarningLevel,
} from "./types.ts";

const EPS = 1e-6;
const GATHER: ResourceId[] = ["food", "wood", "gold"];
type AgeTo = Exclude<Age, "archaic">;

type Task =
  | { kind: "gather"; source: SourceId }
  | { kind: "favor" }
  | { kind: "idle" }
  | { kind: "build"; site: number }
  | { kind: "busy"; resume: Task };

type Worker = {
  uid: number;
  unit: string;
  task: Task;
  origin?: number;
  claimable: boolean;
  lastTarget: TaskTarget;
  builtFor?: number;
  /** A soldier borrowed from the army to build; goes back to `others` when done. */
  army?: boolean;
};

type Job =
  | {
      kind: "unit";
      unit: string;
      remaining: number;
      pop: number;
      action?: number;
      rule?: number;
      rally?: TaskTarget;
      heldSince?: number;
      span?: number;
      split?: boolean;
      hunt?: boolean;
    }
  | { kind: "research"; research: string; remaining: number; action: number; span?: number }
  | {
      kind: "age";
      age: AgeTo;
      minor: string;
      remaining: number;
      action: number;
      span?: number;
    };

type Site = {
  uid: number;
  def: Building;
  state: "building" | "ready" | "shifting";
  progress: number;
  time: number;
  speedMul: number;
  builders: number[];
  then?: TaskTarget;
  action?: number;
  initial: boolean;
  shiftUntil?: number;
  shiftAction?: number;
  span?: number;
  shiftSpan?: number;
  /** A unit acting as a production building (Set's Pharaoh summoning). */
  virtual?: boolean;
  jobs: Job[];
  slots: number;
};

type Reason = {
  key: string;
  level: WarningLevel;
  params: Params;
  detail?: Omit<WaitDetail, "since">;
};

type ActionState = {
  status: ActionOutcome["status"];
  startedAt?: number;
  completedAt?: number;
  blockedSince?: number;
  reason?: Reason;
  /** Reason and stock when the current kind of wait began. */
  first?: { reason: Reason; t: number; have: Record<ResourceId, number> };
  phases: { t: number; key: string; params: Params }[];
  reported: Set<string>;
  waited: number;
  left: number;
  open: number;
  site?: number;
};

type Rule = {
  action: number;
  mode: TrainMode;
  unit: string;
  rally?: TaskTarget;
  at?: string;
  active: boolean;
  cappedSince?: number;
  errorReported?: boolean;
};

type Promotion = {
  at: number;
  to: string;
  workers: number[];
  others: number;
  from: string;
  action: number;
};

export type ResolvedSettings = {
  efficiency: number;
  tick: number;
  foodChain: SourceId[];
  oracleRate?: number;
  norseFavorPerMinute: number;
  popReservedAt: "start" | "end";
  affordableWindow: number;
  sourceAmounts: Partial<Record<SourceId, number>>;
  tail: number;
};

export function resolveSettings(build: Build, data: GameData): ResolvedSettings {
  const d = data.common.defaults;
  const s = build.settings ?? {};
  return {
    efficiency: s.efficiency ?? d.efficiency,
    tick: s.tick ?? d.tick,
    foodChain: s.foodChain ?? d.foodChain,
    oracleRate: s.oracleRate,
    norseFavorPerMinute: s.norseFavorPerMinute ?? d.norseFavorPerMinute,
    popReservedAt: s.popReservedAt ?? d.popReservedAt,
    affordableWindow: s.affordableWindow ?? d.affordableWindow,
    sourceAmounts: s.sourceAmounts ?? {},
    tail: s.tail ?? 30,
  };
}

function round(v: number, digits = 3): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

function addCost(a: Cost, b: Cost, times = 1): Cost {
  const out: Cost = { ...a };
  for (const [r, v] of Object.entries(b) as [ResourceId, number][])
    out[r] = (out[r] ?? 0) + v * times;
  return out;
}

function lowConfidence(entity: {
  meta: Meta;
  fieldMeta?: Record<string, Meta> | undefined;
}): boolean {
  if (entity.meta.confidence === "low") return true;
  return Object.values(entity.fieldMeta ?? {}).some((m) => m.confidence === "low");
}

/** Units with a gather rate act as workers; others (e.g. Norse infantry) stay in the army count. */
function isGatherer(def: Unit | undefined): boolean {
  return Object.keys(def?.worker?.gatherRates ?? {}).length > 0;
}

class Simulation {
  readonly p: PantheonIndex;
  readonly god: MajorGod;
  readonly s: ResolvedSettings;
  t = 0;
  res: Record<ResourceId, number> = { food: 0, wood: 0, gold: 0, favor: 0 };
  workers: Worker[] = [];
  others = new Map<string, number>();
  sites: Site[] = [];
  researched = new Set<string>();
  age: Age = "archaic";
  minors: string[] = [];
  agingTo?: { age: AgeTo; minor: string };
  powerUses = new Map<string, number>();
  powerReady = new Map<string, number>();
  effects: { mods: Modifier[]; trickle?: Cost; until: number }[] = [];
  remaining = new Map<SourceId, number>();
  promotions: Promotion[] = [];
  rules: Rule[] = [];
  claims = new Set<number>();
  events: SimEvent[] = [];
  warnings: SimWarning[] = [];
  series: Snapshot[] = [];
  produced: { t: number; unit: string; action?: number; rule?: number }[] = [];
  spans: ProductionSpan[] = [];
  /** Empowered buildings: "<unit>#<slot>" → site and strength. */
  empowered = new Map<string, { site: number; strength: number }>();

  openSpan(site: Site, span: Omit<ProductionSpan, "lane" | "start">): number {
    this.spans.push({ ...span, lane: site.uid, start: round(this.t) });
    return this.spans.length - 1;
  }

  closeSpan(index: number | undefined, held?: number): void {
    const span = index === undefined ? undefined : this.spans[index];
    if (!span) return;
    span.end = round(this.t);
    if (held !== undefined) span.held = round(held);
  }
  states: ActionState[];
  idIndex = new Map<string, number>();
  ageTimes: SimResult["ageTimes"] = {};
  uid = 0;
  idleSince?: number;
  /** Action being run (or whose rule is running), credited with what gets paid. */
  acting?: number;
  spends: Spend[] = [];
  modsCache?: Modifier[];

  constructor(
    readonly data: GameData,
    readonly build: Build,
  ) {
    const p = data.pantheons.get(build.pantheon);
    if (!p) throw new Error(`pantheon "${build.pantheon}" has no data`);
    const god = data.gods.get(build.god);
    if (!god || god.pantheon !== build.pantheon) {
      throw new Error(`god "${build.god}" is not a ${build.pantheon} major god`);
    }
    this.p = p;
    this.god = god;
    this.s = resolveSettings(build, data);
    this.states = build.actions.map(() => ({
      status: "pending",
      reported: new Set<string>(),
      phases: [],
      waited: 0,
      left: 0,
      open: 0,
    }));
    build.actions.forEach((a, i) => {
      if (a.id) this.idIndex.set(a.id, i);
    });
    for (const [id, source] of data.sources) {
      this.remaining.set(id, this.s.sourceAmounts[id] ?? source.defaultAmount);
    }
    this.setupStart();
  }

  // ---------- setup ----------

  setupStart(): void {
    const start = this.p.def.start;
    const extras = this.god.startExtras ?? {};
    this.res = { food: 0, wood: 0, gold: 0, favor: 0 };
    for (const r of RESOURCE_IDS) {
      this.res[r] = (start.resources[r] ?? 0) + (extras.resources?.[r] ?? 0);
    }
    const units = { ...start.units, ...extras.units };
    for (const [u, n] of Object.entries(units)) {
      for (let i = 0; i < n; i++) this.spawn(u, "idle");
    }
    const summon = this.p.def.summon;
    const summoner = summon && this.unit(summon.by);
    if (summon && summoner && summon.gods.includes(this.god.id)) {
      const def: Building = {
        id: summon.by,
        name: summoner.name,
        icon: summoner.icon,
        pantheon: summoner.pantheon,
        cost: {},
        buildTime: 0,
        age: "archaic",
        trains: summon.units,
        meta: summon.meta,
      };
      this.sites.push({ ...this.newSite(def, "ready", true), virtual: true });
    }
    const buildings = start.buildings ?? { [this.p.def.townCenter]: 1 };
    for (const [b, n] of Object.entries(buildings)) {
      const def = this.p.buildings.get(b);
      if (!def) continue;
      for (let i = 0; i < n; i++) this.sites.push(this.newSite(def, "ready", true));
    }
  }

  newSite(def: Building, state: Site["state"], initial: boolean): Site {
    return {
      uid: ++this.uid,
      def,
      state,
      progress: state === "ready" ? 1 : 0,
      time: def.buildTime,
      speedMul: 1,
      builders: [],
      initial,
      jobs: [],
      slots: def.trainQueues ?? 1,
    };
  }

  // ---------- lookups ----------

  unit(id: string): Unit | undefined {
    return this.p.units.get(id);
  }

  mods(): Modifier[] {
    if (this.modsCache) return this.modsCache;
    const list: Modifier[] = [...this.god.modifiers];
    for (const m of this.minors) list.push(...(this.data.minors.get(m)?.modifiers ?? []));
    for (const r of this.researched) list.push(...(this.p.researches.get(r)?.effects ?? []));
    for (const e of this.effects) list.push(...e.mods);
    this.modsCache = list;
    return list;
  }

  dirty(): void {
    this.modsCache = undefined;
  }

  hasBuilding(id: string): boolean {
    return this.sites.some((s) => s.def.id === id && s.state !== "building");
  }

  ageIndex(age: Age): number {
    return AGES.indexOf(age);
  }

  popUsed(): number {
    let pop = 0;
    for (const w of this.workers) pop += this.unitPop(this.unit(w.unit));
    for (const [u, n] of this.others) pop += this.unitPop(this.unit(u)) * n;
    return pop;
  }

  unitPop(def: Unit | undefined): number {
    if (!def) return 0;
    return Math.max(0, applyModifiers(def.pop, "pop", this.mods(), { id: def.id, tags: def.tags }));
  }

  popReserved(): number {
    if (this.s.popReservedAt !== "start") return 0;
    let pop = 0;
    for (const site of this.sites) for (const j of site.jobs) if (j.kind === "unit") pop += j.pop;
    return pop;
  }

  popCap(): number {
    const mods = this.mods();
    let cap = this.p.def.start.popCap + (this.god.startExtras?.popCap ?? 0);
    for (const site of this.sites) {
      if (site.initial || site.state === "building" || !site.def.popCap) continue;
      cap += applyModifiers(site.def.popCap, "popCap", mods, {
        id: site.def.id,
        tags: site.def.tags,
      });
    }
    for (const m of mods) {
      if (m.target === "popCap" && !m.scope && m.op === "add") cap += m.value;
    }
    return cap;
  }

  unitCount(id: string): number {
    return this.workers.filter((w) => w.unit === id).length + (this.others.get(id) ?? 0);
  }

  // ---------- tasks ----------

  sourceResource(source: SourceId): ResourceId {
    return this.data.sources.get(source)?.resource ?? "food";
  }

  available(source: SourceId): boolean {
    const def = this.data.sources.get(source);
    if (!def) return false;
    return (
      def.infinite === true || (this.remaining.get(source) ?? 0) > EPS || !this.depletes(source)
    );
  }

  depletes(source: SourceId): boolean {
    const def = this.data.sources.get(source);
    if (!def || def.infinite) return false;
    return def.fallback !== undefined || this.s.foodChain.includes(source);
  }

  nextSource(source: SourceId): SourceId | undefined {
    const chain = this.s.foodChain;
    const i = chain.indexOf(source);
    if (i >= 0) return chain.slice(i + 1).find((s) => this.available(s));
    let next = this.data.sources.get(source)?.fallback;
    const seen = new Set<SourceId>();
    while (next && !this.available(next) && !seen.has(next)) {
      seen.add(next);
      next = this.data.sources.get(next)?.fallback;
    }
    return next && this.available(next) ? next : undefined;
  }

  resolveTask(target: TaskTarget, worker?: Unit): Task {
    if (target === "idle") return { kind: "idle" };
    if (target === "favor") {
      return this.p.def.favor.type === "templeWorkers" ? { kind: "favor" } : { kind: "idle" };
    }
    let source: SourceId | undefined;
    if (target === "food") source = this.s.foodChain.find((s) => this.available(s));
    else source = target;
    if (source && !this.available(source)) source = this.nextSource(source);
    if (!source) return { kind: "idle" };
    if (worker?.worker && worker.worker.gatherRates[source] === undefined) {
      this.warn("info", "warn.cannotGather", { unit: worker.id, source });
    }
    return { kind: "gather", source };
  }

  matches(w: Worker, target: TaskTarget): boolean {
    const task = w.task;
    if (target === "idle") return task.kind === "idle";
    if (target === "favor") return task.kind === "favor";
    if (task.kind !== "gather") return false;
    if (target === "food" || target === "wood" || target === "gold") {
      return this.sourceResource(task.source) === target;
    }
    return task.source === target;
  }

  assign(w: Worker, target: TaskTarget): void {
    w.lastTarget = target;
    w.task = this.resolveTask(target, this.unit(w.unit));
  }

  targetResource(target: TaskTarget): ResourceId | "idle" {
    if (target === "idle") return "idle";
    if (target === "food" || target === "wood" || target === "gold" || target === "favor")
      return target;
    return this.sourceResource(target);
  }

  // ---------- units ----------

  spawn(unitId: string, rally: TaskTarget | undefined, origin?: number): void {
    const def = this.unit(unitId);
    if (isGatherer(def)) {
      const w: Worker = {
        uid: ++this.uid,
        unit: unitId,
        task: { kind: "idle" },
        origin,
        claimable: origin !== undefined,
        lastTarget: rally ?? "idle",
      };
      this.assign(w, rally ?? (origin === undefined ? "idle" : "food"));
      this.workers.push(w);
    } else {
      this.others.set(unitId, (this.others.get(unitId) ?? 0) + 1);
    }
  }

  removeUnits(unitId: string, n: number): number {
    let removed = 0;
    const order = [...this.workers].reverse().sort((a, b) => {
      const rank = (w: Worker) => (w.task.kind === "idle" ? 0 : w.task.kind === "build" ? 2 : 1);
      return rank(a) - rank(b);
    });
    for (const w of order) {
      if (removed >= n) break;
      if (w.unit !== unitId) continue;
      this.workers = this.workers.filter((x) => x !== w);
      for (const site of this.sites) site.builders = site.builders.filter((b) => b !== w.uid);
      removed++;
    }
    const have = this.others.get(unitId) ?? 0;
    const take = Math.min(have, n - removed);
    if (take > 0) {
      this.others.set(unitId, have - take);
      removed += take;
    }
    return removed;
  }

  // ---------- warnings & events ----------

  warn(level: WarningLevel, key: string, params: Params, action?: number): void {
    this.warnings.push({ t: round(this.t), level, key, params, action });
  }

  emit(event: SimEvent): void {
    this.events.push({ ...event, t: round(this.t) });
  }

  // ---------- requirements ----------

  requirement(ids: string[] | undefined, age: Age): Reason | null {
    if (this.ageIndex(this.age) < this.ageIndex(age)) {
      const pending = this.agingTo && this.ageIndex(this.agingTo.age) >= this.ageIndex(age);
      return pending
        ? { key: "warn.waitingRequirement", level: "delay", params: { req: `age:${age}` } }
        : { key: "warn.missingRequirement", level: "error", params: { req: `age:${age}` } };
    }
    const minorReqs = (ids ?? []).filter((id) => this.data.minors.has(id));
    if (minorReqs.length > 0 && !minorReqs.some((id) => this.requirementOne(id) === null)) {
      return (
        minorReqs.map((id) => this.requirementOne(id)!).find((r) => r.level === "delay") ??
        this.requirementOne(minorReqs[0]!)
      );
    }
    for (const id of ids ?? []) {
      if (this.data.minors.has(id)) continue;
      const r = this.requirementOne(id);
      if (r) return r;
    }
    return null;
  }

  requirementOne(id: string): Reason | null {
    const missing = (inProgress: boolean): Reason =>
      inProgress
        ? { key: "warn.waitingRequirement", level: "delay", params: { req: id } }
        : { key: "warn.missingRequirement", level: "error", params: { req: id } };
    if (this.data.gods.has(id)) return id === this.god.id ? null : missing(false);
    if (this.data.minors.has(id)) {
      if (this.minors.includes(id)) return null;
      return missing(this.agingTo?.minor === id);
    }
    if (this.p.buildings.has(id)) {
      if (this.hasBuilding(id)) return null;
      return missing(this.sites.some((s) => s.def.id === id));
    }
    if (this.p.researches.has(id)) {
      if (this.researched.has(id)) return null;
      return missing(
        this.sites.some((s) => s.jobs.some((j) => j.kind === "research" && j.research === id)),
      );
    }
    if (this.p.units.has(id)) {
      if (this.unitCount(id) > 0) return null;
      return missing(
        this.sites.some((s) => s.jobs.some((j) => j.kind === "unit" && j.unit === id)),
      );
    }
    return { key: "warn.unknownId", level: "error", params: { id } };
  }

  // ---------- costs ----------

  afford(cost: Cost, reserved: Cost = {}): ResourceId | null {
    for (const [r, v] of Object.entries(cost) as [ResourceId, number][]) {
      if (this.res[r] - (reserved[r] ?? 0) + EPS < v) return r;
    }
    return null;
  }

  pay(cost: Cost, action = this.acting): void {
    for (const [r, v] of Object.entries(cost) as [ResourceId, number][]) {
      this.res[r] = Math.max(0, this.res[r] - v);
    }
    if (Object.values(cost).some((v) => v)) this.spends.push({ t: round(this.t), action, cost });
  }

  unitCost(def: Unit): Cost {
    return applyCostModifiers(def.cost, this.mods(), { id: def.id, tags: def.tags });
  }

  noResource(cost: Cost, missing: ResourceId, reserved: Cost = {}): Reason {
    const need = Math.ceil((cost[missing] ?? 0) - (this.res[missing] - (reserved[missing] ?? 0)));
    return {
      key: "warn.noResource",
      level: "delay",
      params: { resource: missing, missing: need },
      detail: {
        resource: missing,
        need: cost[missing] ?? 0,
        reserved: Math.max(0, reserved[missing] ?? 0),
      },
    };
  }

  actionCost(a: Action, st: ActionState): Cost {
    const mods = this.mods();
    switch (a.do) {
      case "train": {
        const def = this.unit(a.unit);
        if (!def || a.mode) return {};
        const left = st.status === "pending" ? (a.count ?? 1) : st.left;
        return addCost({}, this.unitCost(def), left);
      }
      case "build": {
        const def = this.p.buildings.get(a.building);
        return def ? applyCostModifiers(def.cost, mods, { id: def.id, tags: def.tags }) : {};
      }
      case "research": {
        const def = this.p.researches.get(a.research);
        return def ? applyCostModifiers(def.cost, mods, { id: def.id, tags: def.tags }) : {};
      }
      case "age":
        return this.p.ageUps.get(a.to)?.cost ?? {};
      case "power":
        return this.data.powers.get(a.power)?.cost ?? {};
      case "timeShift":
        return this.timeShiftCost(a.building);
      case "promote": {
        const def = this.unit(a.unit);
        return def?.promotion ? addCost({}, this.promotionCost(def), a.count ?? 1) : {};
      }
      default:
        return {};
    }
  }

  /** Costs of one-shot actions waiting now or due within the affordable window. */
  reserved(): Cost {
    let total: Cost = {};
    this.build.actions.forEach((a, i) => {
      const st = this.states[i]!;
      if (st.status === "done" || a.when === "always" || st.reason?.level === "error") return;
      if (st.status === "active" && !(a.do === "train" && st.left > 0)) return;
      const w = a.when;
      const due =
        this.eligible(i) ||
        (typeof w === "string" &&
          w !== "asap" &&
          parseClock(w) <= this.t + this.s.affordableWindow);
      if (due) total = addCost(total, this.actionCost(a, st));
    });
    return total;
  }

  // ---------- eligibility ----------

  eligible(i: number): boolean {
    const a = this.build.actions[i]!;
    const w = a.when;
    if (w === "always") return true;
    if (w === "asap") {
      if (i === 0) return true;
      const prev = this.states[i - 1]!;
      return prev.startedAt !== undefined || prev.status === "done";
    }
    if (typeof w === "string") return this.t + EPS >= parseClock(w);
    const target = this.idIndex.get(w.after);
    if (target === undefined) {
      this.report(i, { key: "warn.unknownAction", level: "error", params: { id: w.after } });
      return false;
    }
    const st = this.states[target]!;
    const at = w.on === "start" ? st.startedAt : st.completedAt;
    return at !== undefined && this.t + EPS >= at + (w.delay ?? 0);
  }

  report(i: number, reason: Reason): void {
    const st = this.states[i]!;
    const key = `${reason.key}:${JSON.stringify(reason.params)}`;
    if (reason.level === "error" && !st.reported.has(key)) {
      st.reported.add(key);
      this.warn("error", reason.key, reason.params, i);
    }
  }

  block(i: number, reason: Reason): void {
    const st = this.states[i]!;
    const escalated = st.reason?.level === "info" && reason.level !== "info";
    if (st.blockedSince === undefined || escalated) st.blockedSince = this.t;
    if (st.first?.reason.key !== reason.key) {
      st.first = { reason, t: this.t, have: { ...this.res } };
      if (reason.level !== "info") {
        st.phases.push({ t: round(this.t), key: reason.key, params: reason.params });
      }
    }
    st.reason = reason;
    if (reason.level === "error") {
      st.status = st.status === "pending" ? "blocked" : st.status;
      this.report(i, reason);
    }
  }

  unblock(i: number): void {
    const st = this.states[i]!;
    if (st.blockedSince !== undefined && st.reason) {
      const waited = round(this.t - st.blockedSince, 1);
      if (waited >= this.s.tick - EPS && st.reason.level !== "info") {
        st.waited += waited;
        const first = st.first?.reason.key === st.reason.key ? st.first : undefined;
        const since = round(first?.t ?? st.blockedSince);
        const d = first?.reason.detail;
        const detail: WaitDetail = { since };
        if (st.phases.length > 1) detail.phases = st.phases.slice(0, -1);
        if (d?.resource) {
          const r = d.resource;
          detail.resource = r;
          detail.need = round(d.need ?? 0, 1);
          detail.have = Math.floor(first!.have[r]);
          if (d.reserved) detail.reserved = Math.floor(d.reserved);
          detail.spent = this.spends.filter(
            (x) => x.t >= since && x.t <= this.t + EPS && x.action !== i && (x.cost[r] ?? 0) > 0,
          );
        }
        this.warnings.push({
          t: round(this.t),
          // asap has no planned time to miss: it starts when it can, so the wait is not a delay
          level: this.build.actions[i]!.when === "asap" ? "info" : "delay",
          key: st.reason.key,
          params: { ...(first ?? st).reason!.params, waited },
          action: i,
          detail,
        });
      }
    }
    st.blockedSince = undefined;
    st.reason = undefined;
    st.first = undefined;
    st.phases = [];
  }

  start(i: number): void {
    const st = this.states[i]!;
    this.unblock(i);
    if (st.startedAt === undefined) st.startedAt = round(this.t);
    if (st.status === "pending" || st.status === "blocked") st.status = "active";
  }

  complete(i: number): void {
    const st = this.states[i]!;
    st.status = "done";
    if (st.completedAt === undefined) st.completedAt = round(this.t);
  }

  flagLowConfidence(
    i: number,
    entity: { id: string; meta: Meta; fieldMeta?: Record<string, Meta> },
  ): void {
    const st = this.states[i]!;
    if (st.reported.has("lowconf") || !lowConfidence(entity)) return;
    st.reported.add("lowconf");
    this.warn("info", "warn.lowConfidenceData", { id: entity.id }, i);
  }

  // ---------- sites ----------

  trainSites(unit: Unit, at?: string): Site[] {
    return this.sites.filter(
      (s) =>
        (unit.trainedAt.includes(s.def.id) || s.def.trains?.includes(unit.id) === true) &&
        (!at || s.def.id === at),
    );
  }

  freeSite(candidates: Site[], prefer?: number, split = false): Site | Reason {
    if (candidates.length === 0) {
      return { key: "warn.noBuilding", level: "error", params: {} };
    }
    const ready = candidates.filter((s) => s.state === "ready");
    if (ready.length === 0)
      return {
        key: "warn.buildingNotReady",
        level: "delay",
        params: { building: candidates[0]!.def.id },
      };
    const free = ready
      .filter((s) => {
        if (this.claims.has(s.uid) && !split) return false;
        const sideJobs = s.jobs.filter((j) => j.kind === "unit" && j.split).length;
        return split ? sideJobs === 0 : s.jobs.length - sideJobs < s.slots;
      })
      .sort((a, b) => (a.uid === prefer ? -1 : b.uid === prefer ? 1 : a.uid - b.uid));
    if (free.length === 0)
      return { key: "warn.queueBusy", level: "delay", params: { building: ready[0]!.def.id } };
    return free[0]!;
  }

  claim(candidates: Site[]): void {
    const site = candidates.find((s) => s.state === "ready" && !this.claims.has(s.uid));
    if (site) this.claims.add(site.uid);
  }

  trainTime(def: Unit): number {
    return applyModifiers(def.trainTime, "trainTime", this.mods(), { id: def.id, tags: def.tags });
  }

  /** Try to start one unit of `def`; returns a blocking reason, or null when started. */
  tryTrain(
    def: Unit,
    opts: {
      at?: string;
      prefer?: number;
      action?: number;
      rule?: number;
      rally?: TaskTarget;
      reserved?: Cost;
      hunt?: boolean;
    },
  ): Reason | Site {
    const candidates = this.trainSites(def, opts.at);
    const excluded = this.excluded(def);
    if (excluded) return excluded;
    const req = this.requirement(def.requires, def.age);
    if (req) return req;
    const site = this.freeSite(candidates, opts.prefer, def.splitQueue === true);
    if (!("uid" in site)) return site;
    if (
      this.s.popReservedAt === "start" &&
      this.popUsed() + this.popReserved() + this.unitPop(def) > this.popCap() + EPS
    ) {
      this.claims.add(site.uid);
      return { key: "warn.popCapped", level: "delay", params: { unit: def.id } };
    }
    const cost = this.unitCost(def);
    const missing = this.afford(cost, opts.reserved);
    if (missing) {
      this.claims.add(site.uid);
      return this.noResource(cost, missing, opts.reserved);
    }
    this.pay(cost);
    const ruleAction = opts.rule !== undefined ? this.rules[opts.rule]?.action : undefined;
    site.jobs.push({
      kind: "unit",
      unit: def.id,
      remaining: this.trainTime(def),
      pop: this.unitPop(def),
      action: opts.action,
      rule: opts.rule,
      rally: opts.rally,
      split: def.splitQueue === true || undefined,
      hunt: opts.hunt || undefined,
      span: this.openSpan(site, { kind: "unit", id: def.id, action: opts.action ?? ruleAction }),
    });
    return site;
  }

  /** The selected major god does not have this unit/building/research. */
  excluded(def: { id: string; excludeGods?: string[] }): Reason | null {
    return def.excludeGods?.includes(this.god.id)
      ? { key: "warn.notForGod", level: "error", params: { id: def.id } }
      : null;
  }

  /** Strongest empower on a site, as a multiplier for `rate` (1 when not empowered). */
  empowerFactor(site: Site, rate: number): number {
    let strength = 0;
    for (const e of this.empowered.values())
      if (e.site === site.uid) strength = Math.max(strength, e.strength);
    return strength ? 1 + (rate - 1) * strength : 1;
  }

  /** Bonus on resources dropped at an empowered dropsite for this source. */
  dropsiteFactor(source: SourceId): number {
    const empower = this.p.def.empower;
    if (!empower || this.empowered.size === 0) return 1;
    let best = 1;
    for (const site of this.sites) {
      if (site.state === "building" || !site.def.dropsiteFor?.includes(source)) continue;
      best = Math.max(best, this.empowerFactor(site, empower.dropsiteRate));
    }
    return best;
  }

  jobFactor(site: Site, job: Job): number {
    const empower = this.p.def.empower;
    if (!empower || this.empowered.size === 0) return 1;
    if (job.kind !== "unit") return this.empowerFactor(site, empower.researchRate);
    if (empower.economicUnits.includes(job.unit)) return 1;
    return this.empowerFactor(site, empower.militaryTrainRate);
  }

  // ---------- powers ----------

  availablePowers(): Set<string> {
    const set = new Set(this.god.powers);
    for (const m of this.minors) for (const p of this.data.minors.get(m)?.powers ?? []) set.add(p);
    return set;
  }

  /** Building cost × the god's cost ratio for shifting it (Kronos: free or 50%). */
  timeShiftCost(buildingId: string): Cost {
    const rule = this.god.timeShift?.buildings.find((b) => b.id === buildingId);
    const def = this.p.buildings.get(buildingId);
    if (!rule || !def || rule.costRatio === 0) return {};
    const out: Cost = {};
    for (const [r, v] of Object.entries(def.cost) as [ResourceId, number][])
      out[r] = v * rule.costRatio;
    return out;
  }

  promotionCost(def: Unit): Cost {
    const mods = this.mods();
    const out: Cost = {};
    for (const [r, v] of Object.entries(def.promotion?.cost ?? {}) as [ResourceId, number][]) {
      const cost = applyModifiers(v, "promotionCost", mods, {
        id: def.id,
        tags: def.tags,
        resource: r,
      });
      out[r] = Math.max(0, round(cost));
    }
    return out;
  }

  timeShiftPower(): Power | undefined {
    const powers = [
      ...this.god.powers,
      ...this.minors.flatMap((m) => this.data.minors.get(m)?.powers ?? []),
    ];
    for (const id of powers) {
      const p = this.data.powers.get(id);
      if (p?.effect.kind === "timeShift") return p;
    }
    return undefined;
  }

  powerCheck(power: Power): Reason | null {
    if (!this.availablePowers().has(power.id)) {
      return { key: "warn.powerUnavailable", level: "error", params: { power: power.id } };
    }
    const used = this.powerUses.get(power.id) ?? 0;
    if (power.uses !== undefined && used >= power.uses) {
      return { key: "warn.powerNoUses", level: "error", params: { power: power.id } };
    }
    const ready = this.powerReady.get(power.id) ?? 0;
    if (this.t + EPS < ready) {
      return { key: "warn.powerCooldown", level: "delay", params: { power: power.id } };
    }
    const cost = power.cost ?? {};
    const missing = this.afford(cost);
    return missing ? this.noResource(cost, missing) : null;
  }

  usePower(power: Power): void {
    this.pay(power.cost ?? {});
    this.powerUses.set(power.id, (this.powerUses.get(power.id) ?? 0) + 1);
    if (power.cooldown) this.powerReady.set(power.id, this.t + power.cooldown);
  }

  // ---------- one-shot actions ----------

  runAction(i: number): void {
    this.acting = i;
    const a = this.build.actions[i]!;
    const st = this.states[i]!;
    switch (a.do) {
      case "train":
        return a.mode ? this.startRule(i, a, a.mode) : this.actTrain(i, a, st);
      case "build":
        return this.actBuild(i, a);
      case "research":
        return this.actResearch(i, a);
      case "age":
        return this.actAge(i, a);
      case "move":
        return this.actMove(i, a);
      case "power":
        return this.actPower(i, a);
      case "timeShift":
        return this.actTimeShift(i, a.building);
      case "promote":
        return this.actPromote(i, a);
      case "empower":
        return this.actEmpower(i, a);
      case "summon":
        return this.actTrain(i, a, this.states[i]!);
      case "stopTrain": {
        for (const r of this.rules) {
          if (r.active && (!a.mode || r.mode === a.mode) && (!a.unit || r.unit === a.unit))
            r.active = false;
        }
        this.start(i);
        this.complete(i);
        this.emit({ kind: "trainOff", mode: a.mode, unit: a.unit, action: i, t: this.t });
        return;
      }
      case "event":
        return this.actEvent(i, a);
    }
  }

  actTrain(
    i: number,
    a: Extract<Action, { do: "train" }> | Extract<Action, { do: "summon" }>,
    st: ActionState,
  ): void {
    const def = this.unit(a.unit);
    if (!def)
      return this.block(i, { key: "warn.unknownId", level: "error", params: { id: a.unit } });
    const summon = a.do === "summon";
    const at = summon ? this.p.def.summon?.by : a.at;
    const rally = summon ? undefined : a.rally;
    if (summon) {
      const rule = this.p.def.summon;
      if (!rule || !rule.gods.includes(this.god.id) || !rule.units.includes(def.id)) {
        return this.block(i, {
          key: "warn.cannotSummon",
          level: "error",
          params: { unit: def.id },
        });
      }
    }
    if (st.status === "pending" || st.status === "blocked") st.left = a.count ?? 1;
    this.flagLowConfidence(i, def);
    while (st.left > 0) {
      const result = this.tryTrain(def, {
        at,
        prefer: st.site,
        action: i,
        rally,
        hunt: summon ? a.hunt : undefined,
      });
      if (!("uid" in result)) {
        if (
          result.key !== "warn.queueBusy" ||
          st.startedAt === undefined ||
          st.site === undefined
        ) {
          this.block(i, result);
        } else {
          this.block(i, { ...result, level: "info" });
        }
        this.claim(this.trainSites(def, at));
        return;
      }
      st.site = result.uid;
      st.left--;
      st.open++;
      if (st.startedAt === undefined) {
        this.emit({
          kind: "trainStart",
          unit: def.id,
          count: a.count ?? 1,
          rally,
          summon: summon || undefined,
          action: i,
          t: this.t,
        });
      }
      this.start(i);
    }
  }

  canBuild(unitId: string, building: string): boolean {
    const def = this.unit(unitId);
    if (!def?.worker || def.worker.canBuild === false || def.tags.includes("ship")) return false;
    return !def.worker.builds || def.worker.builds.includes(building);
  }

  pickBuilders(i: number, a: Extract<Action, { do: "build" }>): Worker[] | Reason {
    const n = a.builders ?? 1;
    const free = (w: Worker) =>
      w.task.kind !== "build" && w.task.kind !== "busy" && this.canBuild(w.unit, a.building);
    const b = a.builder;
    if (b && "unit" in b) {
      if (!this.canBuild(b.unit, a.building)) {
        return {
          key: "warn.cannotBuild",
          level: "error",
          params: { unit: b.unit, building: a.building },
        };
      }
      if ((this.others.get(b.unit) ?? 0) < n) {
        return { key: "warn.noUnitToBuild", level: "delay", params: { unit: b.unit } };
      }
      return Array.from({ length: n }, () => ({
        uid: ++this.uid,
        unit: b.unit,
        task: { kind: "idle" } as Task,
        claimable: false,
        lastTarget: "idle" as TaskTarget,
        army: true,
      }));
    }
    if (b && "new" in b) {
      const target = this.idIndex.get(b.new);
      if (target === undefined)
        return { key: "warn.unknownAction", level: "error", params: { id: b.new } };
      const list = this.workers
        .filter((w) => w.origin === target && w.claimable && free(w))
        .reverse();
      if (list.length >= n) return list.slice(0, n);
      const done = this.states[target]!.status === "done";
      return done
        ? { key: "warn.noBuilder", level: "error", params: { id: b.new } }
        : { key: "warn.waitingBuilder", level: "info", params: { id: b.new } };
    }
    if (b && "same" in b) {
      const target = this.idIndex.get(b.same);
      if (target === undefined)
        return { key: "warn.unknownAction", level: "error", params: { id: b.same } };
      const list = this.workers.filter((w) => w.builtFor === target && free(w));
      if (list.length >= n) return list.slice(0, n);
      return { key: "warn.waitingBuilder", level: "info", params: { id: b.same } };
    }
    let from: TaskTarget[];
    if (b && "from" in b) from = [b.from];
    else {
      const counts = GATHER.map(
        (r) => [r, this.workers.filter((w) => this.matches(w, r)).length] as const,
      );
      from = ["idle", ...counts.sort((x, y) => y[1] - x[1]).map(([r]) => r)];
    }
    const list: Worker[] = [];
    for (const target of from) {
      for (const w of [...this.workers].reverse()) {
        if (list.length >= n) break;
        if (free(w) && this.matches(w, target) && !list.includes(w)) list.push(w);
      }
    }
    if (list.length >= n) return list;
    return {
      key: "warn.noWorker",
      level: "delay",
      params: { from: b && "from" in b ? b.from : "any" },
    };
  }

  actBuild(i: number, a: Extract<Action, { do: "build" }>): void {
    const def = this.p.buildings.get(a.building);
    if (!def)
      return this.block(i, { key: "warn.unknownId", level: "error", params: { id: a.building } });
    this.flagLowConfidence(i, def);
    const excluded = this.excluded(def);
    if (excluded) return this.block(i, excluded);
    const req = this.requirement(def.requires, def.age);
    if (req) return this.block(i, req);
    if (
      def.limit !== undefined &&
      this.sites.filter((s) => s.def.id === def.id).length >= def.limit
    ) {
      return this.block(i, {
        key: "warn.buildLimit",
        level: "error",
        params: { building: def.id },
      });
    }
    const builders = this.pickBuilders(i, a);
    if (!Array.isArray(builders)) return this.block(i, builders);
    const mods = this.mods();
    const cost = applyCostModifiers(def.cost, mods, { id: def.id, tags: def.tags });
    const missing = this.afford(cost);
    if (missing) return this.block(i, this.noResource(cost, missing));
    this.pay(cost);
    const site = this.newSite(def, "building", false);
    const manorsBuilt = this.sites.filter(
      (s) => s.def.id === "manor" && s.state !== "building",
    ).length;
    const manors = a.nearManor === false ? 0 : Math.min(a.manors ?? 1, manorsBuilt);
    const ctx: ModContext = { id: def.id, tags: def.tags, manors };
    site.time = applyModifiers(def.buildTime, "buildTime", mods, ctx);
    site.speedMul = applyModifiers(1, "buildRate", mods, ctx);
    site.then = a.then;
    site.action = i;
    const first = builders[0]!;
    const by: BuilderRef =
      a.builder && "new" in a.builder
        ? { kind: "new", unit: first.unit }
        : a.builder && "same" in a.builder
          ? { kind: "same", unit: first.unit }
          : a.builder && "unit" in a.builder
            ? { kind: "unit", unit: first.unit }
            : { kind: "from", unit: first.unit, from: this.taskTargetOf(first) };
    for (const w of builders) {
      if (w.army && !this.workers.includes(w)) {
        this.others.set(w.unit, (this.others.get(w.unit) ?? 0) - 1);
        this.workers.push(w);
      }
      if (w.task.kind === "gather" || w.task.kind === "favor") w.lastTarget = this.taskTargetOf(w);
      w.task = { kind: "build", site: site.uid };
      w.claimable = false;
      w.builtFor = i;
      site.builders.push(w.uid);
    }
    this.sites.push(site);
    site.span = this.openSpan(site, { kind: "build", id: def.id, action: i });
    this.start(i);
    this.emit({ kind: "buildStart", building: def.id, by, then: a.then, action: i, t: this.t });
  }

  taskTargetOf(w: Worker): TaskTarget {
    if (w.task.kind === "gather") return this.sourceResource(w.task.source);
    if (w.task.kind === "favor") return "favor";
    if (w.task.kind === "idle") return "idle";
    return w.lastTarget;
  }

  actResearch(i: number, a: Extract<Action, { do: "research" }>): void {
    const def = this.p.researches.get(a.research);
    if (!def)
      return this.block(i, { key: "warn.unknownId", level: "error", params: { id: a.research } });
    this.flagLowConfidence(i, def);
    const excluded = this.excluded(def);
    if (excluded) return this.block(i, excluded);
    if (this.researched.has(def.id)) {
      return this.block(i, {
        key: "warn.alreadyResearched",
        level: "error",
        params: { id: def.id },
      });
    }
    const req = this.requirement(def.requires, def.age);
    if (req) return this.block(i, req);
    const candidates = this.sites.filter((s) => s.def.id === (a.at ?? def.at));
    const site = this.freeSite(candidates);
    if (!("uid" in site)) return this.block(i, site);
    const mods = this.mods();
    const cost = applyCostModifiers(def.cost, mods, { id: def.id, tags: def.tags });
    const missing = this.afford(cost);
    if (missing) {
      this.claims.add(site.uid);
      return this.block(i, this.noResource(cost, missing));
    }
    this.pay(cost);
    const time = applyModifiers(def.time, "researchTime", mods, { id: def.id, tags: def.tags });
    site.jobs.push({
      kind: "research",
      research: def.id,
      remaining: time,
      action: i,
      span: this.openSpan(site, { kind: "research", id: def.id, action: i }),
    });
    this.start(i);
    this.emit({ kind: "researchStart", research: def.id, action: i, t: this.t });
  }

  actAge(i: number, a: Extract<Action, { do: "age" }>): void {
    const def = this.p.ageUps.get(a.to);
    if (!def)
      return this.block(i, {
        key: "warn.unknownId",
        level: "error",
        params: { id: `age:${a.to}` },
      });
    this.flagLowConfidence(i, { id: `age-${a.to}`, meta: def.meta, fieldMeta: def.fieldMeta });
    const minor = this.data.minors.get(a.minor);
    if (!minor || !this.god.minors[a.to].includes(a.minor)) {
      return this.block(i, {
        key: "warn.invalidMinor",
        level: "error",
        params: { minor: a.minor, age: a.to },
      });
    }
    const target = this.ageIndex(a.to);
    if (this.ageIndex(this.age) >= target) {
      return this.block(i, { key: "warn.alreadyInAge", level: "error", params: { age: a.to } });
    }
    if (this.agingTo || this.ageIndex(this.age) !== target - 1) {
      const pending = this.agingTo && this.ageIndex(this.agingTo.age) === target - 1;
      return this.block(i, {
        key: pending ? "warn.waitingRequirement" : "warn.missingRequirement",
        level: pending ? "delay" : "error",
        params: { req: `age:${AGES[target - 1]}` },
      });
    }
    if (def.requiresAnyOf && def.requiresAnyOf.length > 0) {
      const ok = def.requiresAnyOf.some((group) =>
        group.every((id) => this.requirementOne(id) === null),
      );
      if (!ok) {
        const pending = def.requiresAnyOf.some((group) =>
          group.every((id) => {
            const r = this.requirementOne(id);
            return r === null || r.level === "delay";
          }),
        );
        return this.block(i, {
          key: pending ? "warn.waitingRequirement" : "warn.missingRequirement",
          level: pending ? "delay" : "error",
          params: { req: def.requiresAnyOf.map((g) => g.join("+")).join("|") },
        });
      }
    }
    const site = this.freeSite(this.sites.filter((s) => s.def.id === def.at));
    if (!("uid" in site)) return this.block(i, site);
    const missing = this.afford(def.cost);
    if (missing) {
      this.claims.add(site.uid);
      return this.block(i, this.noResource(def.cost, missing));
    }
    this.pay(def.cost);
    const time = applyModifiers(def.time, "researchTime", this.mods(), {
      id: `age-${a.to}`,
      tags: ["age"],
    });
    site.jobs.push({
      kind: "age",
      age: a.to,
      minor: a.minor,
      remaining: time,
      action: i,
      span: this.openSpan(site, { kind: "age", id: a.to, minor: a.minor, action: i }),
    });
    this.agingTo = { age: a.to, minor: a.minor };
    this.ageTimes[a.to] = { clicked: round(this.t) };
    this.start(i);
    this.emit({ kind: "ageStart", age: a.to, minor: a.minor, action: i, t: this.t });
  }

  actMove(i: number, a: Extract<Action, { do: "move" }>): void {
    const picked: Worker[] = [];
    for (const w of [...this.workers].reverse()) {
      if (picked.length >= a.count) break;
      if (w.task.kind === "build") continue;
      if (a.unit && w.unit !== a.unit) continue;
      if (this.matches(w, a.from)) picked.push(w);
    }
    if (picked.length < a.count) {
      this.warn(
        "delay",
        "warn.notEnoughWorkers",
        { wanted: a.count, moved: picked.length, from: a.from },
        i,
      );
    }
    for (const w of picked) this.assign(w, a.to);
    this.start(i);
    this.complete(i);
    this.emit({
      kind: "move",
      count: picked.length,
      unit: picked[0]?.unit ?? a.unit ?? this.p.def.workers[0]!,
      from: a.from,
      to: a.to,
      action: i,
      t: this.t,
    });
  }

  actPower(i: number, a: Extract<Action, { do: "power" }>): void {
    const power = this.data.powers.get(a.power);
    if (!power)
      return this.block(i, { key: "warn.unknownId", level: "error", params: { id: a.power } });
    if (power.effect.kind === "timeShift") {
      if (!a.target)
        return this.block(i, {
          key: "warn.missingTarget",
          level: "error",
          params: { power: a.power },
        });
      return this.actTimeShift(i, a.target, power);
    }
    this.flagLowConfidence(i, power);
    const reason = this.powerCheck(power);
    if (reason) return this.block(i, reason);
    this.usePower(power);
    const effect = power.effect;
    if (effect.modifiers?.length || effect.trickle) {
      this.effects.push({
        mods: effect.modifiers ?? [],
        trickle: effect.trickle,
        until: this.t + (effect.duration ?? Infinity),
      });
      this.dirty();
    }
    for (const [r, v] of Object.entries(effect.grant ?? {}) as [ResourceId, number][])
      this.res[r] += v;
    for (const [u, n] of Object.entries(effect.spawn ?? {}))
      for (let k = 0; k < n; k++) this.spawn(u, "food");
    this.start(i);
    this.complete(i);
    this.emit({ kind: "power", power: power.id, target: a.target, action: i, t: this.t });
  }

  actTimeShift(i: number, buildingId: string, power = this.timeShiftPower()): void {
    const rules = this.god.timeShift;
    if (!rules) {
      return this.block(i, {
        key: "warn.powerUnavailable",
        level: "error",
        params: { power: "time-shift" },
      });
    }
    const rule = rules.buildings.find((b) => b.id === buildingId);
    if (!rule) {
      return this.block(i, {
        key: "warn.cannotTimeShift",
        level: "error",
        params: { building: buildingId },
      });
    }
    if (power) this.flagLowConfidence(i, power);
    const candidates = this.sites.filter((s) => s.def.id === buildingId);
    if (candidates.length === 0) {
      return this.block(i, {
        key: "warn.missingRequirement",
        level: "error",
        params: { req: buildingId },
      });
    }
    const site = [...candidates].reverse().find((s) => s.state === "ready" && s.jobs.length === 0);
    if (!site) {
      const building = candidates.some((s) => s.state === "ready");
      return this.block(i, {
        key: building ? "warn.queueBusy" : "warn.buildingNotReady",
        level: "delay",
        params: { building: buildingId },
      });
    }
    const shifting = this.sites.filter((s) => s.state === "shifting").length;
    if (shifting >= rules.maxConcurrent) {
      return this.block(i, {
        key: "warn.timeShiftLimit",
        level: "delay",
        params: { count: rules.maxConcurrent },
      });
    }
    const cost = this.timeShiftCost(buildingId);
    const missing = this.afford(cost);
    if (missing) return this.block(i, this.noResource(cost, missing));
    this.pay(cost);
    const duration = site.def.buildTime * rule.timeRatio;
    site.state = "shifting";
    site.shiftSpan = this.openSpan(site, { kind: "shift", id: site.def.id, action: i });
    site.shiftUntil = this.t + duration;
    site.shiftAction = i;
    this.start(i);
    this.emit({
      kind: "timeShiftStart",
      building: buildingId,
      duration: round(duration, 1),
      action: i,
      t: this.t,
    });
  }

  actEmpower(i: number, a: Extract<Action, { do: "empower" }>): void {
    const empower = this.p.def.empower;
    const source = empower?.sources.find(
      (s) => s.unit === a.by && (!s.gods || s.gods.includes(this.god.id)),
    );
    if (!empower || !source || !empower.targets.includes(a.building)) {
      return this.block(i, {
        key: "warn.cannotEmpower",
        level: "error",
        params: { unit: a.by, building: a.building },
      });
    }
    const slot = a.slot ?? 1;
    if (this.unitCount(a.by) < slot) {
      return this.block(i, { key: "warn.noUnitToEmpower", level: "delay", params: { unit: a.by } });
    }
    const site = [...this.sites].reverse().find((s) => s.def.id === a.building && !s.virtual);
    if (!site) {
      return this.block(i, {
        key: "warn.missingRequirement",
        level: "error",
        params: { req: a.building },
      });
    }
    this.empowered.set(`${a.by}#${slot}`, { site: site.uid, strength: source.strength });
    this.start(i);
    this.complete(i);
    this.emit({ kind: "empower", unit: a.by, building: a.building, action: i, t: this.t });
  }

  actPromote(i: number, a: Extract<Action, { do: "promote" }>): void {
    const def = this.unit(a.unit);
    if (!def?.promotion) {
      return this.block(i, { key: "warn.cannotPromote", level: "error", params: { unit: a.unit } });
    }
    this.flagLowConfidence(i, def);
    const n = a.count ?? 1;
    const workers = this.workers
      .filter((w) => w.unit === def.id && w.task.kind !== "build" && w.task.kind !== "busy")
      .slice(-n);
    const others = Math.min(this.others.get(def.id) ?? 0, n - workers.length);
    if (workers.length + others < n) {
      return this.block(i, {
        key: "warn.noUnitToPromote",
        level: "delay",
        params: { unit: def.id },
      });
    }
    const hero = this.unit(def.promotion.to);
    const extraPop = (this.unitPop(hero) - this.unitPop(def)) * n;
    if (extraPop > 0 && this.popUsed() + this.popReserved() + extraPop > this.popCap() + EPS) {
      return this.block(i, {
        key: "warn.popCapped",
        level: "delay",
        params: { unit: def.promotion.to },
      });
    }
    const cost = addCost({}, this.promotionCost(def), n);
    const missing = this.afford(cost);
    if (missing) return this.block(i, this.noResource(cost, missing));
    this.pay(cost);
    const time = applyModifiers(def.promotion.time, "promotionTime", this.mods(), {
      id: def.promotion.to,
      tags: hero?.tags,
    });
    for (const w of workers) w.task = { kind: "busy", resume: w.task };
    this.promotions.push({
      at: this.t + time,
      from: def.id,
      to: def.promotion.to,
      workers: workers.map((w) => w.uid),
      others,
      action: i,
    });
    this.start(i);
    this.emit({
      kind: "promote",
      unit: def.id,
      to: def.promotion.to,
      count: n,
      action: i,
      t: this.t,
    });
    this.finishPromotions();
  }

  /** A train action with a mode: keeps training from now on, until a stop action. */
  startRule(i: number, a: Extract<Action, { do: "train" }>, mode: TrainMode): void {
    const def = this.unit(a.unit);
    if (!def)
      return this.block(i, { key: "warn.unknownId", level: "error", params: { id: a.unit } });
    this.flagLowConfidence(i, def);
    this.rules.push({ action: i, mode, unit: a.unit, rally: a.rally, at: a.at, active: true });
    this.start(i);
    this.complete(i);
    this.emit({ kind: "trainOn", mode, unit: a.unit, rally: a.rally, action: i, t: this.t });
  }

  actEvent(i: number, a: Extract<Action, { do: "event" }>): void {
    if (a.lose) {
      const lost: Record<string, number> = {};
      for (const [u, n] of Object.entries(a.lose)) {
        const removed = this.removeUnits(u, n);
        lost[u] = removed;
        if (removed < n)
          this.warn("info", "warn.notEnoughUnits", { unit: u, wanted: n, removed }, i);
      }
      this.emit({ kind: "lose", units: lost, action: i, t: this.t });
    }
    if (a.gainFavor) {
      this.res.favor += a.gainFavor;
      this.emit({ kind: "gain", cost: { favor: a.gainFavor }, action: i, t: this.t });
    }
    if (a.gainResource) {
      for (const [r, v] of Object.entries(a.gainResource) as [ResourceId, number][])
        this.res[r] += v;
      this.emit({ kind: "gain", cost: a.gainResource, action: i, t: this.t });
    }
    if (a.note) this.emit({ kind: "note", text: a.note, action: i, t: this.t });
    this.start(i);
    this.complete(i);
  }

  // ---------- rules ----------

  runRules(): void {
    const reserved = this.reserved();
    this.rules.forEach((rule, ri) => {
      if (!rule.active) return;
      this.acting = rule.action;
      const def = this.unit(rule.unit);
      if (!def) return;
      let capped = false;
      for (;;) {
        const result = this.tryTrain(def, {
          at: rule.at,
          rule: ri,
          rally: rule.rally,
          reserved: rule.mode === "affordable" ? reserved : undefined,
        });
        if ("uid" in result) continue;
        if (result.key === "warn.popCapped") capped = true;
        if (result.level === "error" && !rule.errorReported) {
          rule.errorReported = true;
          this.warn("error", result.key, result.params, rule.action);
        }
        break;
      }
      if (capped && rule.cappedSince === undefined) rule.cappedSince = this.t;
      if (!capped && rule.cappedSince !== undefined) {
        const waited = round(this.t - rule.cappedSince, 1);
        this.warn("delay", "warn.popCapped", { unit: rule.unit, waited }, rule.action);
        rule.cappedSince = undefined;
      }
    });
  }

  // ---------- time ----------

  advance(dt: number): void {
    this.gather(dt);
    this.favor(dt);
    this.trickles(dt);
    const cap = this.p.def.favorCap;
    if (cap !== undefined) this.res.favor = Math.min(this.res.favor, cap);
    for (const site of this.sites) {
      if (site.state === "building") {
        const rates = site.builders
          .map((uid) => this.workers.find((x) => x.uid === uid))
          .filter((w): w is Worker => w !== undefined)
          .map((w) => {
            const u = this.unit(w.unit);
            return applyModifiers(u?.worker?.buildRate ?? 1, "builderRate", this.mods(), {
              id: w.unit,
              tags: u?.tags,
            });
          })
          .sort((a, b) => b - a);
        const d = this.data.common.defaults;
        const share = (k: number) =>
          k === 0
            ? 1
            : k === 1
              ? (d.secondBuilderEfficiency ?? 1)
              : (d.extraBuilderEfficiency ?? 1);
        const speed = rates.reduce((sum, r, k) => sum + r * share(k), 0);
        const empower = this.p.def.empower;
        const boost = empower ? this.empowerFactor(site, empower.buildRate) : 1;
        site.progress += (dt * speed * site.speedMul * boost) / Math.max(site.time, EPS);
      }
      for (const job of site.jobs) job.remaining -= dt * this.jobFactor(site, job);
    }
  }

  completions(): void {
    for (const site of this.sites) {
      if (site.state === "building" && site.progress >= 1 - EPS) this.finishSite(site);
      if (
        site.state === "shifting" &&
        site.shiftUntil !== undefined &&
        this.t + EPS >= site.shiftUntil
      ) {
        site.state = "ready";
        this.closeSpan(site.shiftSpan);
        this.emit({
          kind: "timeShiftDone",
          building: site.def.id,
          action: site.shiftAction,
          t: this.t,
        });
        if (site.shiftAction !== undefined) this.complete(site.shiftAction);
      }
    }
    for (const site of this.sites) {
      const done: Job[] = [];
      for (const job of site.jobs) {
        if (job.remaining > EPS) continue;
        if (!this.finishJob(job)) continue;
        done.push(job);
        this.closeSpan(job.span, job.kind === "unit" ? job.heldSince : undefined);
      }
      if (done.length) site.jobs = site.jobs.filter((j) => !done.includes(j));
    }
    this.finishPromotions();
    const before = this.effects.length;
    this.effects = this.effects.filter((e) => e.until > this.t + EPS);
    if (this.effects.length !== before) this.dirty();
  }

  finishSite(site: Site): void {
    site.state = "ready";
    this.closeSpan(site.span);
    site.progress = 1;
    let builderTo: ResourceId | "idle" | undefined;
    let builderUnit: string | undefined;
    for (const uid of site.builders) {
      const w = this.workers.find((x) => x.uid === uid);
      if (!w) continue;
      if (w.army) {
        this.workers = this.workers.filter((x) => x !== w);
        this.others.set(w.unit, (this.others.get(w.unit) ?? 0) + 1);
        builderUnit ??= w.unit;
        continue;
      }
      const target = site.then ?? w.lastTarget ?? "food";
      this.assign(w, target === "idle" && !site.then ? "food" : target);
      builderTo ??= this.targetResource(target);
      builderUnit ??= w.unit;
    }
    site.builders = [];
    this.emit({
      kind: "buildDone",
      building: site.def.id,
      builderTo,
      builderUnit,
      action: site.action,
      t: this.t,
    });
    if (site.action !== undefined) this.complete(site.action);
  }

  finishJob(job: Job): boolean {
    if (job.kind === "unit") {
      const def = this.unit(job.unit);
      if (
        this.s.popReservedAt === "end" &&
        def &&
        this.popUsed() + this.unitPop(def) > this.popCap() + EPS
      ) {
        job.heldSince ??= this.t;
        return false;
      }
      if (job.heldSince !== undefined) {
        const waited = round(this.t - job.heldSince, 1);
        const action =
          job.action ?? (job.rule !== undefined ? this.rules[job.rule]?.action : undefined);
        if (waited >= this.s.tick - EPS) {
          this.warn("delay", "warn.popCapped", { unit: job.unit, waited }, action);
        }
      }
      const rally = job.rally ?? (isGatherer(def) ? "food" : undefined);
      const origin =
        job.action ?? (job.rule !== undefined ? this.rules[job.rule]?.action : undefined);
      if (job.hunt && def?.carcass) {
        this.remaining.set("hunt", (this.remaining.get("hunt") ?? 0) + def.carcass);
        this.emit({ kind: "hunted", unit: job.unit, food: def.carcass, action: origin, t: this.t });
        if (job.action !== undefined) {
          const st = this.states[job.action]!;
          st.open--;
          if (st.left === 0 && st.open === 0) this.complete(job.action);
        }
        return true;
      }
      this.spawn(job.unit, rally, origin);
      this.produced.push({ t: round(this.t), unit: job.unit, action: origin, rule: job.rule });
      if (job.action !== undefined || isGatherer(def)) {
        this.emit({
          kind: "unitReady",
          unit: job.unit,
          count: 1,
          to: isGatherer(def) && rally ? this.targetResource(rally) : undefined,
          action: job.action ?? (job.rule !== undefined ? this.rules[job.rule]?.action : undefined),
          t: this.t,
        });
      }
      if (job.action !== undefined) {
        const st = this.states[job.action]!;
        st.open--;
        if (st.left === 0 && st.open === 0) this.complete(job.action);
      }
      return true;
    }
    if (job.kind === "research") {
      this.researched.add(job.research);
      for (const [u, n] of Object.entries(this.p.researches.get(job.research)?.spawn ?? {})) {
        for (let k = 0; k < n; k++) {
          this.spawn(u, isGatherer(this.unit(u)) ? "food" : undefined);
          this.produced.push({ t: round(this.t), unit: u, action: job.action });
        }
      }
      this.dirty();
      this.emit({ kind: "researchDone", research: job.research, action: job.action, t: this.t });
      this.complete(job.action);
      return true;
    }
    this.age = job.age;
    this.minors.push(job.minor);
    this.agingTo = undefined;
    this.dirty();
    const minor = this.data.minors.get(job.minor);
    const free: Record<string, number> = { ...minor?.freeUnitsOnAgeUp };
    if (this.god.ageUpFreeUnits !== undefined) {
      const myth = this.mythUnitOf(job.minor);
      if (myth) free[myth] = this.god.ageUpFreeUnits;
    }
    for (const [u, n] of Object.entries(free)) {
      for (let k = 0; k < n; k++) {
        this.spawn(u, isGatherer(this.unit(u)) ? "food" : undefined);
        this.produced.push({ t: round(this.t), unit: u, action: job.action });
      }
    }
    const times = this.ageTimes[job.age];
    if (times) times.reached = round(this.t);
    this.emit({
      kind: "ageDone",
      age: job.age,
      minor: job.minor,
      free,
      action: job.action,
      t: this.t,
    });
    this.complete(job.action);
    return true;
  }

  mythUnitOf(minorId: string): string | undefined {
    const minor = this.data.minors.get(minorId);
    for (const id of minor?.unlocks ?? []) {
      if (this.unit(id)?.tags.includes("myth")) return id;
    }
    for (const u of this.p.units.values()) {
      if (u.tags.includes("myth") && u.requires?.includes(minorId)) return u.id;
    }
    return undefined;
  }

  finishPromotions(): void {
    const due = this.promotions.filter((p) => this.t + EPS >= p.at);
    if (due.length === 0) return;
    this.promotions = this.promotions.filter((p) => !due.includes(p));
    for (const p of due) {
      const toArmy = !isGatherer(this.unit(p.to));
      for (const w of this.workers) {
        if (!p.workers.includes(w.uid)) continue;
        w.unit = p.to;
        if (toArmy) continue;
        if (w.task.kind === "busy") {
          const resume = w.task.resume;
          w.task =
            resume.kind === "gather" && !this.available(resume.source)
              ? this.resolveTask(w.lastTarget)
              : resume;
        }
      }
      if (toArmy) {
        const leaving = this.workers.filter((w) => p.workers.includes(w.uid));
        this.workers = this.workers.filter((w) => !p.workers.includes(w.uid));
        this.others.set(p.to, (this.others.get(p.to) ?? 0) + leaving.length);
      }
      const n = Math.min(p.others, this.others.get(p.from) ?? 0);
      if (n > 0) {
        this.others.set(p.from, (this.others.get(p.from) ?? 0) - n);
        this.others.set(p.to, (this.others.get(p.to) ?? 0) + n);
      }
      this.complete(p.action);
    }
  }

  gather(dt: number): void {
    const mods = this.mods();
    const bySource = new Map<SourceId, { w: Worker; amount: number }[]>();
    for (const w of this.workers) {
      if (w.task.kind !== "gather") continue;
      const def = this.unit(w.unit);
      const source = w.task.source;
      const base = def?.worker?.gatherRates[source] ?? 0;
      const resource = this.sourceResource(source);
      const rate = applyModifiers(base, "gatherRate", mods, {
        id: w.unit,
        tags: def?.tags,
        source,
        resource,
      });
      const amount = (rate * this.s.efficiency * this.dropsiteFactor(source) * dt) / 60;
      const list = bySource.get(source) ?? [];
      list.push({ w, amount });
      bySource.set(source, list);
    }
    for (const [source, list] of bySource) {
      const resource = this.sourceResource(source);
      let total = list.reduce((sum, x) => sum + x.amount, 0);
      if (this.depletes(source)) {
        const left = this.remaining.get(source) ?? 0;
        if (total >= left - EPS) {
          total = Math.max(0, left);
          this.remaining.set(source, 0);
          const next = this.nextSource(source);
          for (const { w } of list) {
            w.task = next ? { kind: "gather", source: next } : { kind: "idle" };
          }
          if (next) this.warn("attention", "warn.sourceDepleted", { source, next });
          else this.warn("attention", "warn.sourceDepletedIdle", { source });
          this.emit({ kind: "sourceDepleted", source, next, t: this.t });
        } else {
          this.remaining.set(source, left - total);
        }
      }
      this.res[resource] += total;
    }
  }

  /** Resource trickles; favor trickles also get favorRate modifiers scoped to their source. */
  trickles(dt: number): void {
    const mods = this.mods();
    const add = (cost: Cost | undefined, ctx: ModContext, times = 1) => {
      for (const [r, v] of Object.entries(cost ?? {}) as [ResourceId, number][]) {
        const rate = r === "favor" ? applyModifiers(v, "favorRate", mods, ctx) : v;
        this.res[r] += (rate * times * dt) / 60;
      }
    };
    const unitCtx = (id: string): ModContext => ({ id, tags: this.unit(id)?.tags });
    for (const w of this.workers) add(this.unit(w.unit)?.trickle, unitCtx(w.unit));
    for (const [u, n] of this.others) add(this.unit(u)?.trickle, unitCtx(u), n);
    for (const site of this.sites) {
      if (site.state === "ready") add(site.def.trickle, { id: site.def.id, tags: site.def.tags });
    }
    for (const r of this.researched) {
      const def = this.p.researches.get(r);
      add(def?.trickle, { id: r, tags: def?.tags });
    }
    for (const e of this.effects) add(e.trickle, {});
  }

  /** Favor per pantheon rule; favorRate modifiers apply per source (unit or building). */
  favor(dt: number): void {
    const rule = this.p.def.favor;
    const mods = this.mods();
    const rated = (base: number, id?: string, tags?: string[]) =>
      applyModifiers(base, "favorRate", mods, { id, tags });
    let perMin = 0;
    switch (rule.type) {
      case "oracles": {
        const rate = this.s.oracleRate ?? rule.defaultRate;
        perMin = this.unitCount(rule.unit) * rated(rate, rule.unit, this.unit(rule.unit)?.tags);
        if (rule.heroUnit) {
          const hero = rated(
            rate * rule.heroMultiplier,
            rule.heroUnit,
            this.unit(rule.heroUnit)?.tags,
          );
          perMin += this.unitCount(rule.heroUnit) * hero;
        }
        break;
      }
      case "templeWorkers": {
        const n = this.workers.filter((w) => w.task.kind === "favor").length;
        if (n > 0 && this.hasBuilding(rule.building)) {
          perMin = rated(rule.table[Math.min(n, rule.table.length) - 1] ?? 0, rule.building);
        }
        break;
      }
      case "monuments":
        for (const site of this.sites) {
          const base = rule.rates[site.def.id];
          if (site.state === "building" || !base) continue;
          const empower = this.p.def.empower;
          const boost = empower
            ? this.empowerFactor(site, empower.favorRateByGod?.[this.god.id] ?? empower.favorRate)
            : 1;
          perMin += rated(base, site.def.id, site.def.tags) * boost;
        }
        break;
      case "combat":
        perMin = rated(this.s.norseFavorPerMinute || rule.defaultPerMinute);
        break;
    }
    this.res.favor += (perMin * dt) / 60;
  }

  allocation(): Allocation {
    const alloc: Allocation = { food: 0, wood: 0, gold: 0, favor: 0, idle: 0, build: 0, busy: 0 };
    for (const w of this.workers) {
      if (w.task.kind === "gather") alloc[this.sourceResource(w.task.source)]++;
      else if (w.task.kind === "favor") alloc.favor++;
      else if (w.task.kind === "build") alloc.build++;
      else if (w.task.kind === "busy") alloc.busy++;
      else alloc.idle++;
    }
    return alloc;
  }

  snapshot(): void {
    const alloc = this.allocation();
    if (alloc.idle > 0 && this.idleSince === undefined) this.idleSince = this.t;
    if (alloc.idle === 0 && this.idleSince !== undefined) {
      const waited = round(this.t - this.idleSince, 1);
      if (waited >= 5) this.warn("delay", "warn.idleWorkers", { waited });
      this.idleSince = undefined;
    }
    if (Math.abs(this.t - Math.round(this.t)) > EPS) return;
    this.series.push({
      t: Math.round(this.t),
      age: this.age,
      resources: {
        food: round(this.res.food, 1),
        wood: round(this.res.wood, 1),
        gold: round(this.res.gold, 1),
        favor: round(this.res.favor, 1),
      },
      pop: this.popUsed(),
      popCap: this.popCap(),
      alloc,
    });
  }

  // ---------- main loop ----------

  settled(): boolean {
    return this.build.actions.every((_, i) => {
      const st = this.states[i]!;
      if (st.status === "done") return true;
      return st.status === "blocked" && st.reason?.level === "error";
    });
  }

  run(): SimResult {
    const tick = this.s.tick;
    const fixed = this.build.actions
      .map((a) =>
        typeof a.when === "string" && a.when !== "asap" && a.when !== "always"
          ? parseClock(a.when)
          : 0,
      )
      .reduce((m, v) => Math.max(m, v), 0);
    const hardCap = Math.min(fixed + 900, 3600);
    let settledAt: number | undefined;
    for (let step = 0; ; step++) {
      this.t = round(step * tick, 6);
      if (step > 0) this.advance(tick);
      this.completions();
      this.claims.clear();
      this.build.actions.forEach((a, i) => {
        const st = this.states[i]!;
        if (st.status === "done") return;
        if (st.status === "active" && !(a.do === "train" && st.left > 0)) return;
        if (!this.eligible(i)) return;
        this.runAction(i);
      });
      this.runRules();
      this.snapshot();
      if (settledAt === undefined && this.settled() && this.allJobsIdle()) settledAt = this.t;
      if (settledAt !== undefined && this.t >= settledAt + this.s.tail - EPS) break;
      if (this.t >= hardCap) break;
    }
    const idle = this.allocation().idle;
    if (idle > 0 && this.idleSince !== undefined && this.t - this.idleSince >= 5) {
      this.warnings.push({
        t: round(this.idleSince),
        level: "delay",
        key: "warn.idleUntilEnd",
        params: { count: idle },
      });
    }
    this.build.actions.forEach((_, i) => {
      const st = this.states[i]!;
      if (st.status !== "done" && st.status !== "active" && st.reason?.level !== "error") {
        this.warn("error", "warn.neverStarted", { reason: st.reason?.key ?? "" }, i);
      }
    });
    return this.result(settledAt ?? round(this.t));
  }

  allJobsIdle(): boolean {
    return this.sites.every(
      (s) =>
        s.state !== "building" &&
        s.state !== "shifting" &&
        s.jobs.every((j) => j.kind === "unit" && j.action === undefined),
    );
  }

  lanes(): ProductionLane[] {
    const used = new Set(this.spans.map((s) => s.lane));
    const seen = new Map<string, number>();
    const lanes: ProductionLane[] = [];
    for (const site of this.sites) {
      const n = (seen.get(site.def.id) ?? 0) + 1;
      seen.set(site.def.id, n);
      if (used.has(site.uid))
        lanes.push({ uid: site.uid, building: site.def.id, n, initial: site.initial });
    }
    return lanes;
  }

  /** Warnings after the build ends are dropped (nobody follows the build there), except errors. */
  result(buildEnd: number): SimResult {
    const milestones: MilestoneResult[] = (this.build.milestones ?? []).map((m) => {
      const action = this.idIndex.get(m.atAction) ?? -1;
      const st = this.states[action];
      const t = m.on === "end" ? st?.completedAt : st?.startedAt;
      const snap = t === undefined ? undefined : this.series.find((s) => s.t >= t);
      return { id: m.id, action, t, resources: snap?.resources, label: m.label };
    });
    return {
      events: this.events,
      warnings: this.warnings
        .filter((w) => w.level === "error" || w.t <= buildEnd + EPS)
        .sort((a, b) => a.t - b.t),
      series: this.series,
      actions: this.states.map((st, index) => ({
        index,
        status: st.status,
        startedAt: st.startedAt,
        completedAt: st.completedAt,
        waited: round(st.waited, 1),
      })),
      milestones,
      ageTimes: this.ageTimes,
      produced: this.produced,
      production: { lanes: this.lanes(), spans: this.spans },
      endTime: round(this.t),
      buildEnd: round(buildEnd),
    };
  }
}

export function simulate(data: GameData, build: Build): SimResult {
  return new Simulation(data, build).run();
}
