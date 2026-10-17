import type { Build } from "../engine/build.ts";
import { migrateBuild } from "../storage/migrate.ts";

const modules = import.meta.glob<{ default: unknown }>("./*.json", { eager: true });

/** Read-only builds shipped with the app; ids start with "preset:". */
export const PRESETS: Build[] = Object.values(modules)
  .map((m) => migrateBuild(m.default))
  .flatMap((r) => (r.ok ? [r.build] : []))
  .sort((a, b) => a.name.localeCompare(b.name));

export function isPreset(id: string): boolean {
  return id.startsWith("preset:");
}
