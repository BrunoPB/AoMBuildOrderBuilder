import type { RawData } from "./load.ts";
import common from "./common.json";
import resources from "./resources.json";
import sources from "./sources.json";
import powers from "./powers.json";
import icons from "./icons.json";

function byName(modules: Record<string, { default: unknown }>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [path, mod] of Object.entries(modules)) {
    const name = path
      .split("/")
      .pop()!
      .replace(/\.json$/, "");
    out[name] = mod.default;
  }
  return out;
}

export const rawData: RawData = {
  common,
  resources,
  sources,
  powers,
  pantheons: byName(import.meta.glob("./pantheons/*.json", { eager: true })),
  gods: byName(import.meta.glob("./gods/*.json", { eager: true })),
  minors: byName(import.meta.glob("./minors/*.json", { eager: true })),
  icons,
};
