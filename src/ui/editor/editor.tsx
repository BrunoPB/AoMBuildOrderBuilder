import { useState } from "preact/hooks";
import { type PantheonId, SOURCE_IDS, type SourceId } from "../../data/schema.ts";
import { type Action, BUILD_TYPES, type Build, type Settings } from "../../engine/build.ts";
import { text } from "../../i18n/index.ts";
import { navigate } from "../app.tsx";
import { useApp } from "../context.tsx";
import { EntityIcon, Tip } from "../icon.tsx";
import { duplicateBuild, useSimulation } from "../sim.ts";
import { Svg } from "../svg.tsx";
import { ActionRow } from "./action-row.tsx";
import { nextActionId } from "./labels.ts";
import { Palette } from "./palette.tsx";
import { Charts, Matchups, Milestones, Timeline, WarningsPanel } from "./result.tsx";

function SettingsPanel({
  build,
  readonly,
  onChange,
}: {
  build: Build;
  readonly: boolean;
  onChange: (s: Settings) => void;
}) {
  const { t, data, locale } = useApp();
  const s = build.settings ?? {};
  const d = data.common.defaults;
  const favor = data.pantheons.get(build.pantheon)?.def.favor;
  const set = (patch: Partial<Settings>) => {
    const next: Settings = { ...s, ...patch };
    for (const k of Object.keys(next) as (keyof Settings)[])
      if (next[k] === undefined) delete next[k];
    onChange(next);
  };
  const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
  const chain = s.foodChain ?? d.foodChain;
  const foodSources = SOURCE_IDS.filter((x) => data.sources.get(x)?.resource === "food");
  return (
    <details class="panel collapsible">
      <summary>
        <Svg name="gear" />
        {t("editor.settings")}
      </summary>
      <fieldset
        disabled={readonly}
        class="settings-grid"
        style={{ border: 0, padding: 0, margin: "8px 0 0" }}
      >
        <label class="field">
          {t("editor.efficiency")}
          <input
            type="number"
            step="0.01"
            min="0.1"
            max="1.5"
            placeholder={String(d.efficiency)}
            value={s.efficiency ?? ""}
            data-testid="setting-efficiency"
            onChange={(e) => set({ efficiency: num(e.currentTarget.value) })}
          />
        </label>
        <label class="field">
          {t("editor.tick")}
          <select
            value={String(s.tick ?? d.tick)}
            onChange={(e) => set({ tick: Number(e.currentTarget.value) })}
          >
            {[0.1, 0.25, 0.5, 1].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        {favor?.type === "oracles" && (
          <label class="field">
            {t("editor.oracleRate")}
            <input
              type="number"
              step="0.1"
              min={favor.min}
              max={favor.max}
              placeholder={String(favor.defaultRate)}
              value={s.oracleRate ?? ""}
              onChange={(e) => set({ oracleRate: num(e.currentTarget.value) })}
            />
          </label>
        )}
        {favor?.type === "combat" && (
          <label class="field">
            {t("editor.norseFavor")}
            <input
              type="number"
              step="0.5"
              min="0"
              placeholder={String(d.norseFavorPerMinute)}
              value={s.norseFavorPerMinute ?? ""}
              onChange={(e) => set({ norseFavorPerMinute: num(e.currentTarget.value) })}
            />
          </label>
        )}
        <label class="field">
          {t("editor.popReserved")}
          <select
            value={s.popReservedAt ?? d.popReservedAt}
            onChange={(e) => set({ popReservedAt: e.currentTarget.value as "start" | "end" })}
          >
            <option value="start">{t("editor.popStart")}</option>
            <option value="end">{t("editor.popEnd")}</option>
          </select>
        </label>
        <label class="field">
          {t("editor.window")}
          <input
            type="number"
            min="0"
            placeholder={String(d.affordableWindow)}
            value={s.affordableWindow ?? ""}
            onChange={(e) => set({ affordableWindow: num(e.currentTarget.value) })}
          />
        </label>
        {(["hunt", "berries", "herd"] as SourceId[])
          .filter((x) => data.sources.has(x))
          .map((x) => (
            <label class="field" key={x}>
              {t("editor.sourceAmount", { source: text(locale, data.sources.get(x)!.name) })}
              <input
                type="number"
                min="1"
                placeholder={String(data.sources.get(x)!.defaultAmount)}
                value={s.sourceAmounts?.[x] ?? ""}
                onChange={(e) => {
                  const v = num(e.currentTarget.value);
                  const next = { ...(s.sourceAmounts ?? {}) };
                  if (v) next[x] = v;
                  else delete next[x];
                  set({ sourceAmounts: Object.keys(next).length ? next : undefined });
                }}
              />
            </label>
          ))}
        <div class="field" style={{ gridColumn: "1 / -1" }}>
          {t("editor.foodChain")}
          <div class="row">
            {chain.map((src, i) => (
              <span class="chip" key={`${src}-${i}`}>
                <EntityIcon id={src} pantheon={build.pantheon} size={20} />
                {!readonly && chain.length > 1 && (
                  <button
                    class="grip"
                    aria-label={t("row.remove")}
                    onClick={() => set({ foodChain: chain.filter((_, k) => k !== i) })}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {!readonly &&
              foodSources
                .filter((x) => !chain.includes(x))
                .map((x) => (
                  <Tip key={x} label={text(locale, data.sources.get(x)!.name)}>
                    <button
                      class="chip"
                      aria-label={text(locale, data.sources.get(x)!.name)}
                      onClick={() => set({ foodChain: [...chain, x] })}
                    >
                      <Svg name="plus" />
                      <EntityIcon id={x} pantheon={build.pantheon} size={18} tip={false} />
                    </button>
                  </Tip>
                ))}
            {!readonly && s.foodChain && (
              <button class="chip" onClick={() => set({ foodChain: undefined })}>
                {t("editor.reset")}
              </button>
            )}
          </div>
        </div>
      </fieldset>
    </details>
  );
}

function GodPicker({
  build,
  readonly,
  onChange,
}: {
  build: Build;
  readonly: boolean;
  onChange: (b: Build) => void;
}) {
  const api = useApp();
  const { t, data, locale } = api;
  const changePantheon = async (id: PantheonId) => {
    if (id === build.pantheon) return;
    if (build.actions.length && (await api.confirm(t("editor.changePantheon"))) !== "yes") return;
    const god = data.pantheons.get(id)?.def.gods[0] ?? build.god;
    onChange({ ...build, pantheon: id, god, actions: [], milestones: [] });
  };
  const changeGod = (id: string) => {
    const g = data.gods.get(id);
    if (!g) return;
    const actions = build.actions.map((a) =>
      a.do === "age" && !g.minors[a.to].includes(a.minor)
        ? { ...a, minor: g.minors[a.to][0] ?? a.minor }
        : a,
    );
    onChange({ ...build, god: id, actions });
  };
  const setMinor = (age: "classical" | "heroic" | "mythic", minor: string) => {
    const i = build.actions.findIndex((a) => a.do === "age" && a.to === age);
    if (i >= 0) {
      const actions = [...build.actions];
      actions[i] = { ...(actions[i] as Extract<Action, { do: "age" }>), minor };
      onChange({ ...build, actions });
    } else {
      onChange({
        ...build,
        actions: [
          ...build.actions,
          { id: nextActionId(build), when: "asap", do: "age", to: age, minor },
        ],
      });
    }
  };
  const god = data.gods.get(build.god);
  const pantheons = data.common.pantheons.filter((p) => data.pantheons.has(p.id));
  return (
    <div class="panel stack" style={{ gap: 8 }}>
      <div class="row" role="group" aria-label={t("editor.pantheon")}>
        {pantheons.map((p) => (
          <Tip key={p.id} label={text(locale, p.name)}>
            <button
              class={`chip pan-${p.id}`}
              aria-pressed={build.pantheon === p.id}
              aria-label={text(locale, p.name)}
              disabled={readonly}
              data-testid={`pantheon-${p.id}`}
              onClick={() => void changePantheon(p.id)}
            >
              <EntityIcon id={p.id} pantheon={p.id} size={22} tip={false} />
            </button>
          </Tip>
        ))}
      </div>
      <div class="portraits" role="group" aria-label={t("editor.god")}>
        {(data.pantheons.get(build.pantheon)?.def.gods ?? []).map((id) => {
          const g = data.gods.get(id);
          if (!g) return null;
          return (
            <Tip key={id} label={text(locale, g.name)}>
              <button
                class="portrait-btn"
                aria-pressed={build.god === id}
                aria-label={text(locale, g.name)}
                disabled={readonly}
                data-testid={`god-${id}`}
                onClick={() => changeGod(id)}
              >
                <EntityIcon id={id} pantheon={build.pantheon} size={56} tip={false} />
              </button>
            </Tip>
          );
        })}
      </div>
      {god && (
        <div
          class="row"
          role="group"
          aria-label={t("editor.minors")}
          style={{ alignItems: "flex-start" }}
        >
          {(["classical", "heroic", "mythic"] as const).map((age) => {
            const chosen = build.actions.find(
              (a): a is Extract<Action, { do: "age" }> => a.do === "age" && a.to === age,
            )?.minor;
            return (
              <div key={age} class="row" style={{ gap: 4 }}>
                <EntityIcon id={age} pantheon={build.pantheon} size={22} />
                {god.minors[age].map((m) => {
                  const minor = data.minors.get(m);
                  const label = minor ? text(locale, minor.name) : m;
                  return (
                    <Tip key={m} label={label}>
                      <button
                        class="portrait-btn"
                        aria-pressed={chosen === m}
                        aria-label={label}
                        disabled={readonly}
                        onClick={() => setMinor(age, m)}
                      >
                        <EntityIcon id={m} pantheon={build.pantheon} size={34} tip={false} />
                      </button>
                    </Tip>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Editor({ id }: { id: string }) {
  const api = useApp();
  const { t, data, locale } = api;
  const found = api.findBuild(id);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragTarget, setDragTarget] = useState<number | null>(null);
  const build = found?.build;
  const readonly = found?.readonly ?? true;
  const sim = useSimulation(data, build, locale);

  if (!build) {
    return (
      <div class="panel">
        <p>{t("editor.notFound")}</p>
        <a class="btn" href="#/">
          {t("nav.back")}
        </a>
      </div>
    );
  }

  const update = (next: Build) => {
    if (readonly) return;
    api.saveBuild({ ...next, updatedAt: new Date().toISOString() });
  };
  const setActions = (actions: Action[]) => update({ ...build, actions });
  const move = (from: number, to: number) => {
    if (to < 0 || to >= build.actions.length || from === to) return;
    const actions = [...build.actions];
    const [item] = actions.splice(from, 1);
    actions.splice(to, 0, item!);
    setActions(actions);
  };
  const result = sim.result;
  const milestoneIds = new Set((build.milestones ?? []).map((m) => m.atAction));

  return (
    <div class="editor">
      <div class="stack">
        <div class="panel stack" style={{ gap: 8 }}>
          <div class="row">
            <a class="btn icon-only" href="#/" aria-label={t("nav.back")}>
              <Svg name="home" />
            </a>
            <input
              type="text"
              aria-label={t("editor.name")}
              data-testid="build-name"
              style={{ flex: 1, minWidth: 140, fontWeight: 700, fontSize: 18 }}
              value={build.name}
              maxLength={80}
              disabled={readonly}
              onInput={(e) => update({ ...build, name: e.currentTarget.value || build.name })}
            />
            <Tip label={t("card.play")}>
              <a
                class="btn icon-only"
                href={`#/play/${encodeURIComponent(build.id)}`}
                aria-label={t("card.play")}
                data-testid="open-match"
              >
                <Svg name="clock" />
              </a>
            </Tip>
            {readonly && (
              <button
                class="btn primary"
                data-testid="duplicate-to-edit"
                onClick={() => {
                  const copy = duplicateBuild(build, "");
                  api.saveBuild(copy);
                  navigate(`/build/${encodeURIComponent(copy.id)}`);
                }}
              >
                <Svg name="copy" />
                {t("card.duplicateToEdit")}
              </button>
            )}
          </div>
          {readonly && (
            <span class="lvl-info row">
              <Svg name="info" /> {t("editor.readonly")}
            </span>
          )}
          <div class="row" role="group" aria-label={t("editor.type")}>
            {BUILD_TYPES.map((ty) => (
              <button
                key={ty}
                class="chip"
                aria-pressed={build.type === ty}
                disabled={readonly}
                onClick={() => update({ ...build, type: ty })}
              >
                <span class={`type-tag type-${ty}`}>{t(`type.${ty}`)}</span>
              </button>
            ))}
            <input
              type="text"
              aria-label={t("editor.author")}
              placeholder={t("editor.author")}
              value={build.author ?? ""}
              maxLength={80}
              disabled={readonly}
              onInput={(e) => update({ ...build, author: e.currentTarget.value || undefined })}
            />
          </div>
        </div>

        <div class="panel stack" style={{ gap: 8 }}>
          {(["objective", "end"] as const).map((field) => (
            <label class="field" key={field}>
              {t(`editor.${field}`)}
              <textarea
                rows={2}
                maxLength={300}
                disabled={readonly}
                data-testid={`build-${field}`}
                value={build[field]?.[locale] ?? ""}
                onInput={(e) => {
                  const value = e.currentTarget.value;
                  const next = { ...(build[field] ?? {}), [locale]: value || undefined };
                  if (!value) delete next[locale];
                  update({ ...build, [field]: Object.keys(next).length ? next : undefined });
                }}
              />
            </label>
          ))}
        </div>

        <GodPicker build={build} readonly={readonly} onChange={update} />
        <SettingsPanel
          build={build}
          readonly={readonly}
          onChange={(settings) => update({ ...build, settings })}
        />
        {!readonly && (
          <Palette
            build={build}
            onAdd={(a) => setActions([...build.actions, { ...a, id: nextActionId(build) }])}
          />
        )}

        <div class="panel">
          <h3>
            <Svg name="list" />
            {t("editor.actions")} <span class="num">{build.actions.length}</span>
          </h3>
          {build.actions.length === 0 ? (
            <p class="action-times">{t("editor.empty")}</p>
          ) : (
            <ol class="actions-list" data-testid="actions-list">
              {build.actions.map((a, i) => (
                <ActionRow
                  key={a.id ?? i}
                  build={build}
                  index={i}
                  action={a}
                  outcome={result?.actions[i]}
                  warnings={(result?.warnings ?? []).filter(
                    (w) => w.action === i && w.level !== "info",
                  )}
                  readonly={readonly}
                  isMilestone={!!a.id && milestoneIds.has(a.id)}
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
                    end: () => {
                      setDragFrom(null);
                      setDragTarget(null);
                    },
                  }}
                />
              ))}
            </ol>
          )}
        </div>
      </div>

      <div class="stack" data-testid="result">
        {sim.error && (
          <div class="panel bg-error">
            <Svg name="error" /> {sim.error}
          </div>
        )}
        {result && (
          <>
            <Milestones build={build} result={result} />
            <WarningsPanel build={build} result={result} />
            <div class="panel">
              <h3>
                <Svg name="clock" />
                {t("result.timeline")}
              </h3>
              <Timeline build={build} steps={sim.steps} />
            </div>
            <Charts result={result} />
          </>
        )}
        <Matchups
          build={build}
          readonly={readonly}
          onChange={(matchups) => update({ ...build, matchups })}
        />
      </div>
    </div>
  );
}
