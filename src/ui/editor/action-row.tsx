import { useState } from "preact/hooks";
import type { Action, Build, TaskTarget, When } from "../../engine/build.ts";
import { formatClock, isClock } from "../../engine/time.ts";
import type { ActionOutcome, SimWarning } from "../../engine/types.ts";
import { warningText } from "../../engine/format.ts";
import { text } from "../../i18n/index.ts";
import { useApp } from "../context.tsx";
import { EntityIcon, Tip } from "../icon.tsx";
import { KIND_ICON, Svg } from "../svg.tsx";
import { actionIcons, actionText, targetLabel, taskTargets } from "./labels.ts";

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
  drag: {
    start: (i: number) => void;
    over: (i: number) => void;
    drop: (i: number) => void;
    end: () => void;
    from: number | null;
    target: number | null;
  };
};

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
      class={`action-row kind-${a.do} ${level ? `bg-${level}` : ""} ${drag.from === index ? "dragging" : ""} ${drag.target === index && drag.from !== index ? "drop-target" : ""}`}
      data-testid="action-row"
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
        <Tip label={t(`action.${a.do}`)}>
          <span class="lvl-info" aria-label={t(`action.${a.do}`)}>
            <Svg name={KIND_ICON[a.do] ?? "info"} />
          </span>
        </Tip>
        <span class="action-label">
          {actionIcons(a).map((id) => (
            <EntityIcon key={id} id={id} pantheon={build.pantheon} size={28} />
          ))}
          <Tip label={[actionText(c, a), times, tip].filter(Boolean).join("\n")}>
            <span class="label-text">{actionText(c, a)}</span>
          </Tip>
        </span>
        {level && (
          <Tip label={tip} focusable>
            <span class={`lvl-${level}`}>
              <Svg name={level === "error" ? "error" : "warning"} label={tip} />
            </span>
          </Tip>
        )}
        <select
          value={mode}
          disabled={readonly}
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
        <span class="action-times num">
          {outcome?.startedAt !== undefined ? formatClock(outcome.startedAt) : "—"}
        </span>
        <Tip label={t("row.edit")}>
          <button
            class="btn icon-only"
            aria-expanded={open}
            aria-label={t("row.edit")}
            data-testid="row-edit"
            onClick={() => setOpen(!open)}
          >
            <Svg name="gear" />
          </button>
        </Tip>
        {!readonly && (
          <>
            <Tip label={props.isMilestone ? t("editor.removeMilestone") : t("editor.addMilestone")}>
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
          </>
        )}
      </div>
      {open && (
        <fieldset class="action-details" disabled={readonly} style={{ border: 0, margin: 0 }}>
          <label class="field">
            {t("row.when")}
            <span class="num">{times}</span>
          </label>
          {(a.do === "train" || a.do === "promote") && (
            <label class="field">
              {t("row.count")}
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
              {t("row.rally")}
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
              {t("row.target")}
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
                {t("row.builder")}
                <select
                  value={a.builder ? Object.keys(a.builder)[0] : "auto"}
                  onChange={(e) => {
                    const m = e.currentTarget.value;
                    const ref =
                      others.find((x) => build.actions.indexOf(x) < index)?.id ??
                      others[0]?.id ??
                      "";
                    if (m === "auto") set({ builder: undefined });
                    else if (m === "from") set({ builder: { from: "food" } });
                    else if (m === "new") set({ builder: { new: ref } });
                    else if (m === "unit") set({ builder: { unit: soldiers[0]?.id ?? "" } });
                    else set({ builder: { same: ref } });
                  }}
                >
                  <option value="auto">{t("row.builderAuto")}</option>
                  <option value="from">{t("row.builderFrom")}</option>
                  <option value="new" disabled={others.length === 0}>
                    {t("row.builderNew")}
                  </option>
                  <option value="same" disabled={others.length === 0}>
                    {t("row.builderSame")}
                  </option>
                  {soldiers.length > 0 && <option value="unit">{t("row.builderUnit")}</option>}
                </select>
              </label>
              {a.builder && "unit" in a.builder && (
                <label class="field">
                  {t("row.unit")}
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
                  {t("row.from")}
                  <TargetSelect
                    build={build}
                    value={a.builder.from}
                    onChange={(from) => set({ builder: { from: from ?? "food" } })}
                  />
                </label>
              )}
              {a.builder && ("new" in a.builder || "same" in a.builder) && (
                <label class="field">
                  {t("row.builder")}
                  <select
                    value={"new" in a.builder ? a.builder.new : a.builder.same}
                    onChange={(e) => {
                      const v = e.currentTarget.value;
                      set({ builder: a.builder && "new" in a.builder ? { new: v } : { same: v } });
                    }}
                  >
                    {others.map((x) => (
                      <option key={x.id} value={x.id}>
                        {build.actions.indexOf(x) + 1}. {actionText(c, x)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label class="field">
                {t("row.count")}
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
                {t("row.then")}
                <TargetSelect
                  build={build}
                  value={a.then}
                  allowEmpty
                  onChange={(then) => set({ then })}
                />
              </label>
              {data.gods.get(build.god)?.modifiers.some((m) => m.condition === "nearManor") && (
                <label class="field">
                  {t("row.nearManor")}
                  <input
                    type="checkbox"
                    checked={a.nearManor !== false}
                    onChange={(e) =>
                      set({ nearManor: e.currentTarget.checked ? undefined : false })
                    }
                  />
                </label>
              )}
            </>
          )}
          {a.do === "age" && (
            <label class="field">
              {t("row.minor")}
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
                {t("row.count")}
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
                {t("row.from")}
                <TargetSelect
                  build={build}
                  value={a.from}
                  onChange={(from) => set({ from: from ?? "food" })}
                  testid="move-from"
                />
              </label>
              <label class="field">
                {t("row.to")}
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
              {t("row.target")}
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
              {t("row.unit")}
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
                {t("row.lose")}
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
                {t("row.gainFavor")}
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
                {t("row.note")}
                <input
                  type="text"
                  value={a.note ?? ""}
                  maxLength={120}
                  onChange={(e) => set({ note: e.currentTarget.value || undefined })}
                />
              </label>
            </>
          )}
        </fieldset>
      )}
    </li>
  );
}
