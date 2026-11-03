import { useState } from "preact/hooks";
import type { Snapshot } from "../../engine/types.ts";
import { formatClock } from "../../engine/time.ts";
import { useApp } from "../context.tsx";

const W = 600;
const H = 180;
const PAD = { l: 40, r: 8, t: 8, b: 22 };

type Line = {
  key: string;
  cls: string;
  color: string;
  values: number[];
  step?: boolean;
  label: string;
};

function niceMax(v: number): number {
  if (v <= 0) return 10;
  const exp = 10 ** Math.floor(Math.log10(v));
  const f = v / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

type ChartProps = { series: Snapshot[]; end: number };

/** `end`: the timeline's length, so every view shows the same span of the build. */
function Chart({
  series: all,
  end,
  lines: allLines,
  testid,
}: ChartProps & { lines: Line[]; testid: string }) {
  const { locale } = useApp();
  const [hover, setHover] = useState<number | null>(null);
  const shown = all.findIndex((s) => s.t > end);
  const count = shown < 0 ? all.length : shown;
  const series = all.slice(0, count);
  const lines = allLines.map((l) => ({ ...l, values: l.values.slice(0, count) }));
  if (series.length < 2) return null;
  const tMax = end;
  const yMax = niceMax(Math.max(...lines.flatMap((l) => l.values)));
  const x = (t: number) => PAD.l + (t / Math.max(tMax, 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / yMax) * (H - PAD.t - PAD.b);
  const path = (l: Line) =>
    series
      .map((s, i) => {
        const v = l.values[i] ?? 0;
        if (i === 0) return `M${x(s.t)},${y(v)}`;
        return l.step ? `H${x(s.t)}V${y(v)}` : `L${x(s.t)},${y(v)}`;
      })
      .join("");
  const minuteStep = tMax > 900 ? 300 : tMax > 300 ? 60 : 30;
  const ticks: number[] = [];
  for (let t = 0; t <= tMax; t += minuteStep) ticks.push(t);
  const h = hover === null ? null : series[hover];
  const fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

  return (
    <div class="chart" data-testid={testid}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={lines.map((l) => l.label).join(", ")}
        onPointerMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const t = ((px - PAD.l) / (W - PAD.l - PAD.r)) * tMax;
          const i = series.findIndex((s) => s.t >= t);
          setHover(i < 0 ? series.length - 1 : i);
        }}
        onPointerLeave={() => setHover(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line class="grid" x1={PAD.l} x2={W - PAD.r} y1={y(yMax * f)} y2={y(yMax * f)} />
            <text x={PAD.l - 4} y={y(yMax * f) + 4} text-anchor="end">
              {fmt.format(yMax * f)}
            </text>
          </g>
        ))}
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={H - 6} text-anchor="middle">
            {formatClock(t)}
          </text>
        ))}
        <line class="axis" x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} />
        {lines.map((l) => (
          <path key={l.key} class={`line ${l.cls}`} d={path(l)} style={{ stroke: l.color }} />
        ))}
        {h && hover !== null && (
          <g>
            <line class="axis" x1={x(h.t)} x2={x(h.t)} y1={PAD.t} y2={H - PAD.b} />
            {/* right of the cursor in the left half, left of it in the right half: never cut */}
            <text
              x={x(h.t) < W / 2 ? x(h.t) + 4 : x(h.t) - 4}
              y={PAD.t + 10}
              text-anchor={x(h.t) < W / 2 ? "start" : "end"}
            >
              {formatClock(h.t)} · {lines.map((l) => fmt.format(l.values[hover] ?? 0)).join(" / ")}
            </text>
          </g>
        )}
      </svg>
      <div class="legend">
        {lines.map((l) => (
          <span key={l.key} class={l.cls} style={{ "--c": l.color }}>
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ResourceChart({ series, end }: ChartProps) {
  const { t } = useApp();
  const lines: Line[] = (["food", "wood", "gold", "favor"] as const).map((r) => ({
    key: r,
    cls: `res-${r}`,
    color: `var(--res-${r})`,
    values: series.map((s) => s.resources[r]),
    label: t(`res.${r}`),
  }));
  return <Chart series={series} end={end} lines={lines} testid="chart-resources" />;
}

export function PopChart({ series, end }: ChartProps) {
  const { t } = useApp();
  const lines: Line[] = [
    {
      key: "pop",
      cls: "",
      color: "var(--ok)",
      values: series.map((s) => s.pop),
      step: true,
      label: t("result.used"),
    },
    {
      key: "cap",
      cls: "",
      color: "var(--bad)",
      values: series.map((s) => s.popCap),
      step: true,
      label: t("result.cap"),
    },
  ];
  return <Chart series={series} end={end} lines={lines} testid="chart-pop" />;
}
