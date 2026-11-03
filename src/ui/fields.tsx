import type { InputHTMLAttributes, TargetedEvent, TargetedFocusEvent } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onInput" | "onChange">;

/** Marks the field being typed in, so code that moves focus (focusAction) leaves it there. */
export const EDITING_ATTR = "data-live-editing";

/** A field that applies what is typed at once, not only when leaving it, so the timeline, charts
 *  and every other view follow while typing. What was typed stays on screen while editing, even
 *  when it is not a valid value yet; on leaving, the field shows the value again. A re-render that
 *  moves the field in the page (its action reordered by time) gives it its focus back. */
function useLive(accept: (raw: string) => boolean, onValue: (raw: string) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const editing = useRef(false);
  const typedAt = useRef(0);
  const refocus = () => {
    const el = ref.current;
    if (el && editing.current && el.isConnected && document.activeElement !== el)
      el.focus({ preventScroll: true });
  };
  useEffect(refocus);
  const stop = () => {
    editing.current = false;
    ref.current?.removeAttribute(EDITING_ATTR);
    setDraft(null);
  };
  return {
    draft,
    props: {
      ref,
      onFocus: () => {
        editing.current = true;
        ref.current?.setAttribute(EDITING_ATTR, "");
      },
      onInput: (e: TargetedEvent<HTMLInputElement>) => {
        const raw = e.currentTarget.value;
        setDraft(raw);
        typedAt.current = Date.now();
        if (accept(raw)) onValue(raw);
      },
      onBlur: (e: TargetedFocusEvent<HTMLInputElement>) => {
        /** Focus lost to nothing right after typing: the field was moved by a re-render. */
        if (!e.relatedTarget && Date.now() - typedAt.current < 1000 && document.hasFocus()) {
          setTimeout(refocus, 0);
          return;
        }
        stop();
      },
    },
  };
}

/** `onValue` gets the raw text whenever it is empty (the caller decides what that means) or a
 *  number within `min`/`max`: "0." on the way to "0.85" is not applied. */
export function LiveNumber({
  value,
  onValue,
  ...rest
}: InputProps & { value: number | string | undefined; onValue: (raw: string) => void }) {
  const bound = (v: unknown, fallback: number) =>
    v === undefined || v === "" ? fallback : Number(v);
  const min = bound(rest.min, -Infinity);
  const max = bound(rest.max, Infinity);
  const live = useLive((raw) => {
    if (raw.trim() === "") return true;
    const v = Number(raw);
    return Number.isFinite(v) && v >= min && v <= max;
  }, onValue);
  return (
    <input
      {...(rest as object)}
      type="number"
      value={live.draft ?? String(value ?? "")}
      {...live.props}
    />
  );
}

export function LiveText({
  value,
  onValue,
  ...rest
}: InputProps & { value: string | undefined; onValue: (raw: string) => void }) {
  const live = useLive(() => true, onValue);
  return (
    <input {...(rest as object)} type="text" value={live.draft ?? value ?? ""} {...live.props} />
  );
}

/** Undo tag for the field being typed in, so typing in it within a second is one undo step. */
const fieldTags = new WeakMap<Element, string>();
let nextTag = 0;
export function focusedFieldTag(): string | undefined {
  const el = document.activeElement;
  if (!el || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
  if (el instanceof HTMLInputElement && !["text", "number"].includes(el.type)) return;
  let tag = fieldTags.get(el);
  if (!tag) fieldTags.set(el, (tag = `field-${nextTag++}`));
  return tag;
}
