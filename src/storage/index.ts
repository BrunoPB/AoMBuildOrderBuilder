import { z } from "zod";
import type { Build } from "../engine/build.ts";
import { migrateBuild } from "./migrate.ts";

export const BUILDS_KEY = "aomr-bob:builds:v1";
export const PREFS_KEY = "aomr-bob:prefs:v1";

export const PrefsSchema = z.object({
  locale: z.enum(["pt-BR", "en"]).optional(),
  theme: z.enum(["system", "light", "dark"]).default("system"),
  efficiency: z.number().positive().max(1.5).optional(),
  sound: z.boolean().default(true),
  countdown: z.number().int().nonnegative().default(0),
});
export type Prefs = z.infer<typeof PrefsSchema>;

/** localStorage with an in-memory fallback; `ok` turns false once a read or write fails. */
export class Store {
  ok = true;
  private memory = new Map<string, string>();

  constructor(private readonly storage: Pick<Storage, "getItem" | "setItem"> | undefined) {
    if (!storage) this.ok = false;
  }

  read(key: string): string | null {
    try {
      if (this.storage) return this.storage.getItem(key);
    } catch {
      this.ok = false;
    }
    return this.memory.get(key) ?? null;
  }

  write(key: string, value: string): boolean {
    this.memory.set(key, value);
    try {
      if (!this.storage) return false;
      this.storage.setItem(key, value);
      return true;
    } catch {
      this.ok = false;
      return false;
    }
  }

  loadBuilds(): Build[] {
    const raw = this.read(BUILDS_KEY);
    if (!raw) return [];
    try {
      const list: unknown = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      const out: Build[] = [];
      for (const item of list) {
        const result = migrateBuild(item);
        if (result.ok) out.push(result.build);
      }
      return out;
    } catch {
      return [];
    }
  }

  saveBuilds(builds: Build[]): boolean {
    return this.write(BUILDS_KEY, JSON.stringify(builds));
  }

  loadPrefs(): Prefs {
    try {
      const raw = this.read(PREFS_KEY);
      const parsed = PrefsSchema.safeParse(raw ? JSON.parse(raw) : {});
      if (parsed.success) return parsed.data;
    } catch {
      // fall through to defaults
    }
    return PrefsSchema.parse({});
  }

  savePrefs(prefs: Prefs): boolean {
    return this.write(PREFS_KEY, JSON.stringify(prefs));
  }
}

export function browserStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
