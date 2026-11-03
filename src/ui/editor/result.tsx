import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import type { Build, Matchup } from "../../engine/build.ts";
import { type Step, warningText } from "../../engine/format.ts";
import { formatClock } from "../../engine/time.ts";
import type { SimResult } from "../../engine/types.ts";
import { text } from "../../i18n/index.ts";
import { useApp } from "../context.tsx";
import { EDITING_ATTR } from "../fields.tsx";
import { EntityIcon, Tip, HelpText, useHelp } from "../icon.tsx";
import { Svg } from "../svg.tsx";
import { PopChart, ResourceChart } from "./charts.tsx";
import { actionIcons } from "./labels.ts";
import { viewEnd } from "./timeline.tsx";
import { LEVEL_ICON, WarningCard } from "./warning-card.tsx";

const RES = ["food", "wood", "gold", "favor"] as const;

/** Scrolls to an action row, focuses it and flashes it so the eye finds it. The row may not be
 *  rendered yet right after it is added, so it retries for a few frames. */
export function focusAction(index: number | undefined, tries = 10): void {
  if (index === undefined) return;
  const row = document.getElementById(`action-row-${index}`);
  if (!row) {
    if (tries > 0) requestAnimationFrame(() => focusAction(index, tries - 1));
    return;
  }
  row.scrollIntoView({ behavior: "smooth", block: "center" });
  /** A field being typed in keeps the focus (its action just moved because of what was typed). */
  const editing = row.querySelector<HTMLElement>(`[${EDITING_ATTR}]`);
  (editing ?? row).focus({ preventScroll: true });
  row.classList.remove("flash");
  void row.offsetWidth;
  row.classList.add("flash");
  row.addEventListener("animationend", () => row.classList.remove("flash"), { once: true });
}

/** A hand: a step the simulation takes by itself that the player does by hand in the game. */
export function AutoTag({ tip = true }: { tip?: boolean }) {
  const { t } = useApp();
  const help = useHelp();
  const tag = (
    <span class="auto-tag" data-testid="auto-tag">
      <Svg name="hand" label={t("step.auto")} />
    </span>
  );
  return tip ? (
    <Tip label={help("step.auto")} focusable>
      {tag}
    </Tip>
  ) : (
    tag
  );
}

export function StepChips({ build, step, large }: { build: Build; step: Step; large?: boolean }) {
  const help = useHelp();
  return (
    <div class="tl-actions">
      {step.actions.map((a, i) => (
        <button
          key={i}
          type="button"
          class={`tl-chip kind-${a.kind} ${a.auto ? "auto-step" : ""}`}
          onClick={() => focusAction(a.action)}
          title={[a.byLabel ? `${a.text} (${a.byLabel})` : a.text, a.auto ? help("step.auto") : ""]
            .filter(Boolean)
            .join("\n")}
        >
          {a.icons.map((icon, k) => (
            <EntityIconByIcon key={k} icon={icon} build={build} size={large ? 40 : 24} />
          ))}
          {a.byLabel && <span class="action-times">{a.byLabel} ·</span>}
          <span class="label-text">{a.text}</span>
          {a.to && (
            <EntityIcon id={a.to} pantheon={build.pantheon} size={large ? 40 : 24} tip={false} />
          )}
          {a.auto && <AutoTag tip={false} />}
        </button>
      ))}
      {step.notice && (
        <span class="tl-notice lvl-delay row">
          <Svg name={LEVEL_ICON.delay} /> {step.notice}
        </span>
      )}
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
    ...data.sources.values(),
  ];
  const match = all.find((e) => e.icon === icon);
  return <EntityIcon id={match?.id ?? icon} pantheon={build.pantheon} size={size} tip={false} />;
}

function shownWarnings(result: SimResult) {
  return result.warnings.filter((w) => w.level !== "info" || w.key === "warn.lowConfidenceData");
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
  const [expanded, setExpanded] = useState<number | null>(null);
  /** Touch screens have no hover: a tap opens the explanation inline instead. */
  const touch = typeof matchMedia === "function" && matchMedia("(hover: none)").matches;
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
              <Svg name={LEVEL_ICON[lvl]} label={t(`level.${lvl}`)} />
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
              {touch ? (
                <button
                  class="warn-item"
                  aria-expanded={touch ? expanded === i : undefined}
                  onClick={() => {
                    if (!touch) return onPick(w.action);
                    setExpanded(expanded === i ? null : i);
                  }}
                >
                  <span class={`lvl-${w.level}`}>
                    <Svg name={LEVEL_ICON[w.level]} label={t(`level.${w.level}`)} />
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
              ) : (
                <Tip label="" card={<WarningCard build={build} result={result} w={w} />}>
                  <button
                    class="warn-item"
                    aria-expanded={touch ? expanded === i : undefined}
                    onClick={() => {
                      if (!touch) return onPick(w.action);
                      setExpanded(expanded === i ? null : i);
                    }}
                  >
                    <span class={`lvl-${w.level}`}>
                      <Svg name={LEVEL_ICON[w.level]} label={t(`level.${w.level}`)} />
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
                </Tip>
              )}
              {touch && expanded === i && (
                <div class="warn-expanded">
                  <WarningCard build={build} result={result} w={w} />
                  {w.action !== undefined && (
                    <button class="btn" data-testid="warning-go" onClick={() => onPick(w.action)}>
                      <Svg name="chevron" />
                      {t("wd.goTo")}
                    </button>
                  )}
                </div>
              )}
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

/** Icon of each matchup fit: check, a neutral dash, a cross. */
export const FIT_ICON = { good: "check", neutral: "neutral", bad: "error" } as const;

export function Matchups({
  build,
  readonly,
  onChange,
  size = 120,
}: {
  build: Build;
  readonly: boolean;
  onChange: (m: Matchup[]) => void;
  /** Portrait size of the rated gods (the unrated pool is smaller). */
  size?: number;
}) {
  const { t, data, locale } = useApp();
  const help = useHelp();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<Matchup["fit"] | "none" | null>(null);
  const list = build.matchups ?? [];
  const [overGod, setOverGod] = useState<string | null>(null);
  /** Puts `god` in `fit` (none: unrated), before `before` or else last of that group. */
  const place = (god: string, fit: Matchup["fit"] | undefined, before?: string) => {
    const cur = list.find((m) => m.god === god);
    const rest = list.filter((m) => m.god !== god);
    if (!fit) return onChange(rest);
    const at = before
      ? rest.findIndex((m) => m.god === before)
      : rest.findLastIndex((m) => m.fit === fit) + 1 || rest.length;
    const next = [...rest];
    next.splice(at < 0 ? rest.length : at, 0, { ...cur, god, fit });
    onChange(next);
  };
  const setFit = (god: string, fit: Matchup["fit"] | undefined) => {
    if (list.find((m) => m.god === god)?.fit === fit) return;
    place(god, fit);
  };
  /** ← → move a rated god inside its group. */
  const shift = (god: string, delta: -1 | 1) => {
    const m = list.find((x) => x.god === god);
    if (!m) return;
    const group = list.filter((x) => x.fit === m.fit);
    const k = group.indexOf(m) + delta;
    if (k < 0 || k >= group.length) return;
    place(god, m.fit, delta < 0 ? group[k]!.god : group[k + 1]?.god);
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-testid="matchup-${god}"]`)?.focus(),
    );
  };
  const cycle = (god: string) => {
    const order: (Matchup["fit"] | undefined)[] = [undefined, "good", "neutral", "bad"];
    const cur = list.find((m) => m.god === god)?.fit;
    setFit(god, order[(order.indexOf(cur) + 1) % order.length]);
  };
  /** Drop target for a column (or the unrated pool, `none`). */
  const target = (fit: Matchup["fit"] | "none") =>
    readonly
      ? {}
      : {
          onDragOver: (e: DragEvent) => {
            if (!dragging) return;
            e.preventDefault();
            setOver(fit);
          },
          onDragLeave: (e: DragEvent) => {
            if (!(e.currentTarget as Node).contains(e.relatedTarget as Node | null)) setOver(null);
          },
          onDrop: (e: DragEvent) => {
            e.preventDefault();
            if (dragging) {
              const to = fit === "none" ? undefined : fit;
              /** On the column (not on a god): last of the group, even within the same group. */
              if (to && list.find((m) => m.god === dragging)?.fit === to) place(dragging, to);
              else setFit(dragging, to);
            }
            setDragging(null);
            setOver(null);
            setOverGod(null);
          },
        };
  const portrait = (god: string, size: number) => {
    const g = data.gods.get(god);
    const m = list.find((x) => x.god === god);
    const label = [g ? text(locale, g.name) : god, m?.why ? text(locale, m.why) : ""]
      .filter(Boolean)
      .join("\n");
    if (readonly)
      return (
        <EntityIcon
          key={god}
          id={god}
          pantheon={g?.pantheon ?? build.pantheon}
          size={size}
          detail={m?.why ? text(locale, m.why) : undefined}
        />
      );
    return (
      <Tip key={god} label={[label, help("editor.matchupGod")].filter(Boolean).join("\n")}>
        <button
          class={`portrait-btn ${dragging === god ? "dragging" : ""} ${overGod === god && dragging !== god ? "drop-before" : ""}`}
          aria-label={label}
          draggable
          data-testid={`matchup-${god}`}
          onDragStart={(e) => {
            e.dataTransfer?.setData("text/plain", god);
            setDragging(god);
          }}
          onDragEnd={() => {
            setDragging(null);
            setOver(null);
            setOverGod(null);
          }}
          /* dropped on a rated god: it goes right before it, in its group */
          onDragOver={(e) => {
            if (!dragging || !m) return;
            e.preventDefault();
            setOverGod(god);
          }}
          onDragLeave={() => setOverGod((x) => (x === god ? null : x))}
          onDrop={(e) => {
            if (!dragging || !m) return;
            e.preventDefault();
            e.stopPropagation();
            if (dragging !== god) place(dragging, m.fit, god);
            setDragging(null);
            setOver(null);
            setOverGod(null);
          }}
          onKeyDown={(e) => {
            if (!m || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
            e.preventDefault();
            shift(god, e.key === "ArrowLeft" ? -1 : 1);
          }}
          onClick={() => cycle(god)}
        >
          <EntityIcon id={god} pantheon={g?.pantheon ?? build.pantheon} size={size} tip={false} />
        </button>
      </Tip>
    );
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
          <div
            key={c.fit}
            class={`matchup-col ${c.fit} ${over === c.fit ? "drop-target" : ""}`}
            data-testid={`matchup-col-${c.fit}`}
            {...target(c.fit)}
          >
            <h3 class={c.fit === "good" ? "lvl-info" : ""}>
              <Svg name={FIT_ICON[c.fit]} />
              <HelpText k={`result.${c.fit}`} />
            </h3>
            <div class="portraits" style={{ "--portrait-max": `${size}px` }}>
              {c.items.map((m) => portrait(m.god, size))}
              {!readonly && c.items.length === 0 && (
                <span class="drop-hint" aria-hidden="true">
                  <Svg name="plus" />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {!readonly && (
        <div
          class={`portraits matchup-pool ${over === "none" ? "drop-target" : ""}`}
          role="group"
          aria-label={t("editor.matchupPool")}
          data-testid="matchup-pool"
          {...target("none")}
        >
          {unset.map((g) => portrait(g.id, Math.round(size * 0.4)))}
        </div>
      )}
    </div>
  );
}

export function Charts({ build, result }: { build: Build; result: SimResult }) {
  const end = viewEnd(build, result);
  return (
    <div class="panel">
      <h3>
        <HelpText k="result.resources" />
      </h3>
      <ResourceChart series={result.series} end={end} />
      <h3 style={{ marginTop: "12px" }}>
        <HelpText k="result.population" />
      </h3>
      <PopChart series={result.series} end={end} />
    </div>
  );
}
