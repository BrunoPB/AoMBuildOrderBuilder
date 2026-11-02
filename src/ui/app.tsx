import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { GameData } from "../data/load.ts";
import type { Build } from "../engine/build.ts";
import { detectLocale, translate } from "../i18n/index.ts";
import { PRESETS, isPreset } from "../presets/index.ts";
import { browserStorage, type Prefs, Store } from "../storage/index.ts";
import { AppContext, type AppApi, type Toast } from "./context.tsx";
import { Editor } from "./editor/editor.tsx";
import { GlobalTools } from "./global-tools.tsx";
import { Library } from "./library.tsx";
import { MatchMode } from "./match.tsx";
import { Overview } from "./overview.tsx";
import { SharedBuild } from "./shared.tsx";
import { SHARED_ID } from "../io/share.ts";
import { SettingsPage } from "./settings.tsx";
import { Svg } from "./svg.tsx";

type Route =
  | { page: "library" }
  | { page: "view"; id: string }
  | { page: "import"; code: string }
  | { page: "build"; id: string }
  | { page: "play"; id: string }
  | { page: "settings" };

function parseRoute(hash: string): Route {
  const [, page, ...rest] = hash.replace(/^#/, "").split("/");
  const id = decodeURIComponent(rest.join("/"));
  if (page === "view" && id) return { page: "view", id };
  if (page === "import" && id) return { page: "import", code: id };
  if (page === "build" && id) return { page: "build", id };
  if (page === "play" && id) return { page: "play", id };
  if (page === "settings") return { page: "settings" };
  return { page: "library" };
}

export function navigate(path: string): void {
  window.location.hash = path;
}

type Dialog = {
  text: string;
  choices: { label: string; value: string; danger?: boolean }[];
  resolve: (v: string | null) => void;
};

export function App({ data }: { data: GameData }) {
  const store = useMemo(() => new Store(browserStorage()), []);
  const [prefs, setPrefsState] = useState<Prefs>(() => store.loadPrefs());
  const [builds, setBuilds] = useState<Build[]>(() => store.loadBuilds());
  const [storageOk, setStorageOk] = useState(store.ok);
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  /** The build opened from a share link, kept in memory until the user saves a copy. */
  const [shared, setShared] = useState<Build | null>(null);
  const prefsRef = useRef(prefs);
  const saveTimer = useRef<number | undefined>(undefined);
  const locale = prefs.locale ?? detectLocale(navigator.language);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(locale, "app.title");
  }, [locale]);

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === "system") delete root.dataset.theme;
    else root.dataset.theme = prefs.theme;
  }, [prefs.theme]);

  const latest = useRef(builds);
  latest.current = builds;
  useEffect(() => {
    const flush = () => store.saveBuilds(latest.current);
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [store]);

  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      store.saveBuilds(builds);
      setStorageOk(store.ok);
    }, 500);
    return () => window.clearTimeout(saveTimer.current);
  }, [builds, store]);

  const toast = useCallback((text: string, kind?: "error") => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, text, kind }]);
    window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 4000);
  }, []);

  const api: AppApi = {
    data,
    locale,
    t: (key, params) => translate(locale, key, params),
    prefs,
    setPrefs: (patch) => {
      const current = prefsRef.current;
      const next = { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
      prefsRef.current = next;
      setPrefsState(next);
      store.savePrefs(next);
      setStorageOk(store.ok);
    },
    builds,
    presets: PRESETS,
    storageOk,
    findBuild: (id) => {
      if (id === SHARED_ID) return shared ? { build: shared, readonly: true } : undefined;
      const preset = PRESETS.find((b) => b.id === id);
      if (preset) return { build: preset, readonly: true };
      const own = builds.find((b) => b.id === id);
      return own ? { build: own, readonly: false } : undefined;
    },
    saveBuild: (build) => {
      if (isPreset(build.id) || build.id === SHARED_ID) return;
      setBuilds((list) => {
        const i = list.findIndex((b) => b.id === build.id);
        if (i < 0) return [...list, build];
        const next = [...list];
        next[i] = build;
        return next;
      });
    },
    deleteBuild: (id) => {
      setBuilds((list) => list.filter((b) => b.id !== id));
      api.setPrefs((p) => {
        const view = { ...p.view };
        delete view[`editor.stage.${id}`];
        return { view };
      });
    },
    addBuilds: (added) =>
      setBuilds((list) => {
        const next = [...list];
        for (const b of added) {
          const i = next.findIndex((x) => x.id === b.id);
          if (i >= 0) next[i] = b;
          else next.push(b);
        }
        return next;
      }),
    toast,
    confirm: (text, choices) =>
      new Promise((resolve) => {
        setDialog({
          text,
          choices: choices ?? [
            { label: translate(locale, "confirm.yes"), value: "yes", danger: true },
            { label: translate(locale, "confirm.no"), value: "no" },
          ],
          resolve,
        });
      }),
  };

  const closeDialog = (value: string | null) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  return (
    <AppContext.Provider value={api}>
      <div class="app">
        <header class="topbar">
          <a class="brand" href="#/">
            <Svg name="pyramid" />
            <span>{api.t("app.title")}</span>
          </a>
          <span class="spacer" />
          <GlobalTools home />
        </header>
        <main>
          {route.page === "library" && <Library />}
          {route.page === "view" && <Overview key={route.id} id={route.id} />}
          {route.page === "import" && (
            <SharedBuild
              key={route.code}
              code={route.code}
              onLoad={(b) => setShared({ ...b, id: SHARED_ID })}
            />
          )}
          {route.page === "build" && <Editor key={route.id} id={route.id} />}
          {route.page === "play" && <MatchMode key={route.id} id={route.id} />}
          {route.page === "settings" && <SettingsPage />}
        </main>
        <footer class="legal">
          <p class="reference">{api.t("footer.reference")}</p>
          <p>
            {api.t("footer.fan")} {api.t("footer.legal")}
          </p>
        </footer>
        <div class="toasts" aria-live="polite">
          {toasts.map((x) => (
            <div key={x.id} class={`toast ${x.kind ?? ""}`}>
              {x.text}
            </div>
          ))}
        </div>
        {dialog && (
          <div class="modal-backdrop" onClick={() => closeDialog(null)}>
            <div
              class="modal"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.key === "Escape" && closeDialog(null)}
            >
              <p>{dialog.text}</p>
              <div class="row">
                {dialog.choices.map((c, i) => (
                  <button
                    key={c.value}
                    class={`btn ${c.danger ? "danger" : ""}`}
                    autoFocus={i === 0}
                    onClick={() => closeDialog(c.value)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
