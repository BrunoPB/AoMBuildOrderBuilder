import { Fragment } from "preact";
import { useState } from "preact/hooks";
import type { Action, Build } from "../../engine/build.ts";
import type { Step, StepAction } from "../../engine/format.ts";
import { formatClock } from "../../engine/time.ts";
import type { SimResult, Snapshot } from "../../engine/types.ts";
import { entityName } from "../../data/catalog.ts";
import { useApp } from "../context.tsx";
import { EntityIcon, HelpText, Tip } from "../icon.tsx";
import { KIND_ICON, Svg } from "../svg.tsx";
import { ActionRow } from "./action-row.tsx";
import { nextActionId, startState } from "./labels.ts";
import { ProductionChart } from "./production.tsx";
import { EntityIconByIcon } from "./result.tsx";

const RES = ["food", "wood", "gold", "favor"] as const;

type Event = { seconds: number; item: StepAction | { notice: string } };

/** Simulation events that are not the start of a build action (units ready, buildings done…). */
function sideEvents(steps: Step[]): Event[] {
  const started = new Set<number>();
  const out: Event[] = [];
  for (const step of steps) {
    for (const a of step.actions) {
      if (a.action !== undefined && !started.has(a.action)) {
        started.add(a.action);
        continue;
      }
      out.push({ seconds: step.seconds, item: a });
    }
    if (step.notice) out.push({ seconds: step.seconds, item: { notice: step.notice } });
  }
  return out;
}

function Pop({ snap }: { snap?: Snapshot }) {
  const { t } = useApp();
  if (!snap) return <span class="row-pop" />;
  const alloc = RES.map((r) => `${t(`res.${r}`)} ${snap.alloc[r] ?? 0}`).join(" · ");
  const full = snap.pop >= snap.popCap;
  return (
    <Tip label={`${t("result.pop")} ${snap.pop}/${snap.popCap}\n${alloc}`}>
      <span class={`row-pop num ${full ? "lvl-delay" : ""}`}>
        {snap.pop}/{snap.popCap}
      </span>
    </Tip>
  );
}

function EventRow({ build, event, snap }: { build: Build; event: Event; snap?: Snapshot }) {
  const { item } = event;
  return (
    <li class="event-row" data-testid="timeline-row">
      <span class="row-time num">{formatClock(event.seconds)}</span>
      {"notice" in item ? (
        <span class="event-text lvl-delay">
          <Svg name="warning" /> {item.notice}
        </span>
      ) : (
        <span class={`event-text kind-${item.kind}`}>
          <Svg name={KIND_ICON[item.kind] ?? "info"} />
          {item.icons.map((icon, k) => (
            <EntityIconByIcon key={k} icon={icon} build={build} size={22} />
          ))}
          <span class="label-text">
            {item.byLabel ? `${item.byLabel} · ` : ""}
            {item.text}
          </span>
          {item.to && <EntityIcon id={item.to} pantheon={build.pantheon} size={22} tip={false} />}
        </span>
      )}
      <Pop snap={snap} />
    </li>
  );
}

/** Row 0:00: units, buildings and resources the pantheon (and god) start with. */
function StartRow({ build, idleAtStart }: { build: Build; idleAtStart: number }) {
  const { t, data, locale } = useApp();
  const start = startState(data, build);
  const name = (id: string, count: number) =>
    `${count} ${entityName(data, build.pantheon, id, locale, count)}`;
  const tip = [
    t("editor.start"),
    start.units.map(([id, n]) => name(id, n)).join(", "),
    start.buildings.map(([id, n]) => name(id, n)).join(", "),
    start.resources.map(([r, n]) => `${n} ${t(`res.${r}`).toLowerCase()}`).join(" · "),
    idleAtStart > 0 ? t("editor.startIdle", { count: idleAtStart }) : "",
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <li class="start-row" data-testid="start-row">
      <span class="row-time num">0:00</span>
      <Tip label={tip} focusable>
        <span class="start-items">
          <Svg name="flag" label={t("editor.start")} />
          {start.units.map(([id, n]) => (
            <span key={id} class="start-item">
              <EntityIcon id={id} pantheon={build.pantheon} size={26} tip={false} />
              <span class="num">{n}</span>
            </span>
          ))}
          {start.resources.map(([r, n]) => (
            <span key={r} class={`start-item res-${r}`}>
              <EntityIcon id={r} pantheon={build.pantheon} size={18} tip={false} />
              <span class="num">{n}</span>
            </span>
          ))}
        </span>
      </Tip>
      {idleAtStart > 0 && (
        <span class="lvl-delay row start-idle" data-testid="start-idle">
          <Svg name="warning" label={t("editor.startIdle", { count: idleAtStart })} />
          <span class="num">{idleAtStart}</span>
        </span>
      )}
    </li>
  );
}

/** The build actions in order, each with its simulated start; optionally interleaved with the
 *  simulation events (the timeline), or shown as the production chart. */
export function ActionList({
  build,
  result,
  steps,
  readonly,
  update,
}: {
  build: Build;
  result?: SimResult;
  steps: Step[];
  readonly: boolean;
  update: (b: Build) => void;
}) {
  const { t } = useApp();
  const [view, setView] = useState<"list" | "production">("list");
  const [events, setEvents] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragTarget, setDragTarget] = useState<number | null>(null);
  const setActions = (actions: Action[]) => update({ ...build, actions });
  const move = (from: number, to: number) => {
    if (to < 0 || to >= build.actions.length || from === to) return;
    const actions = [...build.actions];
    const [item] = actions.splice(from, 1);
    actions.splice(to, 0, item!);
    setActions(actions);
  };
  const milestoneIds = new Set((build.milestones ?? []).map((m) => m.atAction));

  const snaps = new Map<number, Snapshot>();
  for (const s of result?.series ?? []) {
    const k = Math.floor(s.t);
    if (!snaps.has(k)) snaps.set(k, s);
  }
  const snapAt = (sec?: number) => {
    if (sec === undefined) return undefined;
    for (let k = Math.round(sec); k >= 0; k--) {
      const s = snaps.get(k);
      if (s) return s;
    }
    return undefined;
  };

  /** Events go after the last action that started at or before them. */
  const placed = new Map<number, Event[]>();
  if (events && result) {
    for (const e of sideEvents(steps)) {
      let at = -1;
      result.actions.forEach((o, i) => {
        if (o.startedAt !== undefined && Math.round(o.startedAt) <= e.seconds) at = i;
      });
      placed.set(at, [...(placed.get(at) ?? []), e]);
    }
  }
  const eventRows = (at: number) =>
    (placed.get(at) ?? []).map((e, k) => (
      <EventRow key={`e${at}-${k}`} build={build} event={e} snap={snapAt(e.seconds)} />
    ));

  return (
    <div class="panel">
      <div class="list-head">
        <h3>
          <Svg name="list" />
          <HelpText k="editor.actions" /> <span class="num">{build.actions.length}</span>
        </h3>
        <div class="segmented" role="group" aria-label={t("editor.actions")}>
          {(["list", "production"] as const).map((v) => (
            <button
              key={v}
              class="chip"
              aria-pressed={view === v}
              data-testid={`view-${v}`}
              onClick={() => setView(v)}
            >
              <Svg name={v === "list" ? "list" : "hammer"} />
              {t(`editor.view.${v}`)}
            </button>
          ))}
        </div>
        {view === "list" && result && (
          <label class="switch">
            <input
              type="checkbox"
              checked={events}
              data-testid="show-events"
              onChange={(e) => setEvents(e.currentTarget.checked)}
            />
            <Svg name="clock" />
            <HelpText k="editor.events" />
          </label>
        )}
      </div>
      {view === "production" && result ? (
        <ProductionChart build={build} result={result} />
      ) : (
        <ol
          class={`actions-list ${events ? "with-events" : ""}`}
          data-testid={events ? "timeline" : "actions-list"}
        >
          <StartRow
            build={build}
            idleAtStart={result?.series.find((x) => x.t >= 5)?.alloc.idle ?? 0}
          />
          {eventRows(-1)}
          {build.actions.map((a, i) => (
            <Fragment key={a.id ?? i}>
              <ActionRow
                build={build}
                index={i}
                action={a}
                outcome={result?.actions[i]}
                warnings={(result?.warnings ?? []).filter(
                  (w) => w.action === i && w.level !== "info",
                )}
                readonly={readonly}
                isMilestone={!!a.id && milestoneIds.has(a.id)}
                extra={events ? <Pop snap={snapAt(result?.actions[i]?.startedAt)} /> : undefined}
                onChange={(next) => {
                  const actions = [...build.actions];
                  actions[i] = next;
                  setActions(actions);
                }}
                onRemove={() => {
                  const removed = build.actions[i];
                  update({
                    ...build,
                    actions: build.actions.filter((_, k) => k !== i),
                    milestones: (build.milestones ?? []).filter((m) => m.atAction !== removed?.id),
                  });
                }}
                onDuplicate={() => {
                  const actions = [...build.actions];
                  actions.splice(i + 1, 0, { ...structuredClone(a), id: nextActionId(build) });
                  setActions(actions);
                }}
                onMove={(delta) => move(i, i + delta)}
                onToggleMilestone={() => {
                  const actionId = a.id ?? nextActionId(build);
                  const list = build.milestones ?? [];
                  const exists = list.some((m) => m.atAction === actionId);
                  const actions = a.id
                    ? build.actions
                    : build.actions.map((x, k) => (k === i ? { ...x, id: actionId } : x));
                  update({
                    ...build,
                    actions,
                    milestones: exists
                      ? list.filter((m) => m.atAction !== actionId)
                      : [...list, { id: actionId, atAction: actionId }],
                  });
                }}
                drag={{
                  from: dragFrom,
                  target: dragTarget,
                  start: (k) => setDragFrom(k),
                  over: (k) => setDragTarget(k),
                  drop: (k) => {
                    if (dragFrom !== null) move(dragFrom, k);
                    setDragFrom(null);
                    setDragTarget(null);
                  },
                  end: () => {
                    setDragFrom(null);
                    setDragTarget(null);
                  },
                }}
              />
              {eventRows(i)}
            </Fragment>
          ))}
        </ol>
      )}
      {view === "list" && build.actions.length === 0 && (
        <p class="action-times">{t("editor.empty")}</p>
      )}
    </div>
  );
}
