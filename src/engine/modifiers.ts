import type { Cost, Modifier, ResourceId, SourceId } from "../data/schema.ts";

export type ModContext = {
  id?: string;
  tags?: string[];
  source?: SourceId;
  resource?: ResourceId;
  /** Kronos Manors in range of the building (each adds the bonus again). */
  manors?: number;
};

export function modifierApplies(mod: Modifier, ctx: ModContext): boolean {
  const condition = mod.condition ?? "always";
  if (condition === "custom") return false;
  if (condition === "nearManor" && !ctx.manors) return false;
  if (ctx.id && mod.except?.includes(ctx.id)) return false;
  const scope = mod.scope;
  if (!scope) return true;
  if (scope.ids && !(ctx.id && scope.ids.includes(ctx.id))) return false;
  if (scope.tags && !scope.tags.some((t) => ctx.tags?.includes(t))) return false;
  if (scope.sources && !(ctx.source && scope.sources.includes(ctx.source))) return false;
  if (scope.resources && !(ctx.resource && scope.resources.includes(ctx.resource))) return false;
  return true;
}

/** (base + Σ add) × (1 + Σ pct) × Π mul, over the modifiers of `target` that apply to ctx. */
export function applyModifiers(
  base: number,
  target: Modifier["target"],
  mods: readonly Modifier[],
  ctx: ModContext,
): number {
  let add = 0;
  let pct = 0;
  let mul = 1;
  for (const mod of mods) {
    if (mod.target !== target || !modifierApplies(mod, ctx)) continue;
    // Manor auras stack additively: n Manors × 1.25 → 1 + 0.25 n.
    const n = mod.condition === "nearManor" ? (ctx.manors ?? 0) : 1;
    if (mod.op === "add") add += mod.value * n;
    else if (mod.op === "pct") pct += mod.value * n;
    else mul *= n === 1 ? mod.value : 1 + (mod.value - 1) * n;
  }
  return (base + add) * (1 + pct) * mul;
}

export function applyCostModifiers(cost: Cost, mods: readonly Modifier[], ctx: ModContext): Cost {
  const out: Cost = {};
  for (const [res, value] of Object.entries(cost) as [ResourceId, number][]) {
    const v = applyModifiers(value, "cost", mods, { ...ctx, resource: res });
    out[res] = Math.max(0, Math.round(v * 1000) / 1000);
  }
  return out;
}
