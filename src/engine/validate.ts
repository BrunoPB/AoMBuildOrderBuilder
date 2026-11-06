import type { GameData } from "../data/load.ts";
import type { Build } from "./build.ts";

/** Checks that every id a build references exists in the game data. Returns human-readable issues. */
export function validateRefs(build: Build, data: GameData): string[] {
  const issues: string[] = [];
  const p = data.pantheons.get(build.pantheon);
  if (!p) return [`unknown pantheon "${build.pantheon}"`];
  const god = data.gods.get(build.god);
  if (!god || god.pantheon !== build.pantheon)
    issues.push(`unknown god "${build.god}" for ${build.pantheon}`);
  const ids = new Set(build.actions.map((a) => a.id).filter(Boolean));
  const need = (ok: boolean, what: string, id: string, i: number) => {
    if (!ok) issues.push(`action ${i + 1}: unknown ${what} "${id}"`);
  };
  build.actions.forEach((a, i) => {
    if (typeof a.when === "object") need(ids.has(a.when.after), "action", a.when.after, i);
    switch (a.do) {
      case "train":
      case "promote":
      case "summon":
        need(p.units.has(a.unit), "unit", a.unit, i);
        break;
      case "empower":
        need(p.units.has(a.by), "unit", a.by, i);
        need(p.buildings.has(a.building), "building", a.building, i);
        break;
      case "build":
        need(p.buildings.has(a.building), "building", a.building, i);
        if (a.builder && "new" in a.builder)
          need(ids.has(a.builder.new), "action", a.builder.new, i);
        if (a.builder && "unit" in a.builder)
          need(p.units.has(a.builder.unit), "unit", a.builder.unit, i);
        if (a.builder && "same" in a.builder)
          need(ids.has(a.builder.same), "action", a.builder.same, i);
        break;
      case "rally":
        need(ids.has(a.queue), "action", a.queue, i);
        need(p.units.has(a.unit), "unit", a.unit, i);
        break;
      case "timeShift":
        need(p.buildings.has(a.building), "building", a.building, i);
        break;
      case "research":
        need(p.researches.has(a.research), "research", a.research, i);
        break;
      case "age":
        need(data.minors.has(a.minor), "minor god", a.minor, i);
        break;
      case "power":
        need(data.powers.has(a.power), "power", a.power, i);
        break;
      case "event":
        for (const u of Object.keys(a.lose ?? {})) need(p.units.has(u), "unit", u, i);
        break;
      case "move":
        break;
    }
  });
  for (const m of build.milestones ?? []) {
    if (!ids.has(m.atAction)) issues.push(`milestone "${m.id}": unknown action "${m.atAction}"`);
  }
  for (const m of build.matchups ?? []) {
    if (!data.gods.has(m.god)) issues.push(`matchup: unknown god "${m.god}"`);
  }
  return issues;
}
