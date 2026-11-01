import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { entityName } from "../../data/catalog.ts";
import type { Action, Build } from "../../engine/build.ts";
import { formatClock } from "../../engine/time.ts";
import type { ProductionSpan, SimResult, SimWarning, Snapshot } from "../../engine/types.ts";
import { useApp } from "../context.tsx";
import { EntityIcon } from "../icon.tsx";

/** Seconds → position on the track, as a percentage of the timeline length. */
export type Scale = { end: number; pct: (t: number) => string; pxPerSec: number };

export function makeScale(end: number, trackPx: number): Scale {
  const len = Math.max(end, 1);
  return {
    end: len,
    pct: (t: number) => `${(Math.min(Math.max(t, 0), len) / len) * 100}%`,
    pxPerSec: trackPx / len,
  };
}

/** Tick step (s) so labels stay readable at the current width. */
export function tickStep(pxPerSec: number): number {
  for (const s of [30, 60, 120, 300, 600]) if (s * pxPerSec >= 56) return s;
  return 900;
}

export const SPAN_KIND: Record<ProductionSpan["kind"], string> = {
  unit: "kind-train",
  research: "kind-research",
  age: "kind-age",
  build: "kind-build",
  shift: "kind-power",
};

/** Actions that happen in an instant: drawn as a diamond, not a bar. */
const INSTANT = new Set<Action["do"]>([
  "move",
  "power",
  "event",
  "stopAutoTrain",
  "stopTrainWhenAffordable",
  "empower",
]);
const RULES = new Set<Action["do"]>(["autoTrain", "trainWhenAffordable"]);

/** A tooltip that floats above the hovered bar (bars are absolutely placed, so no Tip host). */
export type FloatTip = { show: (el: Element, text: string) => void; hide: () => void };

export function useFloatTip(): [FloatTip, ComponentChildren] {
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const api: FloatTip = {
    show: (el, text) => {
      const r = el.getBoundingClientRect();
      const x = Math.min(Math.max(r.left + r.width / 2, 130), window.innerWidth - 130);
      setTip({ text, x, y: r.top });
    },
    hide: () => setTip(null),
  };
  const node = tip ? (
    <div
      class="tip-bubble gantt-float"
      role="tooltip"
      style={{ left: `${tip.x}px`, top: `${tip.y}px` }}
    >
      {tip.text}
    </div>
  ) : null;
  return [api, node];
}

/** Width of an element, kept up to date. */
export function useWidth<T extends HTMLElement>(): [{ current: T | null }, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

export function Axis({ scale, hover }: { scale: Scale; hover?: number | null }) {
  const step = tickStep(scale.pxPerSec);
  const ticks: number[] = [];
  for (let s = 0; s <= scale.end; s += step) ticks.push(s);
  return (
    <div class="tl-axis" aria-hidden="true">
      {ticks.map((s) => (
        <span key={s} class="tl-tick num" style={{ left: scale.pct(s) }}>
          {formatClock(s)}
        </span>
      ))}
      {hover != null && (
        <span class="tl-hover num" style={{ left: scale.pct(hover) }}>
          {formatClock(hover)}
        </span>
      )}
    </div>
  );
}

const ALLOC = ["food", "wood", "gold", "favor", "build", "idle"] as const;

/** Stacked area of what the workers are doing over time. */
export function EconomyStrip({
  series,
  scale,
  tip,
}: {
  series: Snapshot[];
  scale: Scale;
  tip: FloatTip;
}) {
  const { t } = useApp();
  if (series.length === 0) return null;
  const total = (s: Snapshot) => ALLOC.reduce((n, k) => n + (s.alloc[k] ?? 0), 0);
  const max = Math.max(1, ...series.map(total));
  const H = 100;
  const layers = ALLOC.map((k, li) => {
    const top: string[] = [];
    const bottom: string[] = [];
    for (const s of series) {
      const below = ALLOC.slice(0, li).reduce((n, x) => n + (s.alloc[x] ?? 0), 0);
      const above = below + (s.alloc[k] ?? 0);
      top.push(`${s.t},${H - (above / max) * H}`);
      bottom.unshift(`${s.t},${H - (below / max) * H}`);
    }
    return { k, points: [...top, ...bottom].join(" ") };
  });
  const describe = (s: Snapshot) =>
    [
      `${formatClock(s.t)} · ${t("result.pop")} ${s.pop}/${s.popCap}`,
      ALLOC.filter((k) => s.alloc[k])
        .map((k) => `${t(k === "build" ? "tl.building" : `res.${k}`)} ${s.alloc[k]}`)
        .join(" · "),
    ].join("\n");
  return (
    <svg
      class="tl-economy"
      viewBox={`0 0 ${scale.end} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={t("tl.workers")}
      onPointerMove={(e) => {
        const r = (e.currentTarget as SVGElement).getBoundingClientRect();
        const sec = ((e.clientX - r.left) / r.width) * scale.end;
        const snap = [...series].reverse().find((s) => s.t <= sec) ?? series[0]!;
        const host = (e.currentTarget as SVGElement).parentElement!;
        const fake = {
          getBoundingClientRect: () =>
            new DOMRect(e.clientX - 1, host.getBoundingClientRect().top, 2, 2),
        } as Element;
        tip.show(fake, describe(snap));
      }}
      onPointerLeave={tip.hide}
    >
      {layers.map((l) => (
        <polygon key={l.k} class={`tl-alloc alloc-${l.k}`} points={l.points} />
      ))}
    </svg>
  );
}

function spanLabel(
  s: ProductionSpan,
  name: (id: string) => string,
  t: (k: string, p?: Record<string, string | number>) => string,
  end: number,
) {
  const what =
    s.kind === "age"
      ? `${name(s.id)}${s.minor ? ` (${name(s.minor)})` : ""}`
      : s.kind === "build"
        ? t("production.building", { building: name(s.id) })
        : s.kind === "shift"
          ? t("production.shift")
          : name(s.id);
  const until = s.end === undefined ? t("production.running") : formatClock(s.end);
  const lines = [
    what,
    `${formatClock(s.start)} → ${until} (${Math.round((s.end ?? end) - s.start)} s)`,
  ];
  if (s.held !== undefined) lines.push(t("production.held", { t: formatClock(s.held) }));
  return lines.join("\n");
}

function SpanBar({
  build,
  s,
  scale,
  tip,
  compact,
  hint = "",
  handle = {},
}: {
  build: Build;
  s: ProductionSpan;
  scale: Scale;
  tip: FloatTip;
  compact?: boolean;
  /** Extra tooltip line (how to drag). */
  hint?: string;
  /** Pointer handlers that let the bar be dragged in time. */
  handle?: Record<string, unknown>;
}) {
  const { t, data, locale } = useApp();
  const name = (id: string) => entityName(data, build.pantheon, id, locale);
  const stop = s.end ?? scale.end;
  const px = (stop - s.start) * scale.pxPerSec;
  const label = spanLabel(s, name, t, scale.end) + hint;
  return (
    <span
      class={`gantt-bar tl-bar ${SPAN_KIND[s.kind]} ${s.end === undefined ? "open" : ""} ${compact ? "compact" : ""} ${"onPointerDown" in handle ? "movable" : ""}`}
      style={{
        left: scale.pct(s.start),
        width: `max(3px, calc(${scale.pct(stop)} - ${scale.pct(s.start)}))`,
      }}
      tabIndex={0}
      role="img"
      aria-label={label}
      data-testid="production-bar"
      onPointerEnter={(e) => tip.show(e.currentTarget, label)}
      onPointerLeave={tip.hide}
      onFocus={(e) => tip.show(e.currentTarget, label)}
      onBlur={tip.hide}
      onDragStart={(e) => e.preventDefault()}
      {...handle}
    >
      {px >= 18 && (
        <EntityIcon
          id={s.kind === "age" && s.minor ? s.minor : s.id}
          pantheon={build.pantheon}
          size={16}
          tip={false}
        />
      )}
      {px >= 80 && <span class="bar-text">{name(s.id)}</span>}
      {s.held !== undefined && (
        <span
          class="gantt-held"
          style={{ width: `${((stop - s.held) / Math.max(stop - s.start, 1)) * 100}%` }}
        />
      )}
    </span>
  );
}

/** One building per row with what it trains, researches or builds over time. */
export function BuildingLanes({
  build,
  result,
  scale,
  tip,
}: {
  build: Build;
  result: SimResult;
  scale: Scale;
  tip: FloatTip;
}) {
  const { data, locale } = useApp();
  const { lanes, spans } = result.production;
  return (
    <>
      {lanes.map((lane) => (
        <li class="tl-row tl-lane" key={lane.uid} data-testid="production-lane">
          <div class="tl-label">
            <EntityIcon id={lane.building} pantheon={build.pantheon} size={22} />
            <span class="label-text">
              {entityName(data, build.pantheon, lane.building, locale)}
              {lane.n > 1 ? ` #${lane.n}` : ""}
            </span>
          </div>
          <div class="tl-track">
            {spans
              .filter((s) => s.lane === lane.uid)
              .map((s, k) => (
                <SpanBar key={k} build={build} s={s} scale={scale} tip={tip} />
              ))}
          </div>
        </li>
      ))}
    </>
  );
}

/** The time track of one action: waits, its bars (one per unit, building or research) or a
 *  diamond for instant actions. Bars can be dragged sideways to give the action a fixed time. */
export function ActionTrack({
  build,
  action,
  index,
  result,
  warnings,
  scale,
  tip,
  readonly,
  onTime,
}: {
  build: Build;
  action: Action;
  index: number;
  result?: SimResult;
  warnings: SimWarning[];
  scale: Scale;
  tip: FloatTip;
  readonly: boolean;
  onTime: (seconds: number) => void;
}) {
  const { t } = useApp();
  const [drag, setDrag] = useState<{ x0: number; t0: number; t: number } | null>(null);
  /** Drag state read by the pointer handlers; the state copy only redraws the ghost. */
  const live = useRef<{ x0: number; t0: number; t: number } | null>(null);
  const moved = useRef(false);
  const outcome = result?.actions[index];
  const start = outcome?.startedAt;
  const spans = (result?.production.spans ?? []).filter((s) => s.action === index);
  const waits = warnings.filter((w) => w.detail?.since !== undefined && w.t > w.detail.since);
  const rule = RULES.has(action.do);
  const instant = INSTANT.has(action.do);
  /** A rule runs until a later stop action for it starts (or to the end). */
  const stopKind = action.do === "autoTrain" ? "stopAutoTrain" : "stopTrainWhenAffordable";
  const stopAt = rule
    ? build.actions.findIndex(
        (x, k) =>
          k > index &&
          x.do === stopKind &&
          (!x.unit || x.unit === (action as { unit: string }).unit) &&
          result?.actions[k]?.startedAt !== undefined,
      )
    : -1;
  const ruleEnd = stopAt >= 0 ? result!.actions[stopAt]!.startedAt! : scale.end;

  const handle = readonly
    ? {}
    : {
        onPointerDown: (e: PointerEvent) => {
          if (start === undefined || e.button !== 0) return;
          e.stopPropagation();
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
          moved.current = false;
          live.current = { x0: e.clientX, t0: start, t: start };
          setDrag(live.current);
        },
        onPointerMove: (e: PointerEvent) => {
          const d = live.current;
          if (!d) return;
          const dx = e.clientX - d.x0;
          if (Math.abs(dx) > 3) moved.current = true;
          const sec = Math.round(Math.max(0, d.t0 + dx / scale.pxPerSec));
          if (sec !== d.t) setDrag((live.current = { ...d, t: sec }));
        },
        onPointerUp: (e: PointerEvent) => {
          const d = live.current;
          if (d) {
            const sec = Math.round(Math.max(0, d.t0 + (e.clientX - d.x0) / scale.pxPerSec));
            if (Math.abs(e.clientX - d.x0) > 3) moved.current = true;
            if (moved.current && sec !== Math.round(d.t0)) onTime(sec);
          }
          live.current = null;
          setDrag(null);
        },
        onPointerCancel: () => {
          live.current = null;
          setDrag(null);
        },
        onClick: (e: MouseEvent) => {
          if (moved.current) e.stopPropagation();
          moved.current = false;
        },
      };
  const dragTip = readonly ? "" : `\n${t("tl.dragHint")}`;

  return (
    <div class={`tl-track ${drag ? "dragging" : ""}`}>
      {waits.map((w, k) => (
        <span
          key={`w${k}`}
          class={`tl-wait lvl-${w.level}`}
          style={{
            left: scale.pct(w.detail!.since),
            width: `calc(${scale.pct(w.t)} - ${scale.pct(w.detail!.since)})`,
          }}
        />
      ))}
      {rule && start !== undefined && (
        <span
          class={`tl-rule kind-${action.do}`}
          style={{
            left: scale.pct(start),
            width: `calc(${scale.pct(ruleEnd)} - ${scale.pct(start)})`,
          }}
        />
      )}
      {spans.map((s, k) => (
        <SpanBar
          key={k}
          build={build}
          s={s}
          scale={scale}
          tip={tip}
          compact={rule}
          hint={rule ? "" : dragTip}
          handle={rule ? {} : handle}
        />
      ))}
      {start !== undefined && (instant || spans.length === 0 || rule) && (
        <span
          class={`tl-mark kind-${action.do} ${instant ? "diamond" : "pin"} ${readonly ? "" : "movable"}`}
          style={{ left: scale.pct(start) }}
          tabIndex={-1}
          aria-hidden="true"
          onPointerEnter={(e) => tip.show(e.currentTarget, `${formatClock(start)}${dragTip}`)}
          onPointerLeave={tip.hide}
          {...handle}
        />
      )}
      {drag && (
        <span class="tl-ghost" style={{ left: scale.pct(drag.t) }}>
          <span class="num">{formatClock(drag.t)}</span>
        </span>
      )}
    </div>
  );
}
