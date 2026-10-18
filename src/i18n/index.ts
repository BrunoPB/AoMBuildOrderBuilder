import type { Locale, LocalizedText } from "../data/schema.ts";
import en from "./en.json";
import ptBR from "./pt-BR.json";

export type Messages = Record<string, string>;
export const MESSAGES: Record<Locale, Messages> = { "pt-BR": ptBR, en };
export type Params = Record<string, string | number | undefined>;

export function detectLocale(language: string | undefined): Locale {
  return language?.toLowerCase().startsWith("pt") ? "pt-BR" : "en";
}

/**
 * Looks up `key` and fills `{name}` placeholders. A key may have plural forms `key.one` / `key.other`,
 * picked by `params.count`.
 */
export function translate(locale: Locale, key: string, params: Params = {}): string {
  const messages = MESSAGES[locale];
  let template = messages[key];
  if (template === undefined && typeof params.count === "number") {
    const form = new Intl.PluralRules(locale).select(params.count) === "one" ? "one" : "other";
    template = messages[`${key}.${form}`] ?? messages[`${key}.other`];
  }
  if (template === undefined) return key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name];
    if (value === undefined) return "";
    return typeof value === "number" ? formatNumber(locale, value) : value;
  });
}

export function formatNumber(locale: Locale, value: number, digits = 0): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
}

export function text(
  locale: Locale,
  value: LocalizedText | Partial<LocalizedText> | undefined,
): string {
  if (!value) return "";
  return value[locale] ?? value.en ?? value["pt-BR"] ?? "";
}

/** Plural of a game name when the data has none. */
const PT_STOP = new Set([
  "de",
  "do",
  "da",
  "dos",
  "das",
  "a",
  "ao",
  "à",
  "em",
  "no",
  "na",
  "com",
  "para",
  "e",
]);

export function pluralize(locale: Locale, word: string): string {
  const parts = word.split(" ");
  const paren = parts.findIndex((p) => p.startsWith("("));
  if (locale === "en") {
    const head = paren > 0 ? paren - 1 : parts.length - 1;
    return parts.map((part, i) => (i === head ? pluralWord(locale, part) : part)).join(" ");
  }
  // Portuguese: noun and its adjectives agree, up to a preposition ("Centro de Aldeia").
  const stop = parts.findIndex(
    (p, i) => i > 0 && (p.startsWith("(") || PT_STOP.has(p.toLowerCase())),
  );
  return parts.map((part, i) => (stop < 0 || i < stop ? pluralWord(locale, part) : part)).join(" ");
}

function pluralWord(locale: Locale, w: string): string {
  if (locale === "en") {
    if (/(s|x|z|ch|sh)$/i.test(w)) return `${w}es`;
    if (/[^aeiou]y$/i.test(w)) return `${w.slice(0, -1)}ies`;
    if (/man$/i.test(w)) return `${w.slice(0, -3)}men`;
    return `${w}s`;
  }
  if (/ão$/i.test(w)) return `${w.slice(0, -2)}ões`;
  if (/[rz]$/i.test(w)) return `${w}es`;
  if (/[aeiou]l$/i.test(w)) return `${w.slice(0, -1)}is`;
  if (/m$/i.test(w)) return `${w.slice(0, -1)}ns`;
  if (/s$/i.test(w)) return w;
  return `${w}s`;
}
