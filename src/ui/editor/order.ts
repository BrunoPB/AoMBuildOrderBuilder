import type { Action, When } from "../../engine/build.ts";
import { formatClock, parseClock } from "../../engine/time.ts";

/** Seconds of a fixed-time action ("m:ss"); undefined for asap, always and "after". */
export function fixedTime(w: When): number | undefined {
  return typeof w === "string" && w !== "asap" && w !== "always" ? parseClock(w) : undefined;
}

type Times = readonly (number | undefined)[];

/** When an action is planned to start: its fixed time, or for "after" the other action's
 *  start/end (as simulated) plus the delay; undefined for asap, always or not known yet. */
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
