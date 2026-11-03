import { useMemo } from "preact/hooks";
import type { GameData } from "../data/load.ts";
import type { Locale, PantheonId } from "../data/schema.ts";
import { type Action, BUILD_VERSION, type Build } from "../engine/build.ts";
import { buildSteps, type Step } from "../engine/format.ts";
import { simulate } from "../engine/simulate.ts";
import type { SimResult } from "../engine/types.ts";
import { newBuildId } from "../io/files.ts";

export type Simulated = { result?: SimResult; steps: Step[]; error?: string };

export function runSimulation(data: GameData, build: Build, locale: Locale): Simulated {
  try {
    const result = simulate(data, build);
    return { result, steps: buildSteps(data, build, result, locale) };
  } catch (e) {
    return { steps: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export function useSimulation(data: GameData, build: Build | undefined, locale: Locale): Simulated {
  return useMemo(
    () => (build ? runSimulation(data, build, locale) : { steps: [] }),
    [data, build, locale],
  );
}

/** What a build starts with: the villagers idle at 0:00 sent to food (nearly every build does
 *  this first). */
export function startActions(data: GameData, build: Build): Action[] {
  const idle = simulate(data, { ...build, actions: [], settings: {} }).series[0]?.alloc.idle ?? 0;
  return idle > 0
    ? [{ id: "a1", when: "0:00", do: "move", count: idle, from: "idle", to: "food" }]
    : [];
}

/** True when the build has only what startActions gives it (nothing of the player's yet). */
export function onlyStartActions(data: GameData, build: Build): boolean {
  return JSON.stringify(build.actions) === JSON.stringify(startActions(data, build));
}

export function newBuild(data: GameData, name: string, efficiency?: number): Build {
  const pantheon: PantheonId = data.pantheons.has("atlanteans")
    ? "atlanteans"
    : ([...data.pantheons.keys()][0] ?? "atlanteans");
  const god = data.pantheons.get(pantheon)?.def.gods[0] ?? "kronos";
  const now = new Date().toISOString();
  const build: Build = {
    format: "aomr-bob",
    version: BUILD_VERSION,
    id: newBuildId(),
    name,
    createdAt: now,
    updatedAt: now,
    pantheon,
    god,
    type: "other",
    settings: efficiency ? { efficiency } : {},
    actions: [],
  };
  return { ...build, actions: startActions(data, build) };
}

export function duplicateBuild(build: Build, suffix: string): Build {
  const now = new Date().toISOString();
  return {
    ...structuredClone(build),
    id: newBuildId(),
    name: `${build.name} ${suffix}`.trim().slice(0, 80),
    createdAt: now,
    updatedAt: now,
  };
}
