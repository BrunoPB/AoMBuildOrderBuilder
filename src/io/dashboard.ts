import { entityName } from "../data/catalog.ts";
import type { GameData } from "../data/load.ts";
import type { Build } from "../engine/build.ts";
import { buildSteps, type Step } from "../engine/format.ts";
import { formatClock } from "../engine/time.ts";
import type { SimResult } from "../engine/types.ts";
import { text } from "../i18n/index.ts";
import { slug } from "./files.ts";

/** Entry of the `custom_builds` list used by the existing dashboard (texts in pt-BR). */
export type DashboardBuild = {
  id: string;
  god: string;
  pantheon: string;
  dlc: boolean;
  type: string;
  status: string;
  name: string;
  objective: string;
  end: string;
  steps: string;
  final: string;
  matchups: string;
  refs: string;
};

type DashboardStep = Omit<Step, "seconds" | "actions"> & {
  actions: Omit<Step["actions"][number], "action">[];
};

export function toDashboardSteps(steps: Step[]): DashboardStep[] {
  return steps.map(({ seconds: _seconds, actions, ...rest }) => ({
    ...rest,
    actions: actions.map(({ action: _action, ...a }) => a),
  }));
}

export function toDashboard(data: GameData, build: Build, result: SimResult): DashboardBuild {
  const locale = "pt-BR";
  const steps = buildSteps(data, build, result, locale);
  const last = steps.at(-1);
  const lastAge = (["mythic", "heroic", "classical"] as const).find(
    (a) => result.ageTimes[a]?.reached !== undefined,
  );
  const final = lastAge
    ? {
        t: formatClock(result.ageTimes[lastAge]!.reached!),
        icons: [`ages/${lastAge}`],
        text: entityName(data, build.pantheon, lastAge, locale),
      }
    : {
        t: last?.t,
        icons: last?.actions.flatMap((a) => a.icons) ?? [],
        text: last?.actions.map((a) => a.text).join(" · ") ?? "",
      };
  return {
    id: `${slug(build.god)}-${slug(build.name)}`,
    god: entityName(data, build.pantheon, build.god, locale),
    pantheon: entityName(data, build.pantheon, build.pantheon, locale),
    dlc: false,
    type: build.type,
    status: "final",
    name: build.name,
    objective: text(locale, build.objective),
    end: text(locale, build.end) || (final.t ? `${final.text} ${final.t}` : final.text),
    steps: JSON.stringify(toDashboardSteps(steps)),
    final: JSON.stringify(final),
    matchups: JSON.stringify(
      (build.matchups ?? []).map((m) => ({
        god: entityName(data, build.pantheon, m.god, locale),
        fit: m.fit,
        why: text(locale, m.why),
      })),
    ),
    refs: JSON.stringify(build.refs ?? []),
  };
}
