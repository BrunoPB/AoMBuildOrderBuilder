import { Fragment } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { createPortal } from "preact/compat";
import { AGES, type Age } from "../../data/schema.ts";
import type { Action, Build } from "../../engine/build.ts";
import { formatClock } from "../../engine/time.ts";
import type { SimResult } from "../../engine/types.ts";
import { text } from "../../i18n/index.ts";
import { useApp } from "../context.tsx";
import { EntityIcon } from "../icon.tsx";
import { Svg } from "../svg.tsx";
import { actionIcons, actionTarget, actionText, doneText, hasDuration } from "./labels.ts";

/** A moment of the build: when an action starts or when it ends (age reached, building done…). */
export type Moment = { id: string; on: "start" | "end" };

export type MomentOption = Moment & {
  /** "id" for the end, "id@start" for the start: stable, used as test id and DOM id. */
  key: string;
  action: Action;
  /** Position in the build order (1-based), shown so the list can be matched with it. */
  n: number;
  t?: number;
  text: string;
  icons: string[];
  /** The age the player is in at that moment (undefined: it never happens). */
  age?: Age;
};

const momentKey = (m: Moment) => (m.on === "start" ? `${m.id}@start` : m.id);

/** Every moment of the build, in time order: each action's end and, for one that lasts, its start
 *  (an instant action has a single moment). Moments that never happen go last. */
export function momentOptions(
  c: Parameters<typeof actionText>[0],
  build: Build,
  result?: SimResult,
): MomentOption[] {
  const worker = c.data.pantheons.get(build.pantheon)?.def.workers[0];
  const ageAt = (t?: number): Age | undefined =>
    t === undefined
      ? undefined
      : AGES.reduce<Age>((cur, a) => {
          const reached = a === "archaic" ? 0 : result?.ageTimes[a]?.reached;
          return reached !== undefined && reached <= t ? a : cur;
        }, "archaic");
  const out: MomentOption[] = [];
  build.actions.forEach((a, i) => {
    if (!a.id) return;
    const o = result?.actions[i];
    const icons = [...actionIcons(a, worker).slice(0, 2), actionTarget(a)].filter(
      (x): x is string => !!x,
    );
    const base = { action: a, n: i + 1, icons };
    if (hasDuration(a)) {
      out.push({
        ...base,
        id: a.id,
        on: "start",
        key: `${a.id}@start`,
        t: o?.startedAt,
        text: actionText(c, a),
        age: ageAt(o?.startedAt),
      });
    }
    const end = o?.completedAt ?? (hasDuration(a) ? undefined : o?.startedAt);
    out.push({
      ...base,
      id: a.id,
      on: "end",
      key: a.id,
      t: end,
      text: doneText(c, a),
      age: ageAt(end),
    });
  });
  return out
    .map((m, k) => ({ m, k }))
    .sort((x, y) => (x.m.t ?? Infinity) - (y.m.t ?? Infinity) || x.k - y.k)
    .map((x) => x.m);
}

function MomentRow({ m, build }: { m: MomentOption; build: Build }) {
  const { t } = useApp();
  const label = t(m.on === "start" ? "row.afterStart" : "row.afterDone");
  const kind = m.action.do === "train" && m.action.mode ? "rule" : m.action.do;
  return (
    <span class={`moment kind-${kind} ${m.t === undefined ? "never" : ""}`}>
      <span class="num moment-time">{m.t === undefined ? "—" : formatClock(m.t)}</span>
      <span class={`moment-badge ${m.on}`} title={label}>
        <Svg name={m.on === "start" ? "play" : "check"} label={label} />
      </span>
      <span class="moment-icons">
        {m.icons.map((id) => (
          <EntityIcon key={id} id={id} pantheon={build.pantheon} size={22} tip={false} />
        ))}
      </span>
      <span class="moment-text">{m.text}</span>
      <span class="num moment-n">#{m.n}</span>
    </span>
  );
}

type Filter = "all" | "end" | "start";
const PANEL_W = 420;

/** Picks a moment of the build (an action's start or end) from a list that can be long: in time
 *  order, grouped by age, with search, a start/end filter and keyboard use. Used wherever the
 *  player points at another action: "after", "as soon as possible after", milestones. */
export function MomentPicker({
  build,
  result,
  value,
  onPick,
  exclude,
  disabled,
  placeholder,
  ariaLabel,
  testid,
  isTaken,
}: {
  build: Build;
  result?: SimResult;
  value?: Moment;
  onPick: (m: Moment) => void;
  /** An action that cannot be picked (the one being edited). */
  exclude?: string;
  disabled?: boolean;
  /** Shown on the button when nothing is picked. */
  placeholder: string;
  ariaLabel: string;
  testid?: string;
  /** Moments already used (e.g. already a milestone): shown, not pickable. */
  isTaken?: (m: Moment) => boolean;
}) {
  const { t, data, locale } = useApp();
  const c = { data, pantheon: build.pantheon, locale };
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    width: number;
    maxHeight: number;
  }>();
  const search = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const uid = useRef(`mp-${Math.random().toString(36).slice(2, 8)}`).current;

  const all = momentOptions(c, build, result).filter((m) => m.id !== exclude);
  /** An instant action has no start of its own: a start picked on it shows as its moment. */
  const selected = value
    ? (all.find((m) => m.key === momentKey(value)) ?? all.find((m) => m.id === value.id))
    : undefined;
  const q = query.trim().toLocaleLowerCase(locale);
  const shown = all.filter(
    (m) =>
      (filter === "all" || m.on === filter) &&
      (!q ||
        m.text.toLocaleLowerCase(locale).includes(q) ||
        (m.t !== undefined && formatClock(m.t).includes(q)) ||
        `#${m.n}` === q),
  );
  const pickable = (m: MomentOption) => !isTaken?.(m);

  const place = () => {
    const r = button.current?.getBoundingClientRect();
    if (!r) return;
    /** The page width without its scrollbar. */
    const vw = document.documentElement.clientWidth;
    const width = Math.min(Math.max(r.width, PANEL_W), vw - 16);
    const left = Math.min(Math.max(8, r.left), vw - width - 8);
    /** Below the button, or above it when there is more room there; never past the window. */
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    setPos(
      below >= 320 || below >= above
        ? { left, width, top: r.bottom + 4, maxHeight: Math.min(440, below) }
        : { left, width, bottom: window.innerHeight - r.top + 4, maxHeight: Math.min(440, above) },
    );
  };
  const close = (focus = true) => {
    setOpen(false);
    setQuery("");
    setFilter("all");
    if (focus) button.current?.focus();
  };
  const show = () => {
    if (disabled) return;
    place();
    setOpen(true);
    const at = selected ? all.indexOf(selected) : -1;
    setActive(Math.max(0, at));
  };
  const pick = (m: MomentOption) => {
    if (!pickable(m)) return;
    onPick({ id: m.id, on: m.on });
    close();
  };

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      const el = e.target as Node;
      if (!panel.current?.contains(el) && !button.current?.contains(el)) close(false);
    };
    window.addEventListener("pointerdown", outside, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);
  useLayoutEffect(() => {
    if (open && pos) search.current?.focus({ preventScroll: true });
  }, [open, !pos]);
  /** Keeps the active option in view (on opening: the picked one). */
  useLayoutEffect(() => {
    if (!open) return;
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, query, filter]);

  const onKey = (e: KeyboardEvent) => {
    const step = (d: number) => {
      e.preventDefault();
      if (shown.length)
        setActive((a) => (Math.min(a, shown.length - 1) + d + shown.length) % shown.length);
    };
    if (e.key === "ArrowDown") step(1);
    else if (e.key === "ArrowUp") step(-1);
    else if (e.key === "Home" && e.ctrlKey) setActive(0);
    else if (e.key === "End" && e.ctrlKey) setActive(shown.length - 1);
    else if (e.key === "Enter") {
      e.preventDefault();
      const m = shown[Math.min(active, shown.length - 1)];
      if (m) pick(m);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") close(false);
  };

  const ageName = (age: Age) => {
    const name = data.common.ages.find((a) => a.id === age)?.name;
    return name ? text(locale, name) : age;
  };
  const activeKey = shown[Math.min(active, shown.length - 1)]?.key;

  return (
    <>
      <button
        type="button"
        ref={button}
        class={`moment-picker ${open ? "open" : ""} ${selected ? "" : "empty"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={selected ? `${ariaLabel}: ${selected.text}` : ariaLabel}
        data-testid={testid}
        data-value={selected?.key ?? ""}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            show();
          }
        }}
      >
        {selected ? (
          <MomentRow m={selected} build={build} />
        ) : (
          <span class="moment-placeholder">
            <Svg name="plus" />
            {placeholder}
          </span>
        )}
        <span class="moment-chevron" aria-hidden="true">
          <Svg name="chevron" />
        </span>
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={panel}
            class="moment-panel"
            style={{
              left: `${pos.left}px`,
              width: `${pos.width}px`,
              maxHeight: `${pos.maxHeight}px`,
              ...(pos.top !== undefined ? { top: `${pos.top}px` } : { bottom: `${pos.bottom}px` }),
            }}
            data-testid={testid ? `${testid}-panel` : undefined}
          >
            <div class="moment-search">
              <input
                type="text"
                ref={search}
                value={query}
                placeholder={t("picker.search")}
                aria-label={t("picker.search")}
                role="combobox"
                aria-expanded="true"
                aria-controls={uid}
                aria-activedescendant={activeKey ? `${uid}-${activeKey}` : undefined}
                onInput={(e) => {
                  setQuery(e.currentTarget.value);
                  setActive(0);
                }}
                onKeyDown={onKey}
              />
              <div class="segmented" role="group" aria-label={t("picker.filter")}>
                {(["all", "end", "start"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    class="chip"
                    aria-pressed={filter === f}
                    data-testid={`picker-filter-${f}`}
                    onClick={() => {
                      setFilter(f);
                      setActive(0);
                    }}
                  >
                    {f !== "all" && <Svg name={f === "start" ? "play" : "check"} />}
                    {t(`picker.${f}`)}
                  </button>
                ))}
              </div>
            </div>
            <ul class="moment-list" role="listbox" id={uid} ref={list} aria-label={ariaLabel}>
              {shown.length === 0 && <li class="moment-empty">{t("picker.empty")}</li>}
              {shown.map((m, k) => {
                const head = k === 0 || shown[k - 1]!.age !== m.age;
                const taken = !pickable(m);
                return (
                  <Fragment key={m.key}>
                    {head && (
                      <li class="moment-group" role="presentation">
                        {m.age ? (
                          <>
                            <EntityIcon
                              id={m.age}
                              pantheon={build.pantheon}
                              size={18}
                              tip={false}
                            />
                            {ageName(m.age)}
                          </>
                        ) : (
                          t("picker.never")
                        )}
                      </li>
                    )}
                    <li
                      id={`${uid}-${m.key}`}
                      role="option"
                      aria-selected={selected?.key === m.key}
                      aria-disabled={taken || undefined}
                      class={`moment-option ${k === Math.min(active, shown.length - 1) ? "active" : ""} ${selected?.key === m.key ? "selected" : ""} ${taken ? "taken" : ""}`}
                      data-index={k}
                      data-testid={`moment-${m.key}`}
                      onPointerMove={() => k !== active && setActive(k)}
                      onClick={() => pick(m)}
                    >
                      <MomentRow m={m} build={build} />
                      {selected?.key === m.key && (
                        <span class="moment-picked" aria-hidden="true">
                          <Svg name="check" />
                        </span>
                      )}
                    </li>
                  </Fragment>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
