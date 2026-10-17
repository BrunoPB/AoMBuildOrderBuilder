import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { findEntity } from "../data/catalog.ts";
import type { PantheonId } from "../data/schema.ts";
import { text } from "../i18n/index.ts";
import { useApp } from "./context.tsx";

const BASE = import.meta.env.BASE_URL;

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
      onTouchStart={() => setOpen((o) => !o)}
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
        style={{ width: size, height: size }}
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
