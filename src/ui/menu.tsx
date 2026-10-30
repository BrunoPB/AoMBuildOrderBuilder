import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { Tip } from "./icon.tsx";
import { Svg } from "./svg.tsx";

/** "⋯" button that opens a small list of less frequent actions. */
export function Menu({
  label,
  testid,
  children,
}: {
  label: string;
  testid?: string;
  children: ComponentChildren;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent) {
        if (e.key !== "Escape") return;
        root.current?.querySelector<HTMLElement>(".menu-toggle")?.focus();
      } else if (root.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div class="menu-root" ref={root}>
      <Tip label={open ? "" : label}>
        <button
          class="btn icon-only menu-toggle"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          data-testid={testid}
          onClick={() => setOpen(!open)}
        >
          <Svg name="dots" />
        </button>
      </Tip>
      {open && (
        <div class="menu" role="menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon,
  label,
  onClick,
  href,
  danger,
  testid,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  testid?: string;
}) {
  const cls = `menu-item ${danger ? "danger" : ""}`;
  return href ? (
    <a class={cls} role="menuitem" href={href} data-testid={testid}>
      <Svg name={icon} />
      {label}
    </a>
  ) : (
    <button class={cls} role="menuitem" onClick={onClick} data-testid={testid}>
      <Svg name={icon} />
      {label}
    </button>
  );
}
