import type { GameData, RawData } from "../data/load.ts";
import { LOCALES } from "../data/schema.ts";
import type { Build } from "../engine/build.ts";
import { buildSteps, warningText } from "../engine/format.ts";
import { simulate } from "../engine/simulate.ts";
import { toDashboard } from "../io/dashboard.ts";
import { slug } from "../io/files.ts";

export const API_VERSION = 1;

export type ApiOptions = {
  appVersion: string;
  generatedAt: string;
  /** Absolute site URL (https://user.github.io/repo/) or a root-relative base path ("/repo/"). */
  base: string;
};

export type ApiFiles = Map<string, unknown>;

export function presetFileId(build: Build): string {
  return slug(build.id.replace(/^preset:/, ""));
}

/** Builds every file of the static API, keyed by path relative to the site root (api/v1/...). */
export function generateApi(
  data: GameData,
  raw: RawData,
  presets: Build[],
  opts: ApiOptions,
): ApiFiles {
  const files: ApiFiles = new Map();
  const base = opts.base.endsWith("/") ? opts.base : `${opts.base}/`;
  const url = (path: string) => `${base}api/v1/${path}`;
  const stamp = { version: API_VERSION, generatedAt: opts.generatedAt };

  const presetIndex = presets.map((b) => {
    const fileId = presetFileId(b);
    const result = simulate(data, b);
    files.set(`api/v1/presets/${fileId}.json`, {
      ...b,
      generatedAt: opts.generatedAt,
      apiVersion: API_VERSION,
    });
    files.set(`api/v1/presets/${fileId}.dashboard.json`, {
      ...stamp,
      ...toDashboard(data, b, result),
    });
    const locales = Object.fromEntries(
      LOCALES.map((locale) => [
        locale,
        {
          steps: buildSteps(data, b, result, locale),
          warnings: result.warnings.map((w) => ({ ...w, text: warningText(data, b, w, locale) })),
        },
      ]),
    );
    files.set(`api/v1/presets/${fileId}.timeline.json`, {
      ...stamp,
      id: b.id,
      milestones: result.milestones,
      ageTimes: result.ageTimes,
      locales,
    });
    return {
      id: b.id,
      name: b.name,
      god: b.god,
      pantheon: b.pantheon,
      type: b.type,
      updatedAt: b.updatedAt,
      url: url(`presets/${fileId}.json`),
      dashboard: url(`presets/${fileId}.dashboard.json`),
      timeline: url(`presets/${fileId}.timeline.json`),
    };
  });
  files.set("api/v1/presets/index.json", { ...stamp, presets: presetIndex });

  const dataFiles: { name: string; content: unknown }[] = [
    { name: "common", content: raw.common },
    { name: "resources", content: raw.resources },
    { name: "sources", content: raw.sources },
    { name: "powers", content: raw.powers },
    ...Object.entries(raw.pantheons).map(([n, c]) => ({ name: `pantheons/${n}`, content: c })),
    ...Object.entries(raw.gods).map(([n, c]) => ({ name: `gods/${n}`, content: c })),
    ...Object.entries(raw.minors).map(([n, c]) => ({ name: `minors/${n}`, content: c })),
  ];
  for (const f of dataFiles) files.set(`api/v1/data/${f.name}.json`, { ...stamp, data: f.content });
  files.set("api/v1/data/index.json", {
    ...stamp,
    patch: data.common.patch,
    files: dataFiles.map((f) => ({ name: f.name, url: url(`data/${f.name}.json`) })),
  });

  const iconBase = `${base}icons/`;
  files.set("api/v1/icons/manifest.json", {
    ...stamp,
    icons: [...data.icons.values()].map((icon) => ({
      ...icon,
      url: icon.file ? `${iconBase}${icon.file}` : null,
      url128: icon.file128 ? `${iconBase}${icon.file128}` : null,
    })),
  });

  files.set("api/v1/index.json", {
    ...stamp,
    api: "aomr-bob",
    appVersion: opts.appVersion,
    gamePatch: data.common.patch,
    routes: [
      url("index.json"),
      url("presets/index.json"),
      url("presets/<id>.json"),
      url("presets/<id>.dashboard.json"),
      url("presets/<id>.timeline.json"),
      url("data/index.json"),
      url("data/<file>.json"),
      url("icons/manifest.json"),
    ],
  });
  return files;
}
