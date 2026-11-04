import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import type { Action, Build, TaskTarget, When } from "../../engine/build.ts";
import { formatClock, isClock } from "../../engine/time.ts";
import type { ActionOutcome, SimWarning } from "../../engine/types.ts";
import { warningText } from "../../engine/format.ts";
import { text } from "../../i18n/index.ts";
import { useApp } from "../context.tsx";
import { EntityIcon, Tip, HelpText, useHelp, useLabel } from "../icon.tsx";
import { Svg } from "../svg.tsx";
import {
  ACTION_MIME,
  actionIcons,
  actionKind,
  actionKindIcon,
  actionText,
  doneText,
  hasDuration,
  targetLabel,
  taskTargets,
  actionTarget,
  isGatherer,
} from "./labels.ts";
import { LiveNumber, LiveText } from "../fields.tsx";

type Props = {
  build: Build;
  index: number;
  action: Action;
  outcome?: ActionOutcome;
  warnings: SimWarning[];
  readonly: boolean;
  isMilestone: boolean;
  onChange: (a: Action) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (delta: number) => void;
  onToggleMilestone: () => void;
  /** The action's time track, beside the head. */
  track?: ComponentChildren;
  drag: {
    start: (i: number) => void;
    over: (i: number) => void;
    drop: (i: number) => void;
    /** A new action dragged in from the palette, inserted before row i. */
    insert: (i: number, a: Action) => void;
    end: () => void;
    from: number | null;
    target: number | null;
  };
};

const MODE_ICON = { time: "pin", after: "link", asap: "" } as const;
const MODE_LABEL = { time: "row.atTime", after: "row.after", asap: "row.asap" } as const;

function whenMode(w: When): "time" | "asap" | "after" {
  if (typeof w === "string") return "time";
  return w.asap ? "asap" : "after";
}

function TargetSelect({
  value,
  onChange,
  build,
  unit,
  allowEmpty,
  testid,
}: {
  value: TaskTarget | undefined;
  onChange: (v: TaskTarget | undefined) => void;
  build: Build;
  /** Only targets this unit can gather. */
  unit?: string;
  allowEmpty?: boolean;
  testid?: string;
}) {
  const { data, locale, t } = useApp();
  const c = { data, pantheon: build.pantheon, locale };
  return (
    <select
      value={value ?? ""}
      data-testid={testid}
      onChange={(e) => onChange((e.currentTarget.value || undefined) as TaskTarget | undefined)}
    >
      {allowEmpty && <option value="">{t("row.none")}</option>}
      {taskTargets(data, build.pantheon, unit).map((target) => (
        <option key={target} value={target}>
          {targetLabel(c, target)}
        </option>
      ))}
    </select>
  );
}

export function ActionRow(props: Props) {
  const { build, index, action: a, outcome, warnings, readonly, onChange } = props;
  const { data, locale, t } = useApp();
  const help = useHelp();
  const label = useLabel();
  const ctx = { pantheon: build.pantheon, god: build.god };
  const [open, setOpen] = useState(false);
  const p = data.pantheons.get(build.pantheon);
  const c = { data, pantheon: build.pantheon, locale };
  const level = warnings.some((w) => w.level === "error")
    ? "error"
    : warnings.some((w) => w.level === "delay")
      ? "delay"
      : null;
  const tip = warnings
    .map((w) => `${t(`level.${w.level}`)}: ${warningText(data, build, w, locale)}`)
    .join("\n");
  const mode = whenMode(a.when);
  const kind = actionKind(a);
  const others = build.actions.filter((x, i) => i !== index && x.id);
  const set = (patch: Partial<Action>) => onChange({ ...a, ...patch } as Action);
  const units = p ? [...p.units.values()] : [];
  const earlier = build.actions.slice(0, index).filter((x) => x.id);
  /** "New villager from": earlier actions that produce villagers. */
  const trainSources = earlier.filter(
    (x) =>
      x.do === "train" && Object.keys(p?.units.get(x.unit)?.worker?.gatherRates ?? {}).length > 0,
  );
  /** "Same builder as": earlier constructions. */
  const buildSources = earlier.filter((x) => x.do === "build");
  const builderRef =
    a.do === "build" && a.builder
      ? "new" in a.builder
        ? a.builder.new
        : "same" in a.builder
          ? a.builder.same
          : ""
      : "";
  const soldiers = units.filter(
    (u) =>
      u.worker?.canBuild &&
      Object.keys(u.worker.gatherRates).length === 0 &&
      u.trainedAt.length > 0,
  );
  const buildings = p ? [...p.buildings.values()] : [];
  const worker = p?.def.workers[0];
  /** Only powers aimed at a building have a target: Time Shift and Deconstruction. */
  const powerKind = a.do === "power" ? data.powers.get(a.power)?.effect.kind : undefined;
  const powerTargets =
    powerKind === "timeShift"
      ? (data.gods.get(build.god)?.timeShift?.buildings ?? []).map((r) => r.id)
      : powerKind === "deconstruction"
        ? buildings.map((b) => b.id)
        : undefined;
  const trainSites =
    a.do === "train"
      ? buildings.filter(
          (b) => b.trains?.includes(a.unit) || p?.units.get(a.unit)?.trainedAt.includes(b.id),
        )
      : [];
  const name = (id: string) =>
    text(locale, p?.units.get(id)?.name ?? p?.buildings.get(id)?.name ?? { en: id, "pt-BR": id });

  /** Actions to wait on from their start: those that last (the start of an instant one is its end),
   *  plus the one already picked. */
  const startAnchors = others.filter(
    (x) =>
      hasDuration(x) ||
      (typeof a.when === "object" && a.when.on === "start" && a.when.after === x.id),
  );
  /** "After" and "as soon as possible" both wait on another action: switching keeps which one
   *  (by default the action before this one, from its start; or the first other one). */
  const setWhen = (m: string) => {
    if (m === "time") return set({ when: formatClock(outcome?.startedAt ?? 0) });
    const w = a.when;
    const prev = others.filter((x) => build.actions.indexOf(x) < index).at(-1);
    const anchor =
      typeof w === "object"
        ? { after: w.after, ...(w.on ? { on: w.on } : {}) }
        : prev?.id
          ? { after: prev.id, on: "start" as const }
          : others[0]?.id
            ? { after: others[0].id }
            : undefined;
    if (!anchor) return;
    const delay = typeof w === "object" && w.delay ? { delay: w.delay } : {};
    set({ when: m === "asap" ? { ...anchor, asap: true } : { ...anchor, ...delay } });
  };

  const times = [
    outcome?.startedAt !== undefined
      ? t("row.started", { t: formatClock(outcome.startedAt) })
      : t("row.notStarted"),
    outcome?.completedAt !== undefined && outcome.completedAt !== outcome.startedAt
      ? t("row.done", { t: formatClock(outcome.completedAt) })
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const drag = props.drag;
  return (
    <li
      id={`action-row-${index}`}
      tabIndex={-1}
      class={`action-row tl-row kind-${a.do === "train" && a.mode ? "rule" : a.do} ${open ? "open" : ""} ${level ? `bg-${level}` : ""} ${drag.from === index ? "dragging" : ""} ${drag.target === index && drag.from !== index ? "drop-target" : ""}`}
      data-testid="action-row"
      onClick={(e) => {
        const el = e.target as HTMLElement;
        if (el.closest("button, select, input, textarea, a, label, .action-details")) return;
        setOpen(!open);
      }}
      onDragOver={(e) => {
        if (drag.from === null && !e.dataTransfer?.types.includes(ACTION_MIME)) return;
        e.preventDefault();
        drag.over(index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const added = e.dataTransfer?.getData(ACTION_MIME);
        if (added) drag.insert(index, JSON.parse(added) as Action);
        else drag.drop(index);
      }}
    >
      <div class="tl-label action-main">
        <div
          class="action-head"
          role="button"
          tabIndex={0}
          aria-expanded={open}
          aria-label={`${t("row.edit")}: ${actionText(c, a)}`}
          data-testid="row-edit"
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
            e.preventDefault();
            setOpen(!open);
          }}
        >
          {!readonly && (
            <Tip label={t("row.drag")}>
              <button
                class="grip"
                draggable
                aria-label={t("row.drag")}
                onDragStart={(e) => {
                  e.dataTransfer?.setData("text/plain", String(index));
                  drag.start(index);
                }}
                onDragEnd={drag.end}
              >
                <Svg name="grip" />
              </button>
            </Tip>
          )}
          <span class={`row-time num ${outcome?.startedAt === undefined ? "lvl-error" : ""}`}>
            {mode !== "asap" && (
              <Tip label={[t(MODE_LABEL[mode]), help(`row.mode.${mode}`)].join("\n")}>
                <Svg name={MODE_ICON[mode]} label={t(MODE_LABEL[mode])} />
              </Tip>
            )}
            {outcome?.startedAt !== undefined ? formatClock(outcome.startedAt) : "—"}
          </span>
          <Tip
            label={[label(`action.${kind}`, ctx), help(`action.${kind}`, ctx)]
              .filter(Boolean)
              .join("\n")}
          >
            <span class="lvl-info" aria-label={label(`action.${kind}`, ctx)}>
              <Svg name={actionKindIcon(a)} />
            </span>
          </Tip>
          <span class="action-label">
            {actionIcons(a, p?.def.workers[0]).map((id) => (
              <EntityIcon key={id} id={id} pantheon={build.pantheon} size={24} />
            ))}
            <Tip label={[actionText(c, a), times, tip].filter(Boolean).join("\n")}>
              <span class="label-text">{actionText(c, a)}</span>
            </Tip>
            {actionTarget(a) && (
              <EntityIcon id={actionTarget(a)!} pantheon={build.pantheon} size={24} />
            )}
          </span>
          {level && (
            <Tip label={tip} focusable>
              <span class={`lvl-${level}`}>
                <Svg name={level === "error" ? "error" : "warning"} label={tip} />
              </span>
            </Tip>
          )}
          {props.isMilestone && (
            <span class="lvl-info milestone-flag">
              <Svg name="milestone" label={t("editor.milestones")} />
            </span>
          )}
          <span class="row-chevron" aria-hidden="true">
            <Svg name="chevron" />
          </span>
        </div>
      </div>
      {props.track}
      {open && (
        <fieldset class="action-details" disabled={readonly} style={{ border: 0, margin: 0 }}>
          <div class="field when-field">
            <HelpText k="row.when" />
            <div class="row">
              <Tip label={help(`row.mode.${mode}`)}>
                <select
                  value={mode}
                  aria-label={t("row.when")}
                  data-testid="when-mode"
                  onChange={(e) => setWhen(e.currentTarget.value)}
                >
                  <option value="time">{t("row.atTime")}</option>
                  <option value="asap" disabled={others.length === 0}>
                    {t("row.asap")}
                  </option>
                  <option value="after" disabled={others.length === 0}>
                    {t("row.after")}
                  </option>
                </select>
              </Tip>
              {mode === "time" && (
                <input
                  class="time"
                  type="text"
                  inputMode="numeric"
                  aria-label={t("row.atTime")}
                  data-testid="when-time"
                  disabled={readonly}
                  value={a.when as string}
                  onChange={(e) => {
                    const v = e.currentTarget.value.trim();
                    if (isClock(v)) set({ when: v });
                    else e.currentTarget.value = a.when as string;
                  }}
                />
              )}
              {typeof a.when === "object" && (
                <>
                  <select
                    value={a.when.on === "start" ? `${a.when.after}@start` : a.when.after}
                    disabled={readonly}
                    aria-label={t(MODE_LABEL[mode])}
                    data-testid="when-after"
                    onChange={(e) => {
                      const [after, on] = e.currentTarget.value.split("@");
                      const { delay, asap } = a.when as { delay?: number; asap?: true };
                      set({
                        when: {
                          after: after!,
                          ...(on === "start" ? { on: "start" as const } : {}),
                          ...(delay ? { delay } : {}),
                          ...(asap ? { asap } : {}),
                        },
                      });
                    }}
                  >
                    <optgroup label={t("row.afterDone")}>
                      {others.map((x) => (
                        <option key={x.id} value={x.id}>
                          {build.actions.indexOf(x) + 1}. {doneText(c, x)}
                        </option>
                      ))}
                    </optgroup>
                    {startAnchors.length > 0 && (
                      <optgroup label={t("row.afterStart")}>
                        {startAnchors.map((x) => (
                          <option key={x.id} value={`${x.id}@start`}>
                            {build.actions.indexOf(x) + 1}. {actionText(c, x)}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  {mode === "after" && (
                    <LiveNumber
                      class="small"
                      min={0}
                      aria-label={t("row.delay")}
                      data-testid="when-delay"
                      disabled={readonly}
                      value={a.when.delay ?? 0}
                      onValue={(raw) => {
                        const delay = Number(raw);
                        const { after, on } = a.when as { after: string; on?: "start" };
                        set({
                          when: { after, ...(on ? { on } : {}), ...(delay > 0 ? { delay } : {}) },
                        });
                      }}
                    />
                  )}
                </>
              )}
              <span class="action-times num">{times}</span>
            </div>
          </div>
          {a.do === "empower" && (
            <>
              <label class="field">
                <HelpText k="row.by" ctx={ctx} />
                <select
                  value={a.by}
                  data-testid="empower-by"
                  onChange={(e) => set({ by: e.currentTarget.value })}
                >
                  {(p?.def.empower?.sources ?? [])
                    .filter((src) => !src.gods || src.gods.includes(build.god))
                    .map((src) => (
                      <option key={src.unit} value={src.unit}>
                        {name(src.unit)}
                      </option>
                    ))}
                </select>
              </label>
              <label class="field">
                <HelpText k="row.slot" />
                <LiveNumber
                  class="small"
                  min={1}
                  value={a.slot ?? 1}
                  onValue={(raw) => {
                    const v = Math.max(1, Math.round(Number(raw) || 1));
                    set({ slot: v > 1 ? v : undefined });
                  }}
                />
              </label>
              <label class="field">
                <HelpText k="row.target" />
                <select
                  value={a.building}
                  onChange={(e) => set({ building: e.currentTarget.value })}
                >
                  {(p?.def.empower?.targets ?? []).map((id) => (
                    <option key={id} value={id}>
                      {name(id)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {a.do === "summon" && (
            <>
              <label class="field">
                <HelpText k="row.count" />
                <LiveNumber
                  class="small"
                  min={1}
                  value={a.count ?? 1}
                  onValue={(raw) => set({ count: Math.max(1, Math.round(Number(raw) || 1)) })}
                />
              </label>
              {p?.units.get(a.unit)?.carcass !== undefined && (
                <label class="field">
                  <HelpText k="row.huntIt" />
                  <input
                    type="checkbox"
                    checked={a.hunt === true}
                    onChange={(e) => set({ hunt: e.currentTarget.checked || undefined })}
                  />
                </label>
              )}
            </>
          )}
          {a.do === "train" && (
            <label class="field">
              <HelpText k="row.trainMode" />
              <select
                value={a.mode ?? "count"}
                data-testid="row-train-mode"
                onChange={(e) => {
                  const m = e.currentTarget.value;
                  set(
                    m === "auto"
                      ? { mode: m, count: undefined, duration: undefined, until: undefined }
                      : { mode: undefined, count: 1, duration: undefined, until: undefined },
                  );
                }}
              >
                {(["count", "auto"] as const).map((m) => (
                  <option key={m} value={m}>
                    {t(`row.trainMode.${m}`)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {a.do === "train" && a.mode === "auto" && (
            <label class="field">
              <HelpText k="row.duration" />
              <LiveNumber
                class="small"
                min={1}
                step={5}
                placeholder="—"
                value={a.duration ?? ""}
                data-testid="row-duration"
                onValue={(raw) => {
                  const v = Math.round(Number(raw) || 0);
                  set({ duration: v > 0 ? v : undefined, until: undefined });
                }}
              />
            </label>
          )}
          {((a.do === "train" && !a.mode) || a.do === "promote") && (
            <label class="field">
              <HelpText k="row.count" />
              <LiveNumber
                class="small"
                min={1}
                value={a.count ?? 1}
                data-testid="row-count"
                onValue={(raw) => set({ count: Math.max(1, Math.round(Number(raw) || 1)) })}
              />
            </label>
          )}
          {a.do === "train" && isGatherer(data, build.pantheon, a.unit) && (
            <label class="field">
              <HelpText k="row.rally" />
              <TargetSelect
                build={build}
                unit={a.unit}
                value={a.rally}
                allowEmpty
                onChange={(rally) => set({ rally })}
                testid="row-rally"
              />
            </label>
          )}
          {a.do === "train" && trainSites.length > 1 && (
            <label class="field">
              <HelpText k="row.trainAt" />
              <select
                value={a.at ?? ""}
                onChange={(e) => set({ at: e.currentTarget.value || undefined })}
              >
                <option value="">{t("row.any")}</option>
                {trainSites.map((b) => (
                  <option key={b.id} value={b.id}>
                    {text(locale, b.name)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {a.do === "build" && (
            <>
              <label class="field">
                <HelpText k="row.builder" ctx={ctx} />
                <select
                  value={a.builder ? Object.keys(a.builder)[0] : ""}
                  data-testid="row-builder"
                  onChange={(e) => {
                    const m = e.currentTarget.value;
                    if (m === "from") set({ builder: { from: "food" } });
                    else if (m === "new") set({ builder: { new: trainSources.at(-1)?.id ?? "" } });
                    else if (m === "unit") set({ builder: { unit: soldiers[0]?.id ?? "" } });
                    else set({ builder: { same: buildSources.at(-1)?.id ?? "" } });
                  }}
                >
                  {/* the player picks who builds, as in the game; old builds may have none */}
                  {!a.builder && <option value="" disabled />}
                  <option value="from">{t("row.builderFrom")}</option>
                  <option value="new" disabled={trainSources.length === 0}>
                    {t("row.builderNew")}
                  </option>
                  <option value="same" disabled={buildSources.length === 0}>
                    {t("row.builderSame")}
                  </option>
                  {soldiers.length > 0 && <option value="unit">{t("row.builderUnit")}</option>}
                </select>
              </label>
              {a.builder && "unit" in a.builder && (
                <label class="field">
                  <HelpText k="row.unit" />
                  <select
                    value={a.builder.unit}
                    onChange={(e) => set({ builder: { unit: e.currentTarget.value } })}
                  >
                    {soldiers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {name(u.id)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {a.builder && "from" in a.builder && (
                <label class="field">
                  <HelpText k="row.from" />
                  <TargetSelect
                    build={build}
                    unit={worker}
                    value={a.builder.from}
                    onChange={(from) => set({ builder: { from: from ?? "food" } })}
                  />
                </label>
              )}
              {a.builder && ("new" in a.builder || "same" in a.builder) && (
                <label class="field">
                  <HelpText k={"new" in a.builder ? "row.builderNewFrom" : "row.builderSameAs"} />
                  <select
                    value={builderRef}
                    data-testid="builder-source"
                    onChange={(e) => {
                      const v = e.currentTarget.value;
                      set({ builder: a.builder && "new" in a.builder ? { new: v } : { same: v } });
                    }}
                  >
                    {("new" in a.builder ? trainSources : buildSources).map((x) => (
                      <option key={x.id} value={x.id}>
                        {build.actions.indexOf(x) + 1}. {actionText(c, x)}
                      </option>
                    ))}
                    {!("new" in a.builder ? trainSources : buildSources).some(
                      (x) => x.id === builderRef,
                    ) && <option value={builderRef}>⚠ {t("row.invalidRef")}</option>}
                  </select>
                </label>
              )}
              <label class="field">
                <HelpText k="row.count" />
                <LiveNumber
                  class="small"
                  min={1}
                  value={a.builders ?? 1}
                  onValue={(raw) => {
                    const v = Math.max(1, Math.round(Number(raw) || 1));
                    set({ builders: v > 1 ? v : undefined });
                  }}
                />
              </label>
              {!(a.builder && "unit" in a.builder) && (
                <label class="field">
                  <HelpText k="row.then" />
                  <TargetSelect
                    build={build}
                    unit={worker}
                    value={a.then}
                    allowEmpty
                    onChange={(then) => set({ then })}
                  />
                </label>
              )}
              {data.gods.get(build.god)?.modifiers.some((m) => m.condition === "nearManor") && (
                <label class="field">
                  <HelpText k="row.nearManor" />
                  <LiveNumber
                    class="small"
                    min={0}
                    max={8}
                    value={a.nearManor === false ? 0 : (a.manors ?? 1)}
                    onValue={(raw) => {
                      const n = Math.max(0, Math.min(8, Math.round(Number(raw) || 0)));
                      set({ manors: n === 1 ? undefined : n, nearManor: undefined });
                    }}
                  />
                </label>
              )}
            </>
          )}
          {a.do === "age" && (
            <label class="field">
              <HelpText k="row.minor" />
              <select value={a.minor} onChange={(e) => set({ minor: e.currentTarget.value })}>
                {(data.gods.get(build.god)?.minors[a.to] ?? []).map((m) => (
                  <option key={m} value={m}>
                    {text(locale, data.minors.get(m)?.name ?? { en: m, "pt-BR": m })}
                  </option>
                ))}
              </select>
            </label>
          )}
          {a.do === "move" && (
            <>
              <label class="field">
                <HelpText k="row.count" />
                <LiveNumber
                  class="small"
                  min={1}
                  value={a.count}
                  onValue={(raw) => set({ count: Math.max(1, Math.round(Number(raw) || 1)) })}
                />
              </label>
              <label class="field">
                <HelpText k="row.from" />
                <TargetSelect
                  build={build}
                  unit={a.unit ?? worker}
                  value={a.from}
                  onChange={(from) => set({ from: from ?? "food" })}
                  testid="move-from"
                />
              </label>
              <label class="field">
                <HelpText k="row.to" />
                <TargetSelect
                  build={build}
                  unit={a.unit ?? worker}
                  value={a.to}
                  onChange={(to) => set({ to: to ?? "wood" })}
                  testid="move-to"
                />
              </label>
            </>
          )}
          {a.do === "power" && powerTargets && (
            <label class="field">
              <HelpText k="row.target" />
              <select
                value={a.target ?? ""}
                onChange={(e) => set({ target: e.currentTarget.value || undefined })}
              >
                <option value="">{t("row.none")}</option>
                {powerTargets?.map((id) => (
                  <option key={id} value={id}>
                    {name(id)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {a.do === "power" && (
            <label class="field" style={{ flex: 1 }}>
              <HelpText k="row.powerNote" />
              <LiveText
                value={a.note ?? ""}
                maxLength={120}
                placeholder={t("row.powerNoteExample")}
                data-testid="row-power-note"
                onValue={(raw) => set({ note: raw.trim() || undefined })}
              />
            </label>
          )}
          {a.do === "event" && (
            <>
              <label class="field">
                <HelpText k="row.lose" />
                <span class="row">
                  <select
                    value={Object.keys(a.lose ?? {})[0] ?? ""}
                    onChange={(e) => {
                      const u = e.currentTarget.value;
                      const n = Object.values(a.lose ?? {})[0] ?? 1;
                      set({ lose: u ? { [u]: n } : undefined });
                    }}
                  >
                    <option value="">{t("row.none")}</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {name(u.id)}
                      </option>
                    ))}
                  </select>
                  <LiveNumber
                    class="small"
                    min={1}
                    value={Object.values(a.lose ?? {})[0] ?? 1}
                    onValue={(raw) => {
                      const u = Object.keys(a.lose ?? {})[0];
                      if (u)
                        set({
                          lose: {
                            [u]: Math.max(1, Math.round(Number(raw) || 1)),
                          },
                        });
                    }}
                  />
                </span>
              </label>
              <label class="field">
                <HelpText k="row.gainFavor" />
                <LiveNumber
                  class="small"
                  min={0}
                  value={a.gainFavor ?? 0}
                  onValue={(raw) => {
                    const v = Number(raw);
                    set({ gainFavor: v > 0 ? v : undefined });
                  }}
                />
              </label>
              {(["food", "wood", "gold"] as const).map((r) => (
                <label class={`field res-${r}`} key={r}>
                  {t(`res.${r}`)}
                  <LiveNumber
                    class="small"
                    min={0}
                    value={a.gainResource?.[r] ?? 0}
                    onValue={(raw) => {
                      const v = Number(raw);
                      const next = { ...(a.gainResource ?? {}) };
                      if (v > 0) next[r] = v;
                      else delete next[r];
                      set({ gainResource: Object.keys(next).length ? next : undefined });
                    }}
                  />
                </label>
              ))}
              <label class="field" style={{ flex: 1 }}>
                <HelpText k="row.note" />
                <LiveText
                  value={a.note ?? ""}
                  maxLength={120}
                  onValue={(raw) => set({ note: raw || undefined })}
                />
              </label>
            </>
          )}
          {!readonly && (
            <div class="row-tools" role="toolbar" aria-label={t("row.edit")}>
              <Tip
                label={props.isMilestone ? t("editor.removeMilestone") : t("editor.addMilestone")}
              >
                <button
                  class="btn icon-only"
                  aria-pressed={props.isMilestone}
                  aria-label={
                    props.isMilestone ? t("editor.removeMilestone") : t("editor.addMilestone")
                  }
                  onClick={props.onToggleMilestone}
                >
                  <Svg name="milestone" />
                </button>
              </Tip>
              <Tip label={t("row.up")}>
                <button
                  class="btn icon-only"
                  aria-label={t("row.up")}
                  disabled={index === 0}
                  onClick={() => props.onMove(-1)}
                >
                  <Svg name="up" />
                </button>
              </Tip>
              <Tip label={t("row.down")}>
                <button
                  class="btn icon-only"
                  aria-label={t("row.down")}
                  disabled={index === build.actions.length - 1}
                  onClick={() => props.onMove(1)}
                >
                  <Svg name="down" />
                </button>
              </Tip>
              <Tip label={t("row.duplicate")}>
                <button
                  class="btn icon-only"
                  aria-label={t("row.duplicate")}
                  onClick={props.onDuplicate}
                >
                  <Svg name="copy" />
                </button>
              </Tip>
              <Tip label={t("row.remove")}>
                <button
                  class="btn icon-only danger"
                  aria-label={t("row.remove")}
                  data-testid="row-remove"
                  onClick={props.onRemove}
                >
                  <Svg name="trash" />
                </button>
              </Tip>
            </div>
          )}
        </fieldset>
      )}
    </li>
  );
}
