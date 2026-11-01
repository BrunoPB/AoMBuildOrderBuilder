import { Fragment, type ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { Build } from "../engine/build.ts";
import type { Step } from "../engine/format.ts";
import { formatClock } from "../engine/time.ts";
import type { SimResult } from "../engine/types.ts";
import { text } from "../i18n/index.ts";
import { BuildActions } from "./build-actions.tsx";
import { useApp, useViewPref } from "./context.tsx";
import { ActionList } from "./editor/action-list.tsx";
import { actionIcons, actionKindIcon, actionTarget, actionText } from "./editor/labels.ts";
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

/** When each age is clicked and reached. */
function AgeTimes({ build, result }: { build: Build; result: SimResult }) {
  const { t } = useApp();
  const ages = (["classical", "heroic", "mythic"] as const).filter((a) => result.ageTimes[a]);
  if (ages.length === 0) return null;
  return (
    <div class="overview-ages" data-testid="overview-ages">
      {ages.map((age) => {
        const time = result.ageTimes[age]!;
        return (
          <span key={age} class="overview-age">
            <EntityIcon id={age} pantheon={build.pantheon} size={28} />
            <span class="num">
              <Tip label={t("result.clicked")}>
                <span>{formatClock(time.clicked)}</span>
              </Tip>
              {time.reached !== undefined && (
                <>
                  {" → "}
                  <Tip label={t("result.reached")}>
                    <strong>{formatClock(time.reached)}</strong>
                  </Tip>
                </>
              )}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** The build order as a plain list, in time order: when, what, and the reminders to act. */
function OrderList({ build, result, steps }: { build: Build; result: SimResult; steps: Step[] }) {
  const { data, locale } = useApp();
  const c = { data, pantheon: build.pantheon, locale };
  const worker = data.pantheons.get(build.pantheon)?.def.workers[0];
  type Item = { t: number; key: string; node: ComponentChildren };
  const items: Item[] = build.actions.map((a, i) => {
    const at = result.actions[i]?.startedAt;
    const target = actionTarget(a);
    return {
      t: at ?? Infinity,
      key: `a${i}`,
      node: (
        <li class={`order-row kind-${a.do === "train" && a.mode ? "rule" : a.do}`}>
          <span class="num order-time">{at === undefined ? "—" : formatClock(at)}</span>
          <span class="order-kind">
            <Svg name={actionKindIcon(a)} />
          </span>
          {actionIcons(a, worker).map((id) => (
            <EntityIcon key={id} id={id} pantheon={build.pantheon} size={24} />
          ))}
          <span class="order-text">{actionText(c, a)}</span>
          {target && <EntityIcon id={target} pantheon={build.pantheon} size={20} />}
        </li>
      ),
    };
  });
  for (const s of steps) {
    if (!s.notice) continue;
    items.push({
      t: s.seconds,
      key: `n${s.seconds}`,
      node: (
        <li class="order-row order-notice lvl-attention">
          <span class="num order-time">{s.t}</span>
          <span class="order-kind">
            <Svg name="arrows" />
          </span>
          <span class="order-text">{s.notice}</span>
        </li>
      ),
    });
  }
  items.sort((x, y) => x.t - y.t);
  return (
    <ol class="panel order-list" data-testid="order-list">
      {items.map((x) => (
        <Fragment key={x.key}>{x.node}</Fragment>
      ))}
    </ol>
  );
}

/** A build at a glance: the whole timeline, resources and workers, with nothing to edit. */
export function Overview({ id }: { id: string }) {
  const api = useApp();
  const help = useHelp();
  const { t, data, locale } = api;
  const found = api.findBuild(id);
  const build = found?.build;
  const sim = useSimulation(data, build, locale);
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [full, setFull] = useViewPref<boolean>("overview.full", false);

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
            <Tip label={help("overview.full")}>
              <label class="switch">
                <input
                  type="checkbox"
                  checked={full}
                  data-testid="overview-full"
                  onChange={(e) => setFull(e.currentTarget.checked)}
                />
                {t("overview.full")}
              </label>
            </Tip>
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

      {result && !full && (
        <div class="stack overview-simple">
          <AgeTimes build={build} result={result} />
          <OrderList build={build} result={result} steps={sim.steps} />
        </div>
      )}

      {result && full && (
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
