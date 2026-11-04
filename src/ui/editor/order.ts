import type { Action, When } from "../../engine/build.ts";
import { formatClock, parseClock } from "../../engine/time.ts";

/** Seconds of a fixed-time action ("m:ss"); undefined for one that waits on another action. */
export function fixedTime(w: When): number | undefined {
  return typeof w === "string" ? parseClock(w) : undefined;
}

/** What the palette gives a new action: "as soon as possible", from the start of the action that
 *  will be right before it (set by insertAction, once its place is known). */
export const ASAP_PREVIOUS: When = { after: "", on: "start", asap: true };

/** "As soon as possible" for an action placed at `at`: from when the action before it starts;
 *  with nothing before it, at 0:00. */
export function asapAfter(actions: readonly Action[], at: number): When {
  const prev = actions[at - 1];
  return prev?.id ? { after: prev.id, on: "start", asap: true } : "0:00";
}

/** Removes the actions `drop` picks. One that waited on a removed action waits on what that one
 *  waited on, or, when it had a fixed time, on the action before it (from its start), or on that
 *  time when there is none. */
export function removeActions(
  actions: readonly Action[],
  drop: (a: Action, i: number) => boolean,
): Action[] {
  const removed = new Map<string, When>();
  actions.forEach((a, i) => {
    if (!drop(a, i) || !a.id) return;
    const prev = actions.slice(0, i).findLast((x, k) => x.id && !drop(x, k));
    removed.set(
      a.id,
      typeof a.when === "object"
        ? { after: a.when.after, ...(a.when.on ? { on: a.when.on } : {}) }
        : prev
          ? { after: prev.id!, on: "start" }
          : a.when,
    );
  });
  const resolve = (w: When, seen = new Set<string>()): When => {
    if (typeof w !== "object" || !removed.has(w.after) || seen.has(w.after)) return w;
    seen.add(w.after);
    const to = removed.get(w.after)!;
    if (typeof to === "string") return formatClock(parseClock(to) + (w.delay ?? 0));
    return resolve(
      {
        after: to.after,
        ...(to.on ? { on: to.on } : {}),
        ...(w.delay ? { delay: w.delay } : {}),
        ...(w.asap ? { asap: true as const } : {}),
      },
      seen,
    );
  };
  return actions
    .filter((a, i) => !drop(a, i))
    .map((a) => {
      const when = resolve(a.when);
      return when === a.when ? a : ({ ...a, when } as Action);
    });
}

type Times = readonly (number | undefined)[];

/** When an action is planned to start: its fixed time, or the other action's start/end (as
 *  simulated) plus the delay (for asap, the earliest it can start); undefined when not known yet. */
export function plannedTime(
  a: Action,
  actions: readonly Action[],
  outcomes: readonly ({ startedAt?: number; completedAt?: number } | undefined)[],
): number | undefined {
  const fixed = fixedTime(a.when);
  if (fixed !== undefined || typeof a.when !== "object") return fixed;
  const { after, on, delay } = a.when;
  const o = outcomes[actions.findIndex((x) => x.id === after)];
  const base = on === "start" ? o?.startedAt : o?.completedAt;
  return base === undefined ? undefined : base + (delay ?? 0);
}

function neighbours(order: number[], at: number, times: Times) {
  let prev: number | undefined;
  let next: number | undefined;
  for (let k = at - 1; k >= 0 && prev === undefined; k--) prev = times[order[k]!];
  for (let k = at + 1; k < order.length && next === undefined; k++) next = times[order[k]!];
  return { prev, next };
}

/** Action `i` got a new time (`own`, its fixed time by default): move it after the last action
 *  that happens no later. `times[k]`: when action k happens (undefined if unknown). */
export function placeByTime(
  actions: Action[],
  times: Times,
  i: number,
  own = fixedTime(actions[i]!.when),
): { actions: Action[]; index: number } {
  if (own === undefined) return { actions, index: i };
  const all = actions.map((_, k) => k);
  const { prev, next } = neighbours(all, i, times);
  if ((prev === undefined || prev <= own) && (next === undefined || own <= next))
    return { actions, index: i };
  const rest = all.filter((k) => k !== i);
  let at = 0;
  rest.forEach((k, p) => {
    const t = times[k];
    if (t !== undefined && t <= own) at = p + 1;
  });
  rest.splice(at, 0, i);
  return { actions: rest.map((k) => actions[k]!), index: at };
}

/** Moves action `from` to position `to`; a fixed-time action takes a time between its new
 *  neighbours (dropped after a 0:40 action, a 0:30 one becomes 0:40). */
export function moveWithTime(actions: Action[], times: Times, from: number, to: number): Action[] {
  const order = actions.map((_, k) => k);
  order.splice(from, 1);
  order.splice(to, 0, from);
  const moved = actions[from]!;
  const own = fixedTime(moved.when);
  const out = order.map((k) => actions[k]!);
  if (own === undefined) return out;
  const { prev, next } = neighbours(order, to, times);
  let t = own;
  if (prev !== undefined && t < prev) t = prev;
  if (next !== undefined && t > next && (prev === undefined || next >= prev)) t = next;
  if (t !== own) out[to] = { ...moved, when: formatClock(t) } as Action;
  return out;
}

/** An "after" action whose simulated start drifted out of the list's time order (its anchor moved),
 *  put back in place; null when every one is in order. One move per call: the next simulation
 *  tells where the others stand. */
export function placeDrifted(
  actions: Action[],
  outcomes: readonly ({ startedAt?: number } | undefined)[],
): Action[] | null {
  const times = actions.map((a, k) => outcomes[k]?.startedAt ?? fixedTime(a.when));
  for (let i = 0; i < actions.length; i++) {
    const own = outcomes[i]?.startedAt;
    if (typeof actions[i]!.when !== "object" || own === undefined) continue;
    const placed = placeByTime(actions, times, i, own);
    if (placed.index !== i) return placed.actions;
  }
  return null;
}
