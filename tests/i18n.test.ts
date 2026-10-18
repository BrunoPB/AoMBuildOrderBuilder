import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectLocale, MESSAGES, pluralize, translate } from "../src/i18n/index.ts";

const en = Object.keys(MESSAGES.en).sort();
const pt = Object.keys(MESSAGES["pt-BR"]).sort();

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory()
      ? sourceFiles(join(dir, d.name))
      : /\.(ts|tsx)$/.test(d.name)
        ? [join(dir, d.name)]
        : [],
  );
}

describe("i18n", () => {
  it("has the same keys in both languages", () => {
    expect(pt).toEqual(en);
  });

  it("has no empty message", () => {
    for (const [locale, messages] of Object.entries(MESSAGES)) {
      for (const [key, value] of Object.entries(messages))
        expect(value.trim(), `${locale} ${key}`).not.toBe("");
    }
  });

  it("uses the same placeholders in both languages", () => {
    const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of en)
      expect(vars(MESSAGES["pt-BR"][key]!), key).toEqual(vars(MESSAGES.en[key]!));
  });

  it("defines every key used in the source code", () => {
    const keys = new Set<string>();
    for (const file of sourceFiles("src")) {
      const code = readFileSync(file, "utf8");
      for (const m of code.matchAll(/\bt\(\s*"([a-zA-Z]+\.[\w.]+)"/g)) keys.add(m[1]!);
    }
    const missing = [...keys].filter((k) => !(k in MESSAGES.en) && !(`${k}.one` in MESSAGES.en));
    expect(missing).toEqual([]);
  });

  it("fills placeholders and picks plural forms", () => {
    expect(translate("pt-BR", "import.ok", { count: 1 })).toBe("1 build importada");
    expect(translate("en", "import.ok", { count: 2 })).toBe("2 builds imported");
    expect(translate("pt-BR", "step.build", { building: "Templo" })).toBe("Construir Templo");
    expect(translate("en", "step.build", { building: "Temple" })).toBe("Build Temple");
  });

  it("pluralizes game names", () => {
    expect(pluralize("pt-BR", "Turma")).toBe("Turmas");
    expect(pluralize("pt-BR", "Mansão")).toBe("Mansões");
    expect(pluralize("en", "Citizen")).toBe("Citizens");
    expect(pluralize("en", "Huskarl")).toBe("Huskarls");
    expect(pluralize("en", "Throwing Axeman")).toBe("Throwing Axemen");
    expect(pluralize("en", "Citizen (Hero)")).toBe("Citizens (Hero)");
    expect(pluralize("pt-BR", "Navio Pesqueiro")).toBe("Navios Pesqueiros");
    expect(pluralize("pt-BR", "Centro de Aldeia")).toBe("Centros de Aldeia");
    expect(pluralize("pt-BR", "Sacerdote (Herói)")).toBe("Sacerdotes (Herói)");
  });

  it("detects the browser language", () => {
    expect(detectLocale("pt-PT")).toBe("pt-BR");
    expect(detectLocale("en-US")).toBe("en");
    expect(detectLocale("fr")).toBe("en");
  });
});
