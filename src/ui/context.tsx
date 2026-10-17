import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { GameData } from "../data/load.ts";
import type { Locale } from "../data/schema.ts";
import type { Build } from "../engine/build.ts";
import type { Params } from "../i18n/index.ts";
import type { Prefs } from "../storage/index.ts";

export type Toast = { id: number; text: string; kind?: "error" };

export type AppApi = {
  data: GameData;
  locale: Locale;
  t: (key: string, params?: Params) => string;
  prefs: Prefs;
  setPrefs: (patch: Partial<Prefs>) => void;
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
