import { useMemo } from "preact/hooks";
import type { GameData } from "../data/load.ts";
import type { Locale, PantheonId } from "../data/schema.ts";
import type { Build } from "../engine/build.ts";
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

export function newBuild(data: GameData, name: string, efficiency?: number): Build {
  const pantheon: PantheonId = data.pantheons.has("atlanteans")
    ? "atlanteans"
    : ([...data.pantheons.keys()][0] ?? "atlanteans");
  const god = data.pantheons.get(pantheon)?.def.gods[0] ?? "kronos";
  const now = new Date().toISOString();
  return {
    format: "aomr-bob",
    version: 1,
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
