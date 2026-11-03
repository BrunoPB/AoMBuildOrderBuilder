import { type ComponentChildren, Fragment } from "preact";
import { useRef, useState } from "preact/hooks";
import type { Action, Build } from "../../engine/build.ts";
import type { Step, StepAction } from "../../engine/format.ts";
import { formatClock } from "../../engine/time.ts";
import type { SimResult } from "../../engine/types.ts";
import { entityName } from "../../data/catalog.ts";
import { useApp, useViewPref } from "../context.tsx";
import { EntityIcon, HelpText, Tip, useHelp } from "../icon.tsx";
import { KIND_ICON, Svg } from "../svg.tsx";
import { ActionRow } from "./action-row.tsx";
import { ACTION_MIME, nextActionId, startState } from "./labels.ts";
import { fixedTime, moveWithTime, placeByTime, plannedTime } from "./order.ts";
import { LEVEL_ICON } from "./warning-card.tsx";
import { AutoTag, EntityIconByIcon, focusAction } from "./result.tsx";
import {
  ActionTrack,
  Axis,
  BuildingLanes,
  EconomyStrip,
  makeScale,
  type Scale,
  useFloatTip,
  useWidth,
  viewEnd,
} from "./timeline.tsx";

/** The "Events" checkbox (units ready, buildings done… between the actions); hidden for now. */
const SHOW_EVENTS_TOGGLE = false;

/** Seconds per pixel choices; 0 fits the whole build in the available width. */
const ZOOMS = [0, 2, 4] as const;

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

function EventRow({ build, event, scale }: { build: Build; event: Event; scale: Scale }) {
  const help = useHelp();
  const { item } = event;
  const kind = "notice" in item ? "notice" : item.kind;
  return (
    <li
      class={`event-row tl-row kind-${kind} ${"auto" in item && item.auto ? "auto-step" : ""}`}
      data-testid={"auto" in item && item.auto ? "auto-step" : "timeline-row"}
    >
      <div class="tl-label">
        <span class="row-time num">{formatClock(event.seconds)}</span>
        {"notice" in item ? (
          <Tip label={help("warn.sourceDepletedIdle")}>
            <span class="event-text lvl-delay">
              <Svg name={LEVEL_ICON.delay} /> {item.notice}
            </span>
          </Tip>
        ) : (
          <span class="event-text">
            <Svg name={KIND_ICON[item.kind] ?? "info"} />
            {item.icons.map((icon, k) => (
              <EntityIconByIcon key={k} icon={icon} build={build} size={20} />
            ))}
            <span class="label-text">
              {item.byLabel ? `${item.byLabel} · ` : ""}
              {item.text}
            </span>
            {item.to && <EntityIcon id={item.to} pantheon={build.pantheon} size={20} tip={false} />}
            {item.auto && <AutoTag />}
          </span>
        )}
      </div>
      <div class="tl-track">
        {/* at the very end the dot stays inside the track (half of it would stick out) */}
        <span
          class="tl-dot"
          style={{ left: `min(${scale.pct(event.seconds)}, calc(100% - 4px))` }}
        />
      </div>
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
    <li class="start-row tl-row" data-testid="start-row">
      <div class="tl-label">
        <span class="row-time num">0:00</span>
        <Tip label={tip} focusable>
          <span class="start-items">
            <Svg name="flag" label={t("editor.start")} />
            {start.units.map(([id, n]) => (
              <span key={id} class="start-item">
                <EntityIcon id={id} pantheon={build.pantheon} size={24} tip={false} />
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
      </div>
      <div class="tl-track start-res">
        {start.resources.map(([r, n]) => (
          <span key={r} class={`start-item res-${r}`}>
            <EntityIcon id={r} pantheon={build.pantheon} size={16} tip={false} />
            <span class="num">{n}</span>
          </span>
        ))}
      </div>
    </li>
  );
}

/** The build actions in order, each beside its time track (start, waits, units, buildings),
 *  under a shared time axis with the workers strip; building lanes and simulation events
 *  can be shown in the same grid. */
export function ActionList({
  build,
  result,
  steps,
  readonly,
  update,
  palette,
}: {
  build: Build;
  result?: SimResult;
  steps: Step[];
  readonly: boolean;
  update: (b: Build) => void;
  /** The add-action palette, shown at the start of the toolbar. */
  palette?: ComponentChildren;
}) {
  const { t } = useApp();
  const help = useHelp();
  /** Off: only automatic steps stay between the actions (the player still has to do them). The
   *  start and end marks on each action's track say enough, so the checkbox is hidden for now
   *  and events stay off; SHOW_EVENTS_TOGGLE brings it back. */
  const [eventsPref, setEvents] = useViewPref<boolean>("actions.events", false);
  const events = SHOW_EVENTS_TOGGLE && eventsPref;
  const [lanesOpen, setLanesOpen] = useViewPref<boolean>("actions.lanes", false);
  const [zoom, setZoom] = useViewPref<number>("actions.zoom", 0, ZOOMS);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragTarget, setDragTarget] = useState<number | null>(null);
  const [tip, tipNode] = useFloatTip();
  const [boxRef, boxWidth] = useWidth<HTMLDivElement>();
  const setActions = (actions: Action[]) => update({ ...build, actions });
  /** When each action really starts (what its row shows); its asked time before simulating. */
  const times = build.actions.map((a, i) => result?.actions[i]?.startedAt ?? fixedTime(a.when));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= build.actions.length || from === to) return;
    setActions(moveWithTime(build.actions, times, from, to));
  };
  const insert = (at: number, added: Action) => {
    const actions = [...build.actions];
    actions.splice(at, 0, { ...added, id: nextActionId(build) });
    setActions(actions);
    requestAnimationFrame(() => focusAction(at));
  };
  /** Replaces action i, keeping the list in time order when its time changed (a fixed time, or
   *  "after" another action: that one's simulated time plus the delay). */
  const change = (i: number, next: Action) => {
    const prev = build.actions[i]!;
    const actions = [...build.actions];
    actions[i] = next;
    const own =
      next.when === prev.when ? undefined : plannedTime(next, build.actions, result?.actions ?? []);
    if (own === undefined) return setActions(actions);
    actions[i] = { ...next, id: next.id ?? nextActionId(build) };
    const placed = placeByTime(actions, times, i, own);
    setActions(placed.actions);
    if (placed.index !== i) requestAnimationFrame(() => focusAction(placed.index));
  };
  const milestoneIds = new Set((build.milestones ?? []).map((m) => m.atAction));

  const end = viewEnd(result, times);
  const width = boxWidth || 800;
  /** Narrow screens put the track under the label instead of beside it. */
  const stacked = width < 600;
  const labelPx = stacked ? 0 : Math.min(380, Math.round(width * 0.4));
  const trackPx = zoom ? Math.ceil(end * zoom) : Math.max(120, width - labelPx - 2);
  const scale = makeScale(end, trackPx);
  const minute = 60 * scale.pxPerSec;

  /** Vertical line through every row at the mouse position, with its time on the axis.
   *  Set straight on the DOM so moving the mouse does not re-render the list. */
  const axisRef = useRef<HTMLDivElement>(null);
  const cursorTimeRef = useRef<HTMLSpanElement>(null);
  const moveCursor = (clientX: number | null) => {
    const box = boxRef.current;
    const axis = axisRef.current?.getBoundingClientRect();
    if (!box || !axis) return;
    const at = clientX === null ? -1 : (clientX - axis.left) / axis.width;
    if (at < 0 || at > 1) return box.classList.remove("cursor-on");
    box.classList.add("cursor-on");
    box.style.setProperty("--tl-cursor", `${at * 100}%`);
    /** The label slides from right of the line to left of it, so it never leaves the track. */
    box.style.setProperty("--tl-cursor-shift", `${-at * 100}%`);
    if (cursorTimeRef.current) cursorTimeRef.current.textContent = formatClock(at * scale.end);
  };

  /** Events go after the last action that started before them: at the same second the event comes
   *  first (an age reached before the action that needs it), unless it is that action's own effect. */
  const placed = new Map<number, Event[]>();
  if (result) {
    for (const e of sideEvents(steps)) {
      if (!events && !("auto" in e.item && e.item.auto)) continue;
      const own = "action" in e.item ? e.item.action : undefined;
      let at = -1;
      result.actions.forEach((o, i) => {
        if (o.startedAt === undefined) return;
        const s = Math.round(o.startedAt);
        if (s < e.seconds || (s === e.seconds && own === i)) at = i;
      });
      placed.set(at, [...(placed.get(at) ?? []), e]);
    }
  }
  const eventRows = (at: number) =>
    (placed.get(at) ?? []).map((e, k) => (
      <EventRow key={`e${at}-${k}`} build={build} event={e} scale={scale} />
    ));

  return (
    <div class="panel tl-panel">
      <div class="tl-toolbar">
        {palette}
        <div class="tl-tools">
          <div class="segmented" role="group" aria-label={t("production.zoom")}>
            {ZOOMS.map((z) => (
              <Tip key={z} label={help(z ? "production.zoom" : "tl.fit")}>
                <button
                  class="chip"
                  aria-pressed={zoom === z}
                  aria-label={z ? `${t("production.zoom")} ${z}×` : t("tl.fit")}
                  data-testid={`zoom-${z || "fit"}`}
                  onClick={() => setZoom(z)}
                >
                  {z ? `${z}×` : <Svg name="fit" />}
                </button>
              </Tip>
            ))}
          </div>
          {SHOW_EVENTS_TOGGLE && result && (
            <label class="switch">
              <input
                type="checkbox"
                checked={events}
                data-testid="show-events"
                onChange={(e) => setEvents(e.currentTarget.checked)}
              />
              <HelpText k="editor.events" />
            </label>
          )}
        </div>
      </div>
      <div
        ref={boxRef}
        class={`tl ${zoom ? "zoomed" : ""} ${stacked ? "stacked" : ""}`}
        style={{
          "--tl-label": stacked ? "minmax(0, 1fr)" : `${labelPx}px`,
          "--tl-track": zoom ? `${trackPx}px` : "minmax(0, 1fr)",
          "--tl-minute": `${minute}px`,
        }}
        onPointerMove={(e) => e.pointerType === "mouse" && moveCursor(e.clientX)}
        onPointerLeave={() => moveCursor(null)}
      >
        <div class="tl-head">
          <div class="tl-row tl-axis-row">
            <div class="tl-label tl-corner">
              <Tip label={help("editor.actions")} focusable>
                <Svg name="clock" label={t("editor.actions")} />
              </Tip>
            </div>
            <div class="tl-track" ref={axisRef}>
              <Axis scale={scale} />
              <span class="tl-cursor-time num" ref={cursorTimeRef} aria-hidden="true" />
            </div>
          </div>
          {result && (
            <div class="tl-row tl-strip" data-testid="workers-strip">
              <div class="tl-label">
                <Tip label={help("tl.workers")}>
                  <span class="row">
                    <Svg name="users" />
                    {t("tl.workers")}
                  </span>
                </Tip>
              </div>
              <div class="tl-track">
                <EconomyStrip
                  series={result.series}
                  scale={scale}
                  tip={tip}
                  pantheon={build.pantheon}
                />
              </div>
            </div>
          )}
        </div>
        <ol
          class={`actions-list tl-list ${result ? "with-events" : ""} ${
            dragTarget === build.actions.length ? "drop-end" : ""
          }`}
          data-testid="timeline"
          onDragOver={(e) => {
            if (readonly || !e.dataTransfer?.types.includes(ACTION_MIME)) return;
            e.preventDefault();
            if (!(e.target as HTMLElement).closest(".action-row"))
              setDragTarget(build.actions.length);
          }}
          onDragLeave={(e) => {
            if (!(e.currentTarget as Node).contains(e.relatedTarget as Node | null))
              setDragTarget(null);
          }}
          onDrop={(e) => {
            const added = e.dataTransfer?.getData(ACTION_MIME);
            if (!added) return;
            e.preventDefault();
            insert(build.actions.length, JSON.parse(added) as Action);
            setDragTarget(null);
          }}
        >
          <StartRow
            build={build}
            idleAtStart={result?.series.find((x) => x.t >= 5)?.alloc.idle ?? 0}
          />
          {eventRows(-1)}
          {build.actions.map((a, i) => {
            const warnings = (result?.warnings ?? []).filter(
              (w) => w.action === i && w.level !== "info",
            );
            return (
              <Fragment key={a.id ?? i}>
                <ActionRow
                  build={build}
                  index={i}
                  action={a}
                  outcome={result?.actions[i]}
                  warnings={warnings}
                  readonly={readonly}
                  isMilestone={!!a.id && milestoneIds.has(a.id)}
                  track={
                    <ActionTrack
                      build={build}
                      action={a}
                      index={i}
                      result={result}
                      warnings={warnings}
                      scale={scale}
                      tip={tip}
                      readonly={readonly}
                      onTime={(sec) => change(i, { ...a, when: formatClock(sec) } as Action)}
                    />
                  }
                  onChange={(next) => change(i, next)}
                  onRemove={() => {
                    const removed = build.actions[i];
                    update({
                      ...build,
                      actions: build.actions.filter((_, k) => k !== i),
                      milestones: (build.milestones ?? []).filter(
                        (m) => m.atAction !== removed?.id,
                      ),
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
                    insert: (k, added) => {
                      insert(k, added);
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
            );
          })}
        </ol>
        {build.actions.length === 0 && <p class="action-times tl-empty">{t("editor.empty")}</p>}
        {result && result.production.lanes.length > 0 && (
          <div class="tl-lanes" data-testid="building-lanes">
            <button
              type="button"
              class="tl-row tl-lanes-toggle"
              aria-expanded={lanesOpen}
              data-testid="toggle-lanes"
              onClick={() => setLanesOpen(!lanesOpen)}
            >
              <span class="tl-label">
                <Svg name="chevron" />
                <Svg name="hammer" />
                <HelpText k="tl.lanes" />
                <span class="num">{result.production.lanes.length}</span>
              </span>
              <span class="tl-track" />
            </button>
            {lanesOpen && (
              <ol class="tl-list">
                <BuildingLanes build={build} result={result} scale={scale} tip={tip} />
              </ol>
            )}
          </div>
        )}
      </div>
      {tipNode}
    </div>
  );
}
