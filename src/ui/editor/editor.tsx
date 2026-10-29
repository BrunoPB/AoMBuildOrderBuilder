import { useEffect, useRef, useState } from "preact/hooks";
import { type PantheonId, SOURCE_IDS, type SourceId } from "../../data/schema.ts";
import { type Action, BUILD_TYPES, type Build, type Settings } from "../../engine/build.ts";
import { text } from "../../i18n/index.ts";
import { navigate } from "../app.tsx";
import { useApp } from "../context.tsx";
import { EntityIcon, Tip, HelpText, useHelp } from "../icon.tsx";
import { duplicateBuild, useSimulation } from "../sim.ts";
import { Svg } from "../svg.tsx";
import { ActionRow } from "./action-row.tsx";
import { ProductionChart } from "./production.tsx";
import { BuildActions } from "../build-actions.tsx";
import { useHistory } from "./history.ts";
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
        <HelpText k="editor.settings" />
      </summary>
      <fieldset
        disabled={readonly}
        class="settings-grid"
        style={{ border: 0, padding: 0, margin: "8px 0 0" }}
      >
        <label class="field">
          <HelpText k="editor.efficiency" />
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
          <HelpText k="editor.tick" />
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
            <HelpText k="editor.oracleRate" />
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
            <HelpText k="editor.norseFavor" />
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
          <HelpText k="editor.popReserved" />
          <select
            value={s.popReservedAt ?? d.popReservedAt}
            onChange={(e) => set({ popReservedAt: e.currentTarget.value as "start" | "end" })}
          >
            <option value="start">{t("editor.popStart")}</option>
            <option value="end">{t("editor.popEnd")}</option>
          </select>
        </label>
        <label class="field">
          <HelpText k="editor.window" />
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
              <HelpText
                k="editor.sourceAmount"
                params={{ source: text(locale, data.sources.get(x)!.name) }}
              />
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
          <HelpText k="editor.foodChain" />
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
    <div class="panel stack" style={{ gap: "8px" }}>
      <div class="row" role="group" aria-label={t("editor.pantheon")}>
        {pantheons.map((p) => (
          <button
            key={p.id}
            class={`chip pan-chip pan-${p.id}`}
            aria-pressed={build.pantheon === p.id}
            disabled={readonly}
            data-testid={`pantheon-${p.id}`}
            onClick={() => void changePantheon(p.id)}
          >
            <EntityIcon id={p.id} pantheon={p.id} size={32} tip={false} />
            {text(locale, p.name)}
          </button>
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
                <EntityIcon id={id} pantheon={build.pantheon} size={72} tip={false} />
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
              <div key={age} class="row" style={{ gap: "4px" }}>
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
  const help = useHelp();
  const { t, data, locale } = api;
  const found = api.findBuild(id);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragTarget, setDragTarget] = useState<number | null>(null);
  const [tab, setTab] = useState<"build" | "timeline" | "details">("build");
  const history = useHistory();
  const build = found?.build;
  const readonly = found?.readonly ?? true;
  const sim = useSimulation(data, build, locale);

  const keys = useRef<{ undo: () => void; redo: () => void } | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        keys.current?.undo();
      } else if (k === "y" || (k === "z" && e.shiftKey)) {
        e.preventDefault();
        keys.current?.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  const update = (next: Build, tag?: string) => {
    if (readonly) return;
    history.record(build, tag);
    api.saveBuild({ ...next, updatedAt: new Date().toISOString() });
  };
  const undo = () => {
    const previous = history.undo(build);
    if (previous) api.saveBuild({ ...previous, updatedAt: new Date().toISOString() });
  };
  const redo = () => {
    const next = history.redo(build);
    if (next) api.saveBuild({ ...next, updatedAt: new Date().toISOString() });
  };
  keys.current = readonly ? null : { undo, redo };
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

  const actionsPanel = (
    <div class="panel">
      <h3>
        <Svg name="list" />
        <HelpText k="editor.actions" /> <span class="num">{build.actions.length}</span>
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
          ))}
        </ol>
      )}
    </div>
  );

  const timelinePanel = result && (
    <div class="panel">
      <h3>
        <Svg name="clock" />
        <HelpText k="result.timeline" />
      </h3>
      <Timeline build={build} steps={sim.steps} />
    </div>
  );

  const god = data.gods.get(build.god);
  const tabs = [
    { id: "build", icon: "list" },
    { id: "timeline", icon: "clock" },
    { id: "details", icon: "gear" },
  ] as const;

  return (
    <div class="build-page">
      <header class={`panel build-header pan-${build.pantheon}`} data-testid="build-header">
        <div class="row">
          <Tip label={t("nav.back")}>
            <a class="btn icon-only" href="#/" aria-label={t("nav.back")}>
              <Svg name="home" />
            </a>
          </Tip>
          {god && <EntityIcon id={god.id} pantheon={build.pantheon} size={40} />}
          <input
            type="text"
            class="name-input"
            aria-label={t("editor.name")}
            data-testid="build-name"
            value={build.name}
            maxLength={80}
            disabled={readonly}
            onInput={(e) => update({ ...build, name: e.currentTarget.value || build.name }, "name")}
          />
          <Tip label={help(`type.${build.type}`)} focusable>
            <span class={`type-tag type-${build.type}`}>{t(`type.${build.type}`)}</span>
          </Tip>
          {readonly && (
            <Tip label={t("editor.readonly")} focusable>
              <span class="lvl-info">
                <Svg name="info" label={t("editor.readonly")} />
              </span>
            </Tip>
          )}
          {!readonly && (
            <>
              <Tip label={t("editor.undo")}>
                <button
                  class="btn icon-only"
                  aria-label={t("editor.undo")}
                  data-testid="undo"
                  disabled={!history.canUndo}
                  onClick={undo}
                >
                  <Svg name="undo" />
                </button>
              </Tip>
              <Tip label={t("editor.redo")}>
                <button
                  class="btn icon-only"
                  aria-label={t("editor.redo")}
                  data-testid="redo"
                  disabled={!history.canRedo}
                  onClick={redo}
                >
                  <Svg name="redo" />
                </button>
              </Tip>
            </>
          )}
          <BuildActions
            build={build}
            readonly={readonly}
            showDuplicate={!readonly}
            onDeleted={() => navigate("/")}
          />
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
        <div class="tabs" role="tablist" aria-label={build.name}>
          {tabs.map((tb) => (
            <Tip key={tb.id} label={help(`tab.${tb.id}`)}>
              <button
                role="tab"
                class="tab"
                aria-selected={tab === tb.id}
                data-testid={`tab-${tb.id}`}
                onClick={() => {
                  setTab(tb.id);
                  window.scrollTo({ top: 0 });
                }}
              >
                <Svg name={tb.icon} />
                {t(`tab.${tb.id}`)}
              </button>
            </Tip>
          ))}
        </div>
      </header>

      {sim.error && (
        <div class="panel bg-error">
          <Svg name="error" /> {sim.error}
        </div>
      )}

      {tab === "build" && (
        <div class="editor">
          <div class="stack">
            <GodPicker build={build} readonly={readonly} onChange={update} />
            {!readonly && (
              <Palette
                build={build}
                onAdd={(a) => setActions([...build.actions, { ...a, id: nextActionId(build) }])}
              />
            )}
            {actionsPanel}
          </div>
          <div class="stack" data-testid="result">
            {result && (
              <>
                <Milestones build={build} result={result} />
                <WarningsPanel build={build} result={result} />
                {timelinePanel}
              </>
            )}
          </div>
        </div>
      )}

      {tab === "timeline" && result && (
        <div class="stack" data-testid="timeline-tab">
          <ProductionChart build={build} result={result} />
          <div class="details-grid">
            {timelinePanel}
            <div class="stack">
              <Milestones build={build} result={result} />
              <Charts result={result} />
            </div>
          </div>
        </div>
      )}

      {tab === "details" && (
        <div class="details-grid" data-testid="details-tab">
          <div class="stack">
            <div class="panel stack" style={{ gap: "8px" }}>
              <div class="row" role="group" aria-label={t("editor.type")}>
                {BUILD_TYPES.map((ty) => (
                  <button
                    key={ty}
                    class="chip"
                    aria-pressed={build.type === ty}
                    disabled={readonly}
                    onClick={() => update({ ...build, type: ty })}
                  >
                    <Tip label={help(`type.${ty}`)}>
                      <span class={`type-tag type-${ty}`}>{t(`type.${ty}`)}</span>
                    </Tip>
                  </button>
                ))}
              </div>
              <label class="field">
                {t("editor.author")}
                <input
                  type="text"
                  value={build.author ?? ""}
                  maxLength={80}
                  disabled={readonly}
                  onInput={(e) =>
                    update({ ...build, author: e.currentTarget.value || undefined }, "author")
                  }
                />
              </label>
              {(["objective", "end"] as const).map((field) => (
                <label class="field" key={field}>
                  <HelpText k={`editor.${field}`} />
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
                      update(
                        { ...build, [field]: Object.keys(next).length ? next : undefined },
                        field,
                      );
                    }}
                  />
                </label>
              ))}
            </div>
            <SettingsPanel
              build={build}
              readonly={readonly}
              onChange={(settings) => update({ ...build, settings })}
            />
          </div>
          <div class="stack">
            <Matchups
              build={build}
              readonly={readonly}
              onChange={(matchups) => update({ ...build, matchups })}
            />
            {result && <Charts result={result} />}
          </div>
        </div>
      )}
    </div>
  );
}
