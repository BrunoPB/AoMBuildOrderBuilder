import { useEffect, useState } from "preact/hooks";
import { text } from "../i18n/index.ts";
import { BuildActions } from "./build-actions.tsx";
import { useApp } from "./context.tsx";
import { ActionList } from "./editor/action-list.tsx";
import { ProductionChart } from "./editor/production.tsx";
import {
  Charts,
  focusAction,
  Matchups,
  Milestones,
  WarningsButton,
  WarningsDrawer,
} from "./editor/result.tsx";
import { GlobalTools } from "./global-tools.tsx";
import { EntityIcon, Tip, useHelp } from "./icon.tsx";
import { useSimulation } from "./sim.ts";
import { Svg } from "./svg.tsx";

/** A build at a glance: the whole timeline, resources and workers, with nothing to edit. */
export function Overview({ id }: { id: string }) {
  const api = useApp();
  const help = useHelp();
  const { t, data, locale } = api;
  const found = api.findBuild(id);
  const build = found?.build;
  const sim = useSimulation(data, build, locale);
  const [warningsOpen, setWarningsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("build-route");
    return () => document.documentElement.classList.remove("build-route");
  }, []);

  if (!build) {
    return (
      <div class="panel">
        <p>{t("editor.notFound")}</p>
        <a class="btn" href="#/">
          {t("nav.back")}
        </a>
      </div>
    );
  }
  const result = sim.result;
  const god = data.gods.get(build.god);

  return (
    <div class="build-page overview" data-testid="overview">
      <header class={`panel build-header pan-${build.pantheon}`} data-testid="build-header">
        <div class="row header-row">
          <Tip label={t("nav.back")}>
            <a class="btn icon-only" href="#/" aria-label={t("nav.back")}>
              <Svg name="home" />
            </a>
          </Tip>
          {god && <EntityIcon id={god.id} pantheon={build.pantheon} size={30} />}
          <h1 class="overview-name" data-testid="build-title">
            {build.name}
          </h1>
          <Tip label={help(`type.${build.type}`)} focusable>
            <span class={`type-tag type-${build.type}`}>{t(`type.${build.type}`)}</span>
          </Tip>
          <div class="row header-tools">
            {result && (
              <WarningsButton
                result={result}
                open={warningsOpen}
                onToggle={() => setWarningsOpen(!warningsOpen)}
              />
            )}
            <BuildActions build={build} readonly={found.readonly} current="view" />
            <span class="header-global row">
              <GlobalTools />
            </span>
          </div>
        </div>
        {(build.objective || build.end) && (
          <div class="overview-goal">
            {build.objective && <span>{text(locale, build.objective)}</span>}
            {build.end && (
              <span class="row">
                <Svg name="flag" />
                {text(locale, build.end)}
              </span>
            )}
          </div>
        )}
      </header>

      {sim.error && (
        <div class="panel bg-error">
          <Svg name="error" /> {sim.error}
        </div>
      )}

      {result && (
        <div class="stack">
          <Milestones build={build} result={result} />
          <div class="editor readonly overview-timeline">
            <ActionList
              build={build}
              result={result}
              steps={sim.steps}
              readonly
              update={() => undefined}
            />
          </div>
          <ProductionChart build={build} result={result} />
          <Charts result={result} />
          {(build.matchups?.length ?? 0) > 0 && (
            <Matchups build={build} readonly onChange={() => undefined} />
          )}
        </div>
      )}

      {warningsOpen && result && (
        <WarningsDrawer
          build={build}
          result={result}
          onClose={() => setWarningsOpen(false)}
          onPick={(action) => {
            setWarningsOpen(false);
            requestAnimationFrame(() => focusAction(action));
          }}
        />
      )}
    </div>
  );
}
