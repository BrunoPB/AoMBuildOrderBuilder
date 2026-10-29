import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { findEntity } from "../data/catalog.ts";
import type { PantheonId } from "../data/schema.ts";
import { contextKey, text } from "../i18n/index.ts";
import { useApp } from "./context.tsx";

const BASE = import.meta.env.BASE_URL;

/** Keeps the tooltip bubble inside the viewport. */
function clamp(host: HTMLElement): void {
  requestAnimationFrame(() => {
    const bubble = host.querySelector<HTMLElement>(":scope > .tip-bubble");
    if (!bubble) return;
    bubble.style.setProperty("--shift", "0px");
    const r = bubble.getBoundingClientRect();
    const max = document.documentElement.clientWidth - 8;
    const shift = r.right > max ? max - r.right : r.left < 8 ? 8 - r.left : 0;
    bubble.style.setProperty("--shift", `${Math.round(shift)}px`);
  });
}

export function Tip({
  label,
  children,
  focusable = false,
  class: cls,
}: {
  label: string;
  children: ComponentChildren;
  focusable?: boolean;
  class?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!label) return <>{children}</>;
  return (
    <span
      class={`tip ${cls ?? ""}`}
      data-open={open}
      tabIndex={focusable ? 0 : undefined}
      onMouseEnter={(e) => clamp(e.currentTarget)}
      onFocusCapture={(e) => clamp(e.currentTarget as HTMLElement)}
      onTouchStart={(e) => {
        clamp(e.currentTarget);
        setOpen((o) => !o);
      }}
      onMouseLeave={() => setOpen(false)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <span class="tip-bubble" role="tooltip">
        {label}
      </span>
    </span>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Help text for an i18n key, from `help.<key>`; empty when there is none or tips are off. */
export type HelpContext = { pantheon?: string; god?: string };

/** Help text for an i18n key, from `help.<key>[.<god>|.<pantheon>]`; empty when tips are off. */
export function useHelp(): (key: string, ctx?: HelpContext) => string {
  const { t, prefs, locale } = useApp();
  return (key, ctx) => {
    if (!prefs.tooltips) return "";
    const k = contextKey(locale, `help.${key}`, ctx);
    const help = t(k);
    return help === k ? "" : help;
  };
}

/** Label for an i18n key, specific to the pantheon/god when such a variant exists. */
export function useLabel(): (key: string, ctx?: HelpContext) => string {
  const { t, locale } = useApp();
  return (key, ctx) => t(contextKey(locale, key, ctx));
}

/** A UI label that explains itself in a tooltip (when help tips are on). */
export function HelpText({
  k,
  params,
  ctx,
}: {
  k: string;
  params?: Record<string, string | number>;
  ctx?: HelpContext;
}) {
  const { t } = useApp();
  const help = useHelp()(k, ctx);
  const label = t(k, params);
  if (!help) return <>{label}</>;
  return (
    <Tip label={help} focusable class="help">
      {label}
    </Tip>
  );
}

/** A game icon by icon id; falls back to a neutral placeholder with initials. */
export function GameIcon({ icon, name, size = 32 }: { icon: string; name: string; size?: number }) {
  const { data } = useApp();
  const entry = data.icons.get(icon);
  const [failed, setFailed] = useState(false);
  const file =
    entry && !entry.placeholder
      ? size > 64 && entry.file128
        ? entry.file128
        : entry.file
      : undefined;
  if (!file || failed) {
    return (
      <span
        class="icon placeholder"
        style={{ width: `${size}px`, height: `${size}px` }}
        role="img"
        aria-label={name}
      >
        {initials(name)}
      </span>
    );
  }
  return (
    <img
      class="icon"
      src={`${BASE}icons/${file}`}
      width={size}
      height={size}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

/** Icon of a game entity by id, with its translated name as alt text and tooltip. */
export function EntityIcon({
  id,
  pantheon,
  size = 32,
  tip = true,
  detail,
}: {
  id: string;
  pantheon: PantheonId;
  size?: number;
  tip?: boolean;
  detail?: string;
}) {
  const { data, locale, t } = useApp();
  const e = findEntity(data, pantheon, id);
  const name = e ? text(locale, e.name) : id;
  const low = e?.meta?.confidence === "low";
  const label = [name, detail, low ? `⚠ ${t("result.lowConfidence")}` : ""]
    .filter(Boolean)
    .join("\n");
  const img = <GameIcon icon={e?.icon ?? `missing/${id}`} name={name} size={size} />;
  return tip ? (
    <Tip label={label} focusable>
      {img}
    </Tip>
  ) : (
    img
  );
}
