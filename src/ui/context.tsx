import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { GameData } from "../data/load.ts";
import type { Locale } from "../data/schema.ts";
import type { Build } from "../engine/build.ts";
import type { Params } from "../i18n/index.ts";
import type { Prefs, ViewValue } from "../storage/index.ts";

export type Toast = { id: number; text: string; kind?: "error" };

export type AppApi = {
  data: GameData;
  locale: Locale;
  t: (key: string, params?: Params) => string;
  prefs: Prefs;
  setPrefs: (patch: Partial<Prefs> | ((prefs: Prefs) => Partial<Prefs>)) => void;
  builds: Build[];
  presets: Build[];
  storageOk: boolean;
  findBuild: (id: string) => { build: Build; readonly: boolean } | undefined;
  saveBuild: (build: Build) => void;
  deleteBuild: (id: string) => void;
  addBuilds: (builds: Build[]) => void;
  toast: (text: string, kind?: "error") => void;
  confirm: (
    text: string,
    choices?: { label: string; value: string; danger?: boolean }[],
  ) => Promise<string | null>;
};

export const AppContext = createContext<AppApi | null>(null);

export function useApp(): AppApi {
  const api = useContext(AppContext);
  if (!api) throw new Error("AppContext missing");
  return api;
}

/** Screen state that survives leaving the page (stored in prefs.view).
 *  `allowed` lists the valid values; without it, the stored value must share the fallback's type. */
export function useViewPref<T extends ViewValue>(
  key: string,
  fallback: T,
  allowed?: readonly T[],
): [T, (value: T) => void] {
  const { prefs, setPrefs } = useApp();
  const stored = prefs.view[key];
  const ok =
    stored !== undefined &&
    (allowed ? allowed.includes(stored as T) : typeof stored === typeof fallback);
  return [
    ok ? (stored as T) : fallback,
    (value) => setPrefs((p) => ({ view: { ...p.view, [key]: value } })),
  ];
}
