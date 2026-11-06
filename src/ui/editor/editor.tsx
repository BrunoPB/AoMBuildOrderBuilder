import { useEffect, useRef, useState } from "preact/hooks";
import { type PantheonId, SOURCE_IDS, type SourceId } from "../../data/schema.ts";
import { type Action, BUILD_TYPES, type Build, type Settings } from "../../engine/build.ts";
import { parseClock } from "../../engine/time.ts";
import { ASAP_PREVIOUS, placeDrifted, removeActions } from "./order.ts";
import { text } from "../../i18n/index.ts";
import { navigate } from "../app.tsx";
import { useApp, useViewPref } from "../context.tsx";
import { GlobalTools } from "../global-tools.tsx";
import { EntityIcon, Tip, HelpText, useHelp } from "../icon.tsx";
import { duplicateBuild, onlyStartActions, startActions, useSimulation } from "../sim.ts";
import { Svg } from "../svg.tsx";
import { ActionList } from "./action-list.tsx";
import { FoodChain } from "./food-chain.tsx";
import { ProductionChart } from "./production.tsx";
import { BuildActions } from "../build-actions.tsx";
import { useHistory } from "./history.ts";
import { addIndex, insertAction, withIds } from "./labels.ts";
import { Palette } from "./palette.tsx";
import {
  Charts,
  focusAction,
  Matchups,
  Milestones,
  WarningsButton,
  WarningsDrawer,
} from "./result.tsx";
import { focusedFieldTag, LiveNumber, LiveText } from "../fields.tsx";

function SettingsPanel({
  build,
  readonly,
  onChange,
}: {
  build: Build;
  readonly: boolean;
  onChange: (s: Settings) => void;
}) {
  const { data } = useApp();
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
  const [open, setOpen] = useViewPref<boolean>("editor.settingsOpen", false);
  return (
    <details class="panel collapsible" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
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
          <LiveNumber
            step="0.01"
            min="0.1"
            max="1.5"
            placeholder={String(d.efficiency)}
            value={s.efficiency ?? ""}
            data-testid="setting-efficiency"
            onValue={(raw) => set({ efficiency: num(raw) })}
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
            <LiveNumber
              step="0.1"
              min={favor.min}
              max={favor.max}
              placeholder={String(favor.defaultRate)}
              value={s.oracleRate ?? ""}
              onValue={(raw) => set({ oracleRate: num(raw) })}
            />
          </label>
        )}
        {favor?.type === "combat" && (
          <label class="field">
            <HelpText k="editor.norseFavor" />
            <LiveNumber
              step="0.5"
              min="0"
              placeholder={String(d.norseFavorPerMinute)}
              value={s.norseFavorPerMinute ?? ""}
              onValue={(raw) => set({ norseFavorPerMinute: num(raw) })}
            />
          </label>
        )}
        <FoodChain
          build={build}
          chain={chain}
          sources={foodSources}
          readonly={readonly}
          custom={!!s.foodChain}
          onChange={(foodChain) => set({ foodChain })}
        />
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
  const help = useHelp();
  const { t, data, locale } = api;
  const changePantheon = async (id: PantheonId) => {
    if (id === build.pantheon) return;
    if (
      build.actions.length &&
      !onlyStartActions(data, build) &&
      (await api.confirm(t("editor.changePantheon"))) !== "yes"
    )
      return;
    const god = data.pantheons.get(id)?.def.gods[0] ?? build.god;
    const next = { ...build, pantheon: id, god, milestones: [] };
    onChange({ ...next, actions: startActions(data, next) });
  };
  const changeGod = (id: string) => {
    const g = data.gods.get(id);
    if (!g) return;
    /** A god may start with more villagers: an untouched start follows it. */
    if (onlyStartActions(data, build)) {
      const next = { ...build, god: id };
      return onChange({ ...next, actions: startActions(data, next) });
    }
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
        actions: insertAction(build, build.actions.length, {
          when: ASAP_PREVIOUS,
          do: "age",
          to: age,
          minor,
        }),
      });
    }
  };
  /** Removes the age up (and the later ones: no Heroic without Classical). */
  const clearMinor = async (age: "classical" | "heroic" | "mythic") => {
    const from = AGE_ORDER.indexOf(age);
    const drop = build.actions.filter(
      (a): a is Extract<Action, { do: "age" }> => a.do === "age" && AGE_ORDER.indexOf(a.to) >= from,
    );
    if (drop.some((a) => a.to !== age)) {
      const later = drop
        .filter((a) => a.to !== age)
        .map((a) => text(locale, data.common.ages.find((x) => x.id === a.to)!.name))
        .join(", ");
      if ((await api.confirm(t("editor.clearMinorLater", { ages: later }))) !== "yes") return;
    }
    const ids = new Set(drop.map((a) => a.id).filter(Boolean));
    onChange({
      ...build,
      actions: removeActions(build.actions, (a) =>
        drop.includes(a as Extract<Action, { do: "age" }>),
      ),
      milestones: (build.milestones ?? []).filter((m) => !ids.has(m.atAction)),
    });
  };
  const god = data.gods.get(build.god);
  const pantheons = data.common.pantheons.filter((p) => data.pantheons.has(p.id));
  return (
    <div class="stack gods-stage">
      <section class="panel">
        <h3>
          <HelpText k="editor.pantheon" />
        </h3>
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
      </section>
      <section class="panel">
        <h3>
          <HelpText k="editor.god" />
        </h3>
        <div class="god-cards" role="group" aria-label={t("editor.god")}>
          {(data.pantheons.get(build.pantheon)?.def.gods ?? []).map((id) => {
            const g = data.gods.get(id);
            if (!g) return null;
            return (
              <button
                key={id}
                class="god-card"
                aria-pressed={build.god === id}
                disabled={readonly}
                data-testid={`god-${id}`}
                onClick={() => changeGod(id)}
              >
                <EntityIcon id={id} pantheon={build.pantheon} size={88} tip={false} />
                <span>{text(locale, g.name)}</span>
              </button>
            );
          })}
        </div>
      </section>
      {god && (
        <section class="panel">
          <h3>
            <HelpText k="editor.minors" />
          </h3>
          <div class="minor-ages" role="group" aria-label={t("editor.minors")}>
            {(["classical", "heroic", "mythic"] as const).map((age) => {
              const chosen = build.actions.find(
                (a): a is Extract<Action, { do: "age" }> => a.do === "age" && a.to === age,
              )?.minor;
              const ageName = text(locale, data.common.ages.find((x) => x.id === age)!.name);
              return (
                <div key={age} class="minor-age" role="group" aria-label={ageName}>
                  <span class="row minor-age-title">
                    <EntityIcon id={age} pantheon={build.pantheon} size={24} tip={false} />
                    {ageName}
                  </span>
                  <div class="row minor-cards">
                    {god.minors[age].map((m) => {
                      const minor = data.minors.get(m);
                      const label = minor ? text(locale, minor.name) : m;
                      return (
                        <Tip
                          key={m}
                          class="god-card-tip"
                          label={
                            readonly
                              ? ""
                              : help(chosen === m ? "editor.minorChosen" : "editor.minorPick")
                          }
                        >
                          <button
                            class="god-card small"
                            aria-pressed={chosen === m}
                            disabled={readonly}
                            data-testid={`minor-${m}`}
                            onClick={() => (chosen === m ? void clearMinor(age) : setMinor(age, m))}
                          >
                            <EntityIcon id={m} pantheon={build.pantheon} size={56} tip={false} />
                            <span>{label}</span>
                          </button>
                        </Tip>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

const AGE_ORDER = ["classical", "heroic", "mythic"] as const;

const STAGES = [
  { id: "gods", icon: "crown" },
  { id: "actions", icon: "list" },
  { id: "result", icon: "chart" },
  { id: "details", icon: "gear" },
] as const;
type Stage = (typeof STAGES)[number]["id"];

export function Editor({ id }: { id: string }) {
  const api = useApp();
  const help = useHelp();
  const { t, data, locale } = api;
  const found = api.findBuild(id);
  const build = found?.build;
  /** A build with nothing of the player's yet starts at picking the gods. */
  const [firstStage] = useState<Stage>(
    build && !onlyStartActions(data, build) ? "actions" : "gods",
  );
  const [stage, setStage] = useViewPref<Stage>(
    `editor.stage.${id}`,
    firstStage,
    STAGES.map((s) => s.id),
  );
  const [warningsOpen, setWarningsOpen] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  /** On wide screens the build screen fills the window; the actions stage scrolls inside. */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("build-route");
    root.classList.toggle("workspace", stage === "actions");
    return () => root.classList.remove("build-route", "workspace");
  }, [stage]);
  /** Header and palette heights, so the palette and the time axis stick right below them. */
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const parts = [".build-header", ".tl-toolbar"].map((q) => page.querySelector<HTMLElement>(q));
    const measure = () => {
      page.style.setProperty("--hdr-h", `${parts[0]?.offsetHeight ?? 0}px`);
      page.style.setProperty("--pal-h", `${parts[1]?.offsetHeight ?? 0}px`);
    };
    const ro = new ResizeObserver(measure);
    for (const el of parts) if (el) ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [stage, found?.readonly]);
  const history = useHistory();
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

  /** Fixes the editor applies by itself, all in one save so none undoes another:
   *  - imported builds may have actions without ids (rows need one to keep their state);
   *  - version 5 builds set food amounts per source; now each food chain item has its own;
   *  - version 4 builds ended auto queues at a time; now they run for a duration from their start;
   *  - a rally change shows the unit of its auto queue, which may have been changed since;
   *  - "after" actions follow their anchor in time: when it moves they move in the list too.
   *    Capped, in case a move keeps shifting the times (reset by every edit of the player). */
  const drifts = useRef(0);
  useEffect(() => {
    const result = sim.result;
    if (readonly || !build) return;
    let next = build;
    const ids = withIds(next.actions);
    if (ids) next = { ...next, actions: ids };
    if (next.settings?.sourceAmounts) {
      const { sourceAmounts, ...settings } = next.settings;
      const chain = (settings.foodChain ?? data.common.defaults.foodChain).map((item) => {
        const amount = typeof item === "string" ? sourceAmounts[item] : undefined;
        return amount ? { source: item as SourceId, amount } : item;
      });
      next = { ...next, settings: { ...settings, foodChain: chain } };
    }
    const queueUnit = (id: string) => {
      const q = next.actions.find((x) => x.id === id);
      return q?.do === "train" ? q.unit : undefined;
    };
    if (
      next.actions.some(
        (a) => a.do === "rally" && queueUnit(a.queue) && queueUnit(a.queue) !== a.unit,
      )
    ) {
      next = {
        ...next,
        actions: next.actions.map((a) =>
          a.do === "rally" && queueUnit(a.queue) ? { ...a, unit: queueUnit(a.queue)! } : a,
        ),
      };
    }
    if (result) {
      let until = false;
      const actions = next.actions.map((a, i) => {
        const start = result.actions[i]?.startedAt;
        if (a.do !== "train" || !a.until || start === undefined) return a;
        until = true;
        const duration = Math.round(parseClock(a.until) - start);
        return { ...a, until: undefined, duration: duration > 0 ? duration : undefined };
      });
      if (until) next = { ...next, actions };
      const drifted = drifts.current < 50 ? placeDrifted(next.actions, result.actions) : undefined;
      if (drifted) {
        drifts.current++;
        next = { ...next, actions: drifted };
      }
    }
    if (next !== build) api.saveBuild(next);
  }, [build, sim.result]);

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
    drifts.current = 0;
    history.record(build, tag ?? focusedFieldTag());
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
  const result = sim.result;
  const go = (to: Stage) => {
    setStage(to);
    window.scrollTo({ top: 0 });
  };
  const pickWarning = (action?: number) => {
    setWarningsOpen(false);
    setStage("actions");
    requestAnimationFrame(() => focusAction(action));
  };
  const god = data.gods.get(build.god);
  const next = STAGES[STAGES.findIndex((s) => s.id === stage) + 1];

  return (
    <div class="build-page" ref={pageRef}>
      <header class={`panel build-header pan-${build.pantheon}`} data-testid="build-header">
        <div class="row header-row">
          <Tip label={t("nav.back")}>
            <a class="btn icon-only" href="#/" aria-label={t("nav.back")}>
              <Svg name="home" />
            </a>
          </Tip>
          {god && <EntityIcon id={god.id} pantheon={build.pantheon} size={30} />}
          <LiveText
            class="name-input"
            aria-label={t("editor.name")}
            data-testid="build-name"
            value={build.name}
            maxLength={80}
            disabled={readonly}
            onValue={(raw) => update({ ...build, name: raw.trim() ? raw : build.name }, "name")}
          />
          {readonly && (
            <Tip label={t("editor.readonly")} focusable>
              <span class="lvl-info">
                <Svg name="info" label={t("editor.readonly")} />
              </span>
            </Tip>
          )}
          <nav class="stages" aria-label={build.name}>
            {STAGES.map((st, i) => (
              <Tip key={st.id} label={help(`tab.${st.id}`)}>
                <button
                  class="stage"
                  aria-current={stage === st.id ? "step" : undefined}
                  data-testid={`tab-${st.id}`}
                  onClick={() => go(st.id)}
                >
                  <span class="stage-num num">{i + 1}</span>
                  <Svg name={st.icon} />
                  <span class="stage-label">{t(`tab.${st.id}`)}</span>
                </button>
              </Tip>
            ))}
          </nav>
          <div class="row header-tools">
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
            {result && (
              <WarningsButton
                result={result}
                open={warningsOpen}
                onToggle={() => setWarningsOpen(!warningsOpen)}
              />
            )}
            <BuildActions
              build={build}
              readonly={readonly}
              current="edit"
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
            <span class="header-global row">
              <GlobalTools />
            </span>
          </div>
        </div>
      </header>

      {sim.error && (
        <div class="panel bg-error">
          <Svg name="error" /> {sim.error}
        </div>
      )}

      {stage === "gods" && <GodPicker build={build} readonly={readonly} onChange={update} />}

      {stage === "actions" && (
        <div class={`editor ${readonly ? "readonly" : ""}`}>
          <ActionList
            build={build}
            result={result}
            steps={sim.steps}
            readonly={readonly}
            update={update}
            palette={
              readonly ? undefined : (
                <Palette
                  build={build}
                  idle={result?.series.find((x) => x.t >= 5)?.alloc.idle ?? 0}
                  onAdd={(a) => {
                    const at = addIndex(build.actions);
                    update({ ...build, actions: insertAction(build, at, a) });
                    requestAnimationFrame(() => focusAction(at));
                  }}
                />
              )
            }
          />
        </div>
      )}

      {stage === "result" && result && (
        <div class="stack" data-testid="result">
          <Milestones
            build={build}
            result={result}
            onChange={readonly ? undefined : (milestones) => update({ ...build, milestones })}
          />
          <ProductionChart build={build} result={result} />
          <Charts build={build} result={result} />
        </div>
      )}

      {stage === "details" && (
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
                      const patch = { ...(build[field] ?? {}), [locale]: value || undefined };
                      if (!value) delete patch[locale];
                      update(
                        { ...build, [field]: Object.keys(patch).length ? patch : undefined },
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
          <Matchups
            build={build}
            readonly={readonly}
            onChange={(matchups) => update({ ...build, matchups })}
          />
        </div>
      )}

      {next && (
        <div class="stage-next">
          <Tip label={help(`tab.${next.id}`)}>
            <button class="btn" data-testid="next-stage" onClick={() => go(next.id)}>
              <span class="stage-num num">{STAGES.indexOf(next) + 1}</span>
              {t(`tab.${next.id}`)}
              <Svg name="chevron" />
            </button>
          </Tip>
        </div>
      )}

      {warningsOpen && result && (
        <WarningsDrawer
          build={build}
          result={result}
          onClose={() => setWarningsOpen(false)}
          onPick={pickWarning}
        />
      )}
    </div>
  );
}
