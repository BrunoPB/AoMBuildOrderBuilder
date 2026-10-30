import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { findEntity } from "../data/catalog.ts";
import type { PantheonId } from "../data/schema.ts";
import { contextKey, text } from "../i18n/index.ts";
import { useApp } from "./context.tsx";

const BASE = import.meta.env.BASE_URL;

/** Places the tooltip bubble in viewport coordinates: above the host, below when there is no
 *  room (or a sticky header covers it), always inside the screen. Fixed positioning keeps it
 *  out of scrolling containers. */
function place(host: HTMLElement): void {
  const bubble = host.querySelector<HTMLElement>(":scope > .tip-bubble");
  if (!bubble) return;
  bubble.style.left = "-9999px";
  bubble.style.top = "-9999px";
  const update = () => {
    const h = host.getBoundingClientRect();
    const b = bubble.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const x = Math.min(Math.max(h.left + h.width / 2 - b.width / 2, 8), vw - b.width - 8);
    const covered = [...document.querySelectorAll<HTMLElement>(".topbar, .build-header")]
      .filter((el) => !el.contains(host) && getComputedStyle(el).position !== "static")
      .map((el) => el.getBoundingClientRect().bottom);
    const above = h.top - b.height - 6;
    const vh = document.documentElement.clientHeight;
    const y = Math.max(
      8,
      Math.min(above >= Math.max(8, ...covered) ? above : h.bottom + 6, vh - b.height - 8),
    );
    bubble.style.left = `${Math.round(x)}px`;
    bubble.style.top = `${Math.round(y)}px`;
  };
  requestAnimationFrame(update);
  unfollow(host);
  window.addEventListener("scroll", update, { capture: true, passive: true });
  following.set(host, update);
}

const following = new WeakMap<HTMLElement, () => void>();

function unfollow(host: HTMLElement): void {
  const update = following.get(host);
  if (update) window.removeEventListener("scroll", update, { capture: true });
  following.delete(host);
}

export function Tip({
  label,
  card,
  children,
  focusable = false,
  class: cls,
}: {
  label: string;
  /** Rich content shown instead of the plain label (formatted explanations). */
  card?: ComponentChildren;
  children: ComponentChildren;
  focusable?: boolean;
  class?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!label && !card) return <>{children}</>;
  return (
    <span
      class={`tip ${cls ?? ""}`}
      data-open={open}
      tabIndex={focusable ? 0 : undefined}
      onMouseEnter={(e) => place(e.currentTarget)}
      onFocusCapture={(e) => place(e.currentTarget as HTMLElement)}
      onTouchStart={(e) => {
        place(e.currentTarget);
        setOpen((o) => !o);
      }}
      onMouseLeave={(e) => {
        unfollow(e.currentTarget);
        setOpen(false);
      }}
      onBlur={(e) => {
        unfollow(e.currentTarget as HTMLElement);
        setOpen(false);
      }}
    >
      {children}
      <span class={`tip-bubble ${card ? "tip-card" : ""}`} role="tooltip">
        {card ?? label}
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
