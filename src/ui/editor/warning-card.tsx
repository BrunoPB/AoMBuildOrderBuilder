import type { Build } from "../../engine/build.ts";
import { warningText } from "../../engine/format.ts";
import { formatClock } from "../../engine/time.ts";
import type { SimResult, SimWarning, Snapshot, WarningLevel } from "../../engine/types.ts";
import { useApp } from "../context.tsx";
import { EntityIcon } from "../icon.tsx";
import { Svg, type SvgName } from "../svg.tsx";
import { actionIcons, actionText } from "./labels.ts";

export const LEVEL_ICON = {
  error: "error",
  delay: "warning",
  attention: "arrows",
  info: "info",
} as const satisfies Record<WarningLevel, SvgName>;

function snapAt(series: Snapshot[], t: number): Snapshot | undefined {
  let found: Snapshot | undefined;
  for (const s of series) {
    if (s.t > t) break;
    found = s;
  }
  return found;
}

/** Numbers behind a resource wait: stock, cost, gathering rate and other spends. */
function ResourceWait({ build, result, w }: { build: Build; result: SimResult; w: SimWarning }) {
  const { t, data, locale } = useApp();
  const d = w.detail!;
  const r = d.resource!;
  const resName = t(`res.${r}`).toLowerCase();
  const need = d.need ?? 0;
  const have = d.have ?? 0;
  const reserved = d.reserved ?? 0;
  const missing = Math.max(0, Math.ceil(need - (have - reserved)));
  const spent = d.spent ?? [];
  const spentTotal = Math.round(spent.reduce((sum, x) => sum + (x.cost[r] ?? 0), 0));
  const end = Math.max(d.since, w.t - 1);
  const before = snapAt(result.series, end);
  const gathered = before ? before.resources[r] - have + spentTotal : 0;
  const span = end - d.since;
  const rate = span > 0 ? (gathered / span) * 60 : 0;
  const gatherers = snapAt(result.series, d.since)?.alloc[r] ?? 0;
  const onlyGathering = rate > 0 ? Math.round((missing / rate) * 60) : undefined;
  const waited = Number(w.params.waited ?? 0);
  const extra = onlyGathering !== undefined ? Math.max(0, Math.round(waited - onlyGathering)) : 0;
  const c = { data, pantheon: build.pantheon, locale };

  const bySource = new Map<number | undefined, { n: number; amount: number }>();
  for (const x of spent) {
    const cur = bySource.get(x.action) ?? { n: 0, amount: 0 };
    bySource.set(x.action, { n: cur.n + 1, amount: cur.amount + (x.cost[r] ?? 0) });
  }
  const icon = <EntityIcon id={r} pantheon={build.pantheon} size={16} tip={false} />;

  return (
    <>
      <div class="wd-meter" aria-hidden="true">
        <div
          class={`res-${r}`}
          style={{ width: `${Math.min(100, (have / Math.max(need, 1)) * 100)}%` }}
        />
      </div>
      <dl class="wd-grid">
        <dt>{t("wd.need")}</dt>
        <dd class="num">
          {Math.round(need)} {icon}
        </dd>
        <dt>{t("wd.have", { t: formatClock(d.since) })}</dt>
        <dd class="num">
          {have} {icon}
        </dd>
        {reserved > 0 && (
          <>
            <dt>{t("wd.reserved")}</dt>
            <dd class="num lvl-delay">−{reserved}</dd>
          </>
        )}
        <dt>{t("wd.missing")}</dt>
        <dd class="num lvl-error wd-strong">{missing}</dd>
        <dt>{t("wd.gathering")}</dt>
        <dd class="num wd-ok">
          {t("wd.gatherers", { count: gatherers })} · ~{Math.round(rate)}/min
        </dd>
      </dl>
      <div class="wd-section">
        <span class="wd-label">{t("wd.spent", { resource: resName })}</span>
        {bySource.size === 0 ? (
          <span class="wd-muted">{t("wd.noSpent")}</span>
        ) : (
          <ul class="wd-list">
            {[...bySource].map(([action, s]) => {
              const a = action !== undefined ? build.actions[action] : undefined;
              return (
                <li key={action ?? -1}>
                  {a &&
                    actionIcons(a)
                      .slice(0, 1)
                      .map((id) => (
                        <EntityIcon
                          key={id}
                          id={id}
                          pantheon={build.pantheon}
                          size={16}
                          tip={false}
                        />
                      ))}
                  <span>{a ? actionText(c, a) : t("wd.other")}</span>
                  {s.n > 1 && <span class="num wd-muted">{s.n}×</span>}
                  <span class="num lvl-error">−{Math.round(s.amount)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {onlyGathering !== undefined && (
        <p class="wd-why">
          {t("wd.onlyGathering", { missing, resource: resName, s: onlyGathering })}
          {spentTotal > 0 && extra > 0 && (
            <> {t("wd.spentDelay", { total: spentTotal, s: extra })}</>
          )}
        </p>
      )}
    </>
  );
}

/** Formatted explanation of one warning: what happened, when, and the numbers behind it. */
export function WarningCard({
  build,
  result,
  w,
}: {
  build: Build;
  result: SimResult;
  w: SimWarning;
}) {
  const { t, data, locale } = useApp();
  const a = w.action !== undefined ? build.actions[w.action] : undefined;
  const c = { data, pantheon: build.pantheon, locale };
  const waited = typeof w.params.waited === "number" ? w.params.waited : undefined;
  const helpKey = `help.${w.key}`;
  const explain = t(helpKey) === helpKey ? "" : t(helpKey);
  const phases = w.detail?.phases ?? [];
  return (
    <div class={`wd-card wd-${w.level}`}>
      <div class={`wd-title lvl-${w.level}`}>
        <Svg name={LEVEL_ICON[w.level]} />
        <span>{warningText(data, build, w, locale)}</span>
      </div>
      {a && (
        <div class="wd-action">
          {actionIcons(a)
            .slice(0, 2)
            .map((id) => (
              <EntityIcon key={id} id={id} pantheon={build.pantheon} size={20} tip={false} />
            ))}
          <span>
            {w.action! + 1}. {actionText(c, a)}
          </span>
        </div>
      )}
      {waited !== undefined && (
        <div class="wd-time">
          <Svg name="clock" />
          <span>{t("wd.waited", { waited })}</span>
          <span class="num wd-muted">
            {formatClock(w.t - waited)} → {formatClock(w.t)}
          </span>
        </div>
      )}
      {phases.length > 0 && (
        <ul class="wd-list wd-phases">
          {[...phases, { t: w.detail!.since, key: w.key, params: w.params }].map((p, k, all) => {
            const next = all[k + 1]?.t ?? w.t;
            return (
              <li key={k}>
                <span class="num wd-muted">{formatClock(p.t)}</span>
                <span>
                  {warningText(
                    data,
                    build,
                    { ...w, key: p.key, params: { ...p.params, waited: Math.round(next - p.t) } },
                    locale,
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {w.detail?.resource && <ResourceWait build={build} result={result} w={w} />}
      {explain && <p class="wd-explain">{explain}</p>}
    </div>
  );
}
