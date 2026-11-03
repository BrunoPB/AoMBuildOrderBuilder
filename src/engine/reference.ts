import type { GameData } from "../data/load.ts";
import type { Build } from "./build.ts";
import { simulate } from "./simulate.ts";
import { formatClock, parseClock } from "./time.ts";
import type { SimResult } from "./types.ts";

/** Times measured in a real match, used only as a reference (never as truth). */
export type ReferenceMatch = {
  /** File (next to the reference) with the build that was played. */
  build: string;
  milestones: Record<string, string | string[]>;
  autoCitizens: string[];
  prometheans: string[];
  turmas: string[];
};

export type ReferenceRow = { label: string; measured: string; simulated: string; diff?: number };

function row(label: string, measured: string, simulated: number | undefined): ReferenceRow {
  return {
    label,
    measured,
    simulated: simulated === undefined ? "—" : formatClock(simulated),
    diff: simulated === undefined ? undefined : Math.round(simulated - parseClock(measured)),
  };
}

/** Compares a simulated build with times measured in a match. */
export function compareWithReference(
  data: GameData,
  build: Build,
  ref: ReferenceMatch,
): { result: SimResult; rows: ReferenceRow[] } {
  const result = simulate(data, build);
  const action = (id: string) => result.actions[build.actions.findIndex((a) => a.id === id)];
  const produced = (unit: string, after = 0) =>
    result.produced.filter((p) => p.unit === unit && p.t > after).map((p) => p.t);
  const m = ref.milestones as Record<string, string>;
  const manors = ref.milestones.manors as string[];
  const rows: ReferenceRow[] = [
    row("Classical click", m.classicalClick!, result.ageTimes.classical?.clicked),
    row("Classical reached", m.classicalReached!, result.ageTimes.classical?.reached),
    row("Counter Barracks ready", m.counterBarracksReady!, action("cb")?.completedAt),
    row("Counter Barracks forward", m.counterBarracksForward!, action("ts2")?.completedAt),
    row("Manor 2", manors[0]!, action("m2")?.completedAt),
    row("Manor 3", manors[1]!, action("m3")?.completedAt),
    row("Heroic click", m.heroicClick!, result.ageTimes.heroic?.clicked),
    row("Heroic reached", m.heroicReached!, result.ageTimes.heroic?.reached),
  ];
  const auto = produced("citizen", parseClock("3:30"));
  ref.autoCitizens.forEach((t, i) => rows.push(row(`Auto Citizen ${i + 1}`, t, auto[i])));
  const pro = result.produced
    .filter((p) => p.unit === "promethean" && build.actions[p.action ?? -1]?.id === "pr")
    .map((p) => p.t);
  ref.prometheans.forEach((t, i) => rows.push(row(`Promethean ${i + 1}`, t, pro[i])));
  const tur = produced("turma");
  ref.turmas.forEach((t, i) => rows.push(row(`Turma ${i + 1}`, t, tur[i])));
  return { result, rows };
}
