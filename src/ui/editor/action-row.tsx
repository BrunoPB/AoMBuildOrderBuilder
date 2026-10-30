import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import type { Action, Build, TaskTarget, When } from "../../engine/build.ts";
import { formatClock, isClock } from "../../engine/time.ts";
import type { ActionOutcome, SimWarning } from "../../engine/types.ts";
import { warningText } from "../../engine/format.ts";
import { text } from "../../i18n/index.ts";
import { useApp } from "../context.tsx";
import { EntityIcon, Tip, HelpText, useHelp, useLabel } from "../icon.tsx";
import { KIND_ICON, Svg } from "../svg.tsx";
import { actionIcons, actionText, targetLabel, taskTargets, actionTarget } from "./labels.ts";

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
  /** Extra content at the end of the row head (population in the timeline view). */
  extra?: ComponentChildren;
  drag: {
    start: (i: number) => void;
    over: (i: number) => void;
    drop: (i: number) => void;
    end: () => void;
    from: number | null;
    target: number | null;
  };
};

const MODE_ICON = { time: "pin", after: "link", always: "repeat", asap: "" } as const;
const MODE_LABEL = {
  time: "row.atTime",
  after: "row.after",
  always: "row.always",
  asap: "row.asap",
} as const;

function whenMode(w: When): "time" | "asap" | "after" | "always" {
  if (w === "asap" || w === "always") return w;
  return typeof w === "string" ? "time" : "after";
}

function TargetSelect({
  value,
  onChange,
  build,
  allowEmpty,
  testid,
}: {
  value: TaskTarget | undefined;
  onChange: (v: TaskTarget | undefined) => void;
  build: Build;
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
      {taskTargets(data, build.pantheon).map((target) => (
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
  const others = build.actions.filter((x, i) => i !== index && x.id);
  const set = (patch: Partial<Action>) => onChange({ ...a, ...patch } as Action);
  const units = p ? [...p.units.values()] : [];
  const earlier = build.actions.slice(0, index).filter((x) => x.id);
  /** "New villager from": earlier actions that produce villagers. */
  const trainSources = earlier.filter(
    (x) =>
      (x.do === "train" || x.do === "autoTrain") &&
      Object.keys(p?.units.get(x.unit)?.worker?.gatherRates ?? {}).length > 0,
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
  const name = (id: string) =>
    text(locale, p?.units.get(id)?.name ?? p?.buildings.get(id)?.name ?? { en: id, "pt-BR": id });

  const setWhen = (m: string) => {
    if (m === "asap" || m === "always") return set({ when: m });
    if (m === "time") return set({ when: formatClock(outcome?.startedAt ?? 0) });
    const prev = others.filter((x) => build.actions.indexOf(x) < index).at(-1) ?? others[0];
    if (prev?.id) set({ when: { after: prev.id } });
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
      class={`action-row kind-${a.do} ${open ? "open" : ""} ${level ? `bg-${level}` : ""} ${drag.from === index ? "dragging" : ""} ${drag.target === index && drag.from !== index ? "drop-target" : ""}`}
      data-testid="action-row"
      onClick={(e) => {
        const el = e.target as HTMLElement;
        if (el.closest("button, select, input, textarea, a, label, .action-details")) return;
        setOpen(!open);
      }}
      onDragOver={(e) => {
        if (drag.from === null) return;
        e.preventDefault();
        drag.over(index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        drag.drop(index);
      }}
    >
      <div class="action-main">
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
            label={[label(`action.${a.do}`, ctx), help(`action.${a.do}`, ctx)]
              .filter(Boolean)
              .join("\n")}
          >
            <span class="lvl-info" aria-label={label(`action.${a.do}`, ctx)}>
              <Svg name={KIND_ICON[a.do] ?? "info"} />
            </span>
          </Tip>
          <span class="action-label">
            {actionIcons(a, p?.def.workers[0]).map((id) => (
              <EntityIcon key={id} id={id} pantheon={build.pantheon} size={28} />
            ))}
            <Tip label={[actionText(c, a), times, tip].filter(Boolean).join("\n")}>
              <span class="label-text">{actionText(c, a)}</span>
            </Tip>
            {actionTarget(a) && (
              <EntityIcon id={actionTarget(a)!} pantheon={build.pantheon} size={28} />
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
          {props.extra}
          <span class="row-chevron" aria-hidden="true">
            <Svg name="chevron" />
          </span>
        </div>
      </div>
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
                  <option value="asap">{t("row.asap")}</option>
                  <option value="after" disabled={others.length === 0}>
                    {t("row.after")}
                  </option>
                  <option value="always">{t("row.always")}</option>
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
              {mode === "after" && typeof a.when === "object" && (
                <>
                  <select
                    value={a.when.after}
                    disabled={readonly}
                    aria-label={t("row.after")}
                    onChange={(e) =>
                      set({ when: { ...(a.when as object), after: e.currentTarget.value } as When })
                    }
                  >
                    {others.map((x) => (
                      <option key={x.id} value={x.id}>
                        {build.actions.indexOf(x) + 1}. {actionText(c, x)}
                      </option>
                    ))}
                  </select>
                  <input
                    class="small"
                    type="number"
                    min={0}
                    aria-label={t("row.delay")}
                    disabled={readonly}
                    value={a.when.delay ?? 0}
                    onChange={(e) => {
                      const delay = Number(e.currentTarget.value);
                      set({
                        when: {
                          after: (a.when as { after: string }).after,
                          ...(delay > 0 ? { delay } : {}),
                        },
                      });
                    }}
                  />
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
                <input
                  class="small"
                  type="number"
                  min={1}
                  value={a.slot ?? 1}
                  onChange={(e) => {
                    const v = Math.max(1, Math.round(Number(e.currentTarget.value) || 1));
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
                <input
                  class="small"
                  type="number"
                  min={1}
                  value={a.count ?? 1}
                  onChange={(e) =>
                    set({ count: Math.max(1, Math.round(Number(e.currentTarget.value) || 1)) })
                  }
                />
              </label>
              <label class="field">
                <HelpText k="row.huntIt" />
                <input
                  type="checkbox"
                  checked={a.hunt === true}
                  onChange={(e) => set({ hunt: e.currentTarget.checked || undefined })}
                />
              </label>
            </>
          )}
          {(a.do === "train" || a.do === "promote") && (
            <label class="field">
              <HelpText k="row.count" />
              <input
                class="small"
                type="number"
                min={1}
                value={a.count ?? 1}
                data-testid="row-count"
                onChange={(e) =>
                  set({ count: Math.max(1, Math.round(Number(e.currentTarget.value) || 1)) })
                }
              />
            </label>
          )}
          {(a.do === "train" || a.do === "autoTrain" || a.do === "trainWhenAffordable") && (
            <label class="field">
              <HelpText k="row.rally" />
              <TargetSelect
                build={build}
                value={a.rally}
                allowEmpty
                onChange={(rally) => set({ rally })}
                testid="row-rally"
              />
            </label>
          )}
          {(a.do === "train" || a.do === "autoTrain" || a.do === "trainWhenAffordable") && (
            <label class="field">
              <HelpText k="row.target" />
              <select
                value={(a.do === "trainWhenAffordable" ? a.from : a.at) ?? ""}
                onChange={(e) => {
                  const v = e.currentTarget.value || undefined;
                  set(a.do === "trainWhenAffordable" ? { from: v } : { at: v });
                }}
              >
                <option value="">{t("row.any")}</option>
                {buildings
                  .filter(
                    (b) =>
                      b.trains?.includes(a.unit) || p?.units.get(a.unit)?.trainedAt.includes(b.id),
                  )
                  .map((b) => (
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
                  value={a.builder ? Object.keys(a.builder)[0] : "auto"}
                  onChange={(e) => {
                    const m = e.currentTarget.value;
                    if (m === "auto") set({ builder: undefined });
                    else if (m === "from") set({ builder: { from: "food" } });
                    else if (m === "new") set({ builder: { new: trainSources.at(-1)?.id ?? "" } });
                    else if (m === "unit") set({ builder: { unit: soldiers[0]?.id ?? "" } });
                    else set({ builder: { same: buildSources.at(-1)?.id ?? "" } });
                  }}
                >
                  <option value="auto">{t("row.builderAuto")}</option>
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
                <input
                  class="small"
                  type="number"
                  min={1}
                  value={a.builders ?? 1}
                  onChange={(e) => {
                    const v = Math.max(1, Math.round(Number(e.currentTarget.value) || 1));
                    set({ builders: v > 1 ? v : undefined });
                  }}
                />
              </label>
              <label class="field">
                <HelpText k="row.then" />
                <TargetSelect
                  build={build}
                  value={a.then}
                  allowEmpty
                  onChange={(then) => set({ then })}
                />
              </label>
              {data.gods.get(build.god)?.modifiers.some((m) => m.condition === "nearManor") && (
                <label class="field">
                  <HelpText k="row.nearManor" />
                  <input
                    class="small"
                    type="number"
                    min={0}
                    max={8}
                    value={a.nearManor === false ? 0 : (a.manors ?? 1)}
                    onChange={(e) => {
                      const n = Math.max(
                        0,
                        Math.min(8, Math.round(Number(e.currentTarget.value) || 0)),
                      );
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
                <input
                  class="small"
                  type="number"
                  min={1}
                  value={a.count}
                  onChange={(e) =>
                    set({ count: Math.max(1, Math.round(Number(e.currentTarget.value) || 1)) })
                  }
                />
              </label>
              <label class="field">
                <HelpText k="row.from" />
                <TargetSelect
                  build={build}
                  value={a.from}
                  onChange={(from) => set({ from: from ?? "food" })}
                  testid="move-from"
                />
              </label>
              <label class="field">
                <HelpText k="row.to" />
                <TargetSelect
                  build={build}
                  value={a.to}
                  onChange={(to) => set({ to: to ?? "wood" })}
                  testid="move-to"
                />
              </label>
            </>
          )}
          {a.do === "power" && (
            <label class="field">
              <HelpText k="row.target" />
              <select
                value={a.target ?? ""}
                onChange={(e) => set({ target: e.currentTarget.value || undefined })}
              >
                <option value="">{t("row.none")}</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {text(locale, b.name)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(a.do === "stopAutoTrain" || a.do === "stopTrainWhenAffordable") && (
            <label class="field">
              <HelpText k="row.unit" />
              <select
                value={a.unit ?? ""}
                onChange={(e) => set({ unit: e.currentTarget.value || undefined })}
              >
                <option value="">{t("row.any")}</option>
                {units
                  .filter((u) => u.trainedAt.length)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {name(u.id)}
                    </option>
                  ))}
              </select>
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
                  <input
                    class="small"
                    type="number"
                    min={1}
                    value={Object.values(a.lose ?? {})[0] ?? 1}
                    onChange={(e) => {
                      const u = Object.keys(a.lose ?? {})[0];
                      if (u)
                        set({
                          lose: {
                            [u]: Math.max(1, Math.round(Number(e.currentTarget.value) || 1)),
                          },
                        });
                    }}
                  />
                </span>
              </label>
              <label class="field">
                <HelpText k="row.gainFavor" />
                <input
                  class="small"
                  type="number"
                  min={0}
                  value={a.gainFavor ?? 0}
                  onChange={(e) => {
                    const v = Number(e.currentTarget.value);
                    set({ gainFavor: v > 0 ? v : undefined });
                  }}
                />
              </label>
              {(["food", "wood", "gold"] as const).map((r) => (
                <label class={`field res-${r}`} key={r}>
                  {t(`res.${r}`)}
                  <input
                    class="small"
                    type="number"
                    min={0}
                    value={a.gainResource?.[r] ?? 0}
                    onChange={(e) => {
                      const v = Number(e.currentTarget.value);
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
                <input
                  type="text"
                  value={a.note ?? ""}
                  maxLength={120}
                  onChange={(e) => set({ note: e.currentTarget.value || undefined })}
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
