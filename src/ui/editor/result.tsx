import type { ComponentChildren } from "preact";
import type { Build, Matchup } from "../../engine/build.ts";
import { type Step, warningText } from "../../engine/format.ts";
import { formatClock } from "../../engine/time.ts";
import type { SimResult } from "../../engine/types.ts";
import { text } from "../../i18n/index.ts";
import { useApp } from "../context.tsx";
import { EntityIcon, Tip, HelpText, useHelp } from "../icon.tsx";
import { Svg } from "../svg.tsx";
import { PopChart, ResourceChart } from "./charts.tsx";
import { actionIcons } from "./labels.ts";

const RES = ["food", "wood", "gold", "favor"] as const;

export function focusAction(index: number | undefined): void {
  if (index === undefined) return;
  const row = document.getElementById(`action-row-${index}`);
  row?.scrollIntoView({ behavior: "smooth", block: "center" });
  row?.focus({ preventScroll: true });
}

export function StepChips({ build, step, large }: { build: Build; step: Step; large?: boolean }) {
  return (
    <div class="tl-actions">
      {step.actions.map((a, i) => (
        <button
          key={i}
          type="button"
          class={`tl-chip kind-${a.kind}`}
          onClick={() => focusAction(a.action)}
          title={a.byLabel ? `${a.text} (${a.byLabel})` : a.text}
        >
          {a.icons.map((icon, k) => (
            <EntityIconByIcon key={k} icon={icon} build={build} size={large ? 40 : 24} />
          ))}
          {a.byLabel && <span class="action-times">{a.byLabel} ·</span>}
          <span class="label-text">{a.text}</span>
          {a.to && (
            <EntityIcon id={a.to} pantheon={build.pantheon} size={large ? 40 : 24} tip={false} />
          )}
        </button>
      ))}
      {step.notice && <span class="tl-notice">⚠ {step.notice}</span>}
    </div>
  );
}

/** Steps carry icon ids; find the entity behind an icon id to show its name. */
export function EntityIconByIcon({
  icon,
  build,
  size,
}: {
  icon: string;
  build: Build;
  size: number;
}) {
  const { data } = useApp();
  const p = data.pantheons.get(build.pantheon);
  const all = [
    ...(p?.units.values() ?? []),
    ...(p?.buildings.values() ?? []),
    ...(p?.researches.values() ?? []),
    ...data.minors.values(),
    ...data.powers.values(),
    ...data.common.ages,
    ...data.resources,
  ];
  const match = all.find((e) => e.icon === icon);
  return <EntityIcon id={match?.id ?? icon} pantheon={build.pantheon} size={size} tip={false} />;
}

function shownWarnings(result: SimResult) {
  return result.warnings.filter(
    (w) =>
      w.level !== "info" || w.key === "warn.lowConfidenceData" || w.key === "warn.sourceDepleted",
  );
}

/** Header button with the warning counts; opens the warnings drawer. */
export function WarningsButton({
  result,
  open,
  onToggle,
}: {
  result: SimResult;
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useApp();
  const shown = shownWarnings(result);
  const errors = shown.filter((w) => w.level === "error").length;
  const delays = shown.filter((w) => w.level === "delay").length;
  const label = `${t("result.warnings")}: ${errors} ${t("level.error")}, ${delays} ${t("level.delay")}`;
  return (
    <Tip label={label}>
      <button
        class={`btn warn-btn ${errors ? "has-error" : delays ? "has-delay" : "is-ok"}`}
        aria-label={label}
        aria-expanded={open}
        data-testid="warnings-toggle"
        onClick={onToggle}
      >
        {errors === 0 && delays === 0 ? (
          <span class="lvl-info">
            <Svg name="check" />
          </span>
        ) : (
          <>
            {errors > 0 && (
              <span class="lvl-error row">
                <Svg name="error" />
                <span class="num">{errors}</span>
              </span>
            )}
            {delays > 0 && (
              <span class="lvl-delay row">
                <Svg name="warning" />
                <span class="num">{delays}</span>
              </span>
            )}
          </>
        )}
      </button>
    </Tip>
  );
}

/** Side panel with every warning; closes with Escape or the close button. */
export function WarningsDrawer({
  build,
  result,
  onClose,
  onPick,
}: {
  build: Build;
  result: SimResult;
  onClose: () => void;
  onPick: (action?: number) => void;
}) {
  const { t } = useApp();
  return (
    <>
      <div class="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        class="drawer"
        role="dialog"
        aria-label={t("result.warnings")}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        <WarningsPanel
          build={build}
          result={result}
          onPick={onPick}
          close={
            <Tip label={t("nav.close")}>
              <button
                class="btn icon-only"
                aria-label={t("nav.close")}
                data-testid="warnings-close"
                ref={(el) => el?.focus()}
                onClick={onClose}
              >
                <Svg name="x" />
              </button>
            </Tip>
          }
        />
      </div>
    </>
  );
}

export function WarningsPanel({
  build,
  result,
  onPick = focusAction,
  close,
}: {
  build: Build;
  result: SimResult;
  onPick?: (action?: number) => void;
  close?: ComponentChildren;
}) {
  const { t, data, locale } = useApp();
  const help = useHelp();
  const shown = shownWarnings(result);
  const count = (lvl: string) => shown.filter((w) => w.level === lvl).length;
  return (
    <div class="panel" data-testid="warnings">
      <div class="list-head">
        <h3>
          <Svg name="warning" />
          <HelpText k="result.warnings" />
        </h3>
        {close}
      </div>
      <div class="warn-summary">
        {(["error", "delay", "info"] as const).map((lvl) => (
          <Tip
            key={lvl}
            label={[t(`level.${lvl}`), help(`level.${lvl}`)].filter(Boolean).join("\n")}
          >
            <span class={`row lvl-${lvl}`} style={{ gap: "2px" }}>
              <Svg
                name={lvl === "error" ? "error" : lvl === "delay" ? "warning" : "info"}
                label={t(`level.${lvl}`)}
              />
              <span class="num" data-testid={`warn-count-${lvl}`}>
                {count(lvl)}
              </span>
            </span>
          </Tip>
        ))}
      </div>
      {shown.length === 0 ? (
        <span class="lvl-info row">
          <Svg name="check" /> {t("result.noWarnings")}
        </span>
      ) : (
        <ul class="warn-list">
          {shown.map((w, i) => (
            <li key={i}>
              <button class="warn-item" onClick={() => onPick(w.action)}>
                <span class={`lvl-${w.level}`}>
                  <Svg
                    name={w.level === "error" ? "error" : w.level === "delay" ? "warning" : "info"}
                    label={t(`level.${w.level}`)}
                  />
                </span>
                <span class="num">{formatClock(w.t)}</span>
                {w.action !== undefined && build.actions[w.action] && (
                  <span class="row" style={{ gap: "2px" }}>
                    {actionIcons(build.actions[w.action]!)
                      .slice(0, 1)
                      .map((id) => (
                        <EntityIcon
                          key={id}
                          id={id}
                          pantheon={build.pantheon}
                          size={20}
                          tip={false}
                        />
                      ))}
                  </span>
                )}
                <span>{warningText(data, build, w, locale)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResLine({ resources }: { resources?: Record<string, number> }) {
  const { t } = useApp();
  if (!resources) return null;
  return (
    <span class="res-line">
      {RES.map((r) => (
        <Tip key={r} label={t(`res.${r}`)}>
          <span class={`res-${r} row`} style={{ gap: "2px" }}>
            <span class="num">{Math.floor(resources[r] ?? 0)}</span>
          </span>
        </Tip>
      ))}
    </span>
  );
}

export function Milestones({ build, result }: { build: Build; result: SimResult }) {
  const { t, locale } = useApp();
  const help = useHelp();
  const at = (sec?: number) =>
    sec === undefined ? undefined : result.series.find((s) => s.t >= sec)?.resources;
  const cards: {
    key: string;
    icons: string[];
    label: string;
    t?: number;
    resources?: Record<string, number>;
    help?: string;
  }[] = [];
  for (const age of ["classical", "heroic", "mythic"] as const) {
    const times = result.ageTimes[age];
    if (!times) continue;
    cards.push({
      key: `${age}-c`,
      icons: [age],
      label: t("result.clicked"),
      help: help("result.clicked"),
      t: times.clicked,
      resources: at(times.clicked),
    });
    if (times.reached !== undefined) {
      cards.push({
        key: `${age}-r`,
        icons: [age],
        label: t("result.reached"),
        help: help("result.reached"),
        t: times.reached,
        resources: at(times.reached),
      });
    }
  }
  for (const m of result.milestones) {
    const a = build.actions[m.action];
    cards.push({
      key: `m-${m.id}`,
      icons: a ? actionIcons(a).slice(0, 2) : [],
      label: m.label ? text(locale, m.label) : m.id,
      t: m.t,
      resources: m.resources,
    });
  }
  if (cards.length === 0) return null;
  return (
    <div class="panel">
      <h3>
        <Svg name="milestone" />
        <HelpText k="editor.milestones" />
      </h3>
      <div class="milestones" data-testid="milestones">
        {cards.map((c) => (
          <div class="milestone" key={c.key}>
            <span class="row" style={{ gap: "4px" }}>
              {c.icons.map((id) => (
                <EntityIcon key={id} id={id} pantheon={build.pantheon} size={24} />
              ))}
              <Tip label={c.help ?? ""} focusable>
                <span class="action-times">{c.label}</span>
              </Tip>
            </span>
            <span class="big">{c.t !== undefined ? formatClock(c.t) : "—"}</span>
            <ResLine resources={c.resources} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Matchups({
  build,
  readonly,
  onChange,
}: {
  build: Build;
  readonly: boolean;
  onChange: (m: Matchup[]) => void;
}) {
  const { data, locale } = useApp();
  const list = build.matchups ?? [];
  const cycle = (god: string) => {
    const order: (Matchup["fit"] | undefined)[] = [undefined, "good", "neutral", "bad"];
    const cur = list.find((m) => m.god === god);
    const next = order[(order.indexOf(cur?.fit) + 1) % order.length];
    const rest = list.filter((m) => m.god !== god);
    onChange(next ? [...rest, { ...cur, god, fit: next }] : rest);
  };
  const cols = (["good", "neutral", "bad"] as const).map((fit) => ({
    fit,
    items: list.filter((m) => m.fit === fit),
  }));
  const unset = [...data.gods.values()].filter((g) => !list.some((m) => m.god === g.id));
  if (readonly && list.length === 0) return null;
  return (
    <div class="panel" data-testid="matchups">
      <h3>
        <Svg name="sword" />
        <HelpText k="editor.matchups" />
      </h3>
      <div class="matchups">
        {cols.map((c) => (
          <div key={c.fit} class={`matchup-col ${c.fit}`}>
            <h3 class={c.fit === "good" ? "lvl-info" : ""}>
              <Svg name={c.fit === "good" ? "check" : c.fit === "bad" ? "error" : "info"} />
              <HelpText k={`result.${c.fit}`} />
            </h3>
            <div class="portraits">
              {c.items.map((m) => {
                const g = data.gods.get(m.god);
                const label = [g ? text(locale, g.name) : m.god, m.why ? text(locale, m.why) : ""]
                  .filter(Boolean)
                  .join("\n");
                return readonly ? (
                  <EntityIcon
                    key={m.god}
                    id={m.god}
                    pantheon={g?.pantheon ?? build.pantheon}
                    size={36}
                    detail={m.why ? text(locale, m.why) : undefined}
                  />
                ) : (
                  <Tip key={m.god} label={label}>
                    <button class="portrait-btn" aria-label={label} onClick={() => cycle(m.god)}>
                      <EntityIcon
                        id={m.god}
                        pantheon={g?.pantheon ?? build.pantheon}
                        size={36}
                        tip={false}
                      />
                    </button>
                  </Tip>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {!readonly && unset.length > 0 && (
        <div class="portraits" style={{ marginTop: "8px", opacity: 0.7 }}>
          {unset.map((g) => (
            <Tip key={g.id} label={text(locale, g.name)}>
              <button
                class="portrait-btn"
                aria-label={text(locale, g.name)}
                onClick={() => cycle(g.id)}
              >
                <EntityIcon id={g.id} pantheon={g.pantheon} size={28} tip={false} />
              </button>
            </Tip>
          ))}
        </div>
      )}
    </div>
  );
}

export function Charts({ result }: { result: SimResult }) {
  return (
    <div class="panel">
      <h3>
        <HelpText k="result.resources" />
      </h3>
      <ResourceChart series={result.series} />
      <h3 style={{ marginTop: "12px" }}>
        <HelpText k="result.population" />
      </h3>
      <PopChart series={result.series} />
    </div>
  );
}
