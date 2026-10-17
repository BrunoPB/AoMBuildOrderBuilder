import type { Age } from "../../data/schema.ts";
import type { Build, Matchup } from "../../engine/build.ts";
import { type Step, warningText } from "../../engine/format.ts";
import { formatClock } from "../../engine/time.ts";
import type { SimResult } from "../../engine/types.ts";
import { text } from "../../i18n/index.ts";
import { useApp } from "../context.tsx";
import { EntityIcon, Tip } from "../icon.tsx";
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
        </button>
      ))}
      {step.notice && <span class="tl-notice">⚠ {step.notice}</span>}
    </div>
  );
}

/** Steps carry icon ids; find the entity behind an icon id to show its name. */
function EntityIconByIcon({ icon, build, size }: { icon: string; build: Build; size: number }) {
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

export function Timeline({ build, steps }: { build: Build; steps: Step[] }) {
  const { t, data, locale } = useApp();
  let lastAge: Age | undefined;
  let prev: number[] | null = null;
  return (
    <div class="timeline" data-testid="timeline">
      {steps.map((step) => {
        const alloc = step.alloc.split("/").map(Number);
        const delta = prev ? alloc.map((v, i) => v - (prev![i] ?? 0)) : alloc.map(() => 0);
        prev = alloc;
        const sep = step.age && step.age !== lastAge && lastAge !== undefined;
        lastAge = step.age ?? lastAge;
        const [used, cap] = step.pop.split("/").map(Number) as [number, number];
        const full = used >= cap;
        return (
          <div key={step.seconds}>
            {sep && step.age && (
              <div class="age-sep">
                <EntityIcon id={step.age} pantheon={build.pantheon} size={24} />
                {text(locale, data.common.ages.find((a) => a.id === step.age)!.name)}
              </div>
            )}
            <div class="tl-row" data-testid="timeline-row">
              <span class="tl-time">{step.t}</span>
              <StepChips build={build} step={step} />
              <div class="tl-side">
                <Tip label={`${t("result.pop")} ${step.pop}`}>
                  <span class="pop">
                    <span class="num">{step.pop}</span>
                    <span class={`popbar ${full ? "full" : ""}`} aria-hidden="true">
                      <div
                        style={{ width: `${Math.min(100, (used / Math.max(cap, 1)) * 100)}%` }}
                      />
                    </span>
                  </span>
                </Tip>
                <Tip label={t("result.alloc")}>
                  <span class="alloc">
                    {RES.map((r, i) => (
                      <span
                        key={r}
                        class={`alloc-chip res-${r} ${delta[i] ? "changed" : ""}`}
                        aria-label={`${t(`res.${r}`)} ${alloc[i]}`}
                      >
                        {alloc[i]}
                        {delta[i] ? (
                          <span class="delta">
                            {delta[i]! > 0 ? `+${delta[i]}` : `−${-delta[i]!}`}
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </span>
                </Tip>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function WarningsPanel({ build, result }: { build: Build; result: SimResult }) {
  const { t, data, locale } = useApp();
  const shown = result.warnings.filter(
    (w) =>
      w.level !== "info" || w.key === "warn.lowConfidenceData" || w.key === "warn.sourceDepleted",
  );
  const count = (lvl: string) => shown.filter((w) => w.level === lvl).length;
  return (
    <div class="panel" data-testid="warnings">
      <h3>
        <Svg name="warning" />
        {t("result.warnings")}
      </h3>
      <div class="warn-summary">
        {(["error", "delay", "info"] as const).map((lvl) => (
          <Tip key={lvl} label={t(`level.${lvl}`)}>
            <span class={`row lvl-${lvl}`} style={{ gap: 2 }}>
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
              <button class="warn-item" onClick={() => focusAction(w.action)}>
                <span class={`lvl-${w.level}`}>
                  <Svg
                    name={w.level === "error" ? "error" : w.level === "delay" ? "warning" : "info"}
                    label={t(`level.${w.level}`)}
                  />
                </span>
                <span class="num">{formatClock(w.t)}</span>
                {w.action !== undefined && build.actions[w.action] && (
                  <span class="row" style={{ gap: 2 }}>
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
          <span class={`res-${r} row`} style={{ gap: 2 }}>
            <span class="num">{Math.floor(resources[r] ?? 0)}</span>
          </span>
        </Tip>
      ))}
    </span>
  );
}

export function Milestones({ build, result }: { build: Build; result: SimResult }) {
  const { t, locale } = useApp();
  const at = (sec?: number) =>
    sec === undefined ? undefined : result.series.find((s) => s.t >= sec)?.resources;
  const cards: {
    key: string;
    icons: string[];
    label: string;
    t?: number;
    resources?: Record<string, number>;
  }[] = [];
  for (const age of ["classical", "heroic", "mythic"] as const) {
    const times = result.ageTimes[age];
    if (!times) continue;
    cards.push({
      key: `${age}-c`,
      icons: [age],
      label: t("result.clicked"),
      t: times.clicked,
      resources: at(times.clicked),
    });
    if (times.reached !== undefined) {
      cards.push({
        key: `${age}-r`,
        icons: [age],
        label: t("result.reached"),
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
        {t("editor.milestones")}
      </h3>
      <div class="milestones" data-testid="milestones">
        {cards.map((c) => (
          <div class="milestone" key={c.key}>
            <span class="row" style={{ gap: 4 }}>
              {c.icons.map((id) => (
                <EntityIcon key={id} id={id} pantheon={build.pantheon} size={24} />
              ))}
              <span class="action-times">{c.label}</span>
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
  const { t, data, locale } = useApp();
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
        {t("editor.matchups")}
      </h3>
      <div class="matchups">
        {cols.map((c) => (
          <div key={c.fit} class={`matchup-col ${c.fit}`}>
            <h3 class={c.fit === "good" ? "lvl-info" : ""}>
              <Svg name={c.fit === "good" ? "check" : c.fit === "bad" ? "error" : "info"} />
              {t(`result.${c.fit}`)}
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
        <div class="portraits" style={{ marginTop: 8, opacity: 0.7 }}>
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
  const { t } = useApp();
  return (
    <div class="panel">
      <h3>{t("result.resources")}</h3>
      <ResourceChart series={result.series} />
      <h3 style={{ marginTop: 12 }}>{t("result.population")}</h3>
      <PopChart series={result.series} />
    </div>
  );
}
