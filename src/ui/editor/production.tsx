import { useState } from "preact/hooks";
import { entityName } from "../../data/catalog.ts";
import type { Build } from "../../engine/build.ts";
import { formatClock } from "../../engine/time.ts";
import type { ProductionSpan, SimResult } from "../../engine/types.ts";
import { useApp, useViewPref } from "../context.tsx";
import { EntityIcon, HelpText, Tip, useHelp } from "../icon.tsx";
import { Svg } from "../svg.tsx";
import { useWidth, viewEnd } from "./timeline.tsx";

/** Pixels per second; 0 fits the whole build in the available width. */
const ZOOMS = [0, 2, 4] as const;
/** Width of the building names column when the chart fits the width. */
const FIT_LABEL = 170;
const KIND_CLASS: Record<ProductionSpan["kind"], string> = {
  unit: "kind-train",
  research: "kind-research",
  age: "kind-age",
  build: "kind-build",
  shift: "kind-power",
};

/** Gantt of what every building is doing over time: training, research, age ups, construction. */
export function ProductionChart({ build, result }: { build: Build; result: SimResult }) {
  const { t, data, locale } = useApp();
  const help = useHelp();
  const [zoomPref, setZoom] = useViewPref<number>("production.zoom", 0, ZOOMS);
  const [boxRef, boxWidth] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const showTip = (el: Element, text: string) => {
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(r.left + r.width / 2, 130), window.innerWidth - 130);
    setTip({ text, x, y: r.top });
  };
  const { lanes, spans } = result.production;
  const end = viewEnd(result);
  const fit = zoomPref === 0;
  const zoom = fit
    ? Math.max(0.2, ((boxWidth || 800) - FIT_LABEL - 28) / Math.max(end, 1))
    : zoomPref;
  const width = Math.floor(end * zoom) + 24;
  const name = (id: string, n = 1) => entityName(data, build.pantheon, id, locale, n);
  const ticks: number[] = [];
  for (let s = 0; s <= end; s += 30) ticks.push(s);

  const label = (s: ProductionSpan) => {
    const what =
      s.kind === "age"
        ? `${name(s.id)}${s.minor ? ` (${name(s.minor)})` : ""}`
        : s.kind === "build"
          ? t("production.building", { building: name(s.id) })
          : s.kind === "shift"
            ? t("production.shift")
            : name(s.id);
    const until = s.end === undefined ? t("production.running") : formatClock(s.end);
    const dur = Math.round((s.end ?? end) - s.start);
    const lines = [what, `${formatClock(s.start)} → ${until} (${dur} s)`];
    if (s.held !== undefined) lines.push(t("production.held", { t: formatClock(s.held) }));
    return lines.join("\n");
  };

  if (lanes.length === 0) return null;
  return (
    <div class="panel" data-testid="production">
      <div class="row" style={{ justifyContent: "space-between" }}>
        <h3>
          <Svg name="hammer" />
          <HelpText k="production.title" />
        </h3>
        <div class="segmented" role="group" aria-label={t("production.zoom")}>
          {ZOOMS.map((z) => (
            <Tip key={z} label={help(z ? "production.zoom" : "tl.fit")}>
              <button
                class="chip"
                aria-pressed={zoomPref === z}
                aria-label={z ? `${t("production.zoom")} ${z}×` : t("tl.fit")}
                onClick={() => setZoom(z)}
                data-testid={`production-zoom-${z || "fit"}`}
              >
                {z ? `${z}×` : <Svg name="fit" />}
              </button>
            </Tip>
          ))}
        </div>
      </div>
      <div
        ref={boxRef}
        class="gantt"
        style={fit ? { gridTemplateColumns: `${FIT_LABEL}px auto` } : undefined}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const track = (e.currentTarget as HTMLElement).querySelector(".gantt-track");
          if (!track) return;
          const x = e.clientX - track.getBoundingClientRect().left;
          setHover(x >= 0 && x <= end * zoom ? Math.round(x / zoom) : null);
        }}
      >
        <div class="gantt-label gantt-corner num">{hover !== null ? formatClock(hover) : ""}</div>
        <div class="gantt-track gantt-axis" style={{ width: `${width}px` }}>
          {ticks.map((s) => (
            <span
              key={s}
              class={`gantt-tick ${s % 60 === 0 ? "major" : ""}`}
              style={{ left: `${s * zoom}px` }}
            >
              {s % 60 === 0 ? formatClock(s) : ""}
            </span>
          ))}
          {hover !== null && <span class="gantt-cursor" style={{ left: `${hover * zoom}px` }} />}
        </div>
        {lanes.map((lane) => {
          const laneSpans = spans.filter((s) => s.lane === lane.uid);
          return (
            <div class="gantt-row" key={lane.uid} data-testid="production-lane">
              <div class="gantt-label">
                <EntityIcon id={lane.building} pantheon={build.pantheon} size={24} />
                <span class="label-text">
                  {name(lane.building)}
                  {lane.n > 1 ? ` #${lane.n}` : ""}
                </span>
              </div>
              <div class="gantt-track" style={{ width: `${width}px` }}>
                {ticks.map((s) => (
                  <span
                    key={s}
                    class={`gantt-grid ${s % 60 === 0 ? "major" : ""}`}
                    style={{ left: `${s * zoom}px` }}
                  />
                ))}
                {laneSpans.map((s, i) => {
                  const stop = s.end ?? end;
                  const w = Math.max(2, (stop - s.start) * zoom);
                  const heldW = s.held !== undefined ? (stop - s.held) * zoom : 0;
                  return (
                    <span
                      key={i}
                      class={`gantt-bar ${KIND_CLASS[s.kind]} ${s.end === undefined ? "open" : ""}`}
                      style={{ left: `${s.start * zoom}px`, width: `${w}px` }}
                      tabIndex={0}
                      role="img"
                      aria-label={label(s)}
                      data-testid="production-bar"
                      onPointerEnter={(e) => showTip(e.currentTarget, label(s))}
                      onPointerLeave={() => setTip(null)}
                      onFocus={(e) => showTip(e.currentTarget, label(s))}
                      onBlur={() => setTip(null)}
                    >
                      {w >= 16 && (
                        <EntityIcon
                          id={s.kind === "age" && s.minor ? s.minor : s.id}
                          pantheon={build.pantheon}
                          size={w >= 22 ? 18 : 14}
                          tip={false}
                        />
                      )}
                      {w >= 70 && <span class="label-text">{name(s.id)}</span>}
                      {heldW > 0 && <span class="gantt-held" style={{ width: `${heldW}px` }} />}
                    </span>
                  );
                })}
                {hover !== null && (
                  <span class="gantt-cursor" style={{ left: `${hover * zoom}px` }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      {tip && (
        <div
          class="tip-bubble gantt-float"
          role="tooltip"
          style={{ left: `${tip.x}px`, top: `${tip.y}px` }}
        >
          {tip.text}
        </div>
      )}
      <div class="legend" style={{ marginTop: "6px" }}>
        {(["unit", "research", "age", "build", "shift"] as const).map((k) => (
          <span key={k} class={KIND_CLASS[k]} style={{ "--c": "var(--kind)" }}>
            {t(`production.kind.${k}`)}
          </span>
        ))}
        <span class="legend-held">{t("production.heldLegend")}</span>
      </div>
    </div>
  );
}
