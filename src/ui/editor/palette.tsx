import { useState } from "preact/hooks";
import { AGES, type Age } from "../../data/schema.ts";
import type { Action, ActionKind, Build } from "../../engine/build.ts";
import { text } from "../../i18n/index.ts";
import { useApp } from "../context.tsx";
import { EntityIcon, Tip, HelpText, useHelp, useLabel } from "../icon.tsx";
import { KIND_ICON, Svg } from "../svg.tsx";
import { ACTION_MIME, ageRank, chosenMinors, PALETTE_GROUPS } from "./labels.ts";

type Option = { id: string; age?: Age; detail?: string };

function costText(cost: Partial<Record<string, number>>, t: (k: string) => string): string {
  return Object.entries(cost)
    .filter(([, v]) => v)
    .map(([r, v]) => `${v} ${t(`res.${r}`).toLowerCase()}`)
    .join(" · ");
}

/** `idle`: workers idle at the start of the simulation; "Move" sends them to work first. */
export function Palette({
  build,
  idle = 0,
  onAdd,
}: {
  build: Build;
  idle?: number;
  onAdd: (a: Action) => void;
}) {
  const { data, t, locale } = useApp();
  const help = useHelp();
  const [kind, setKind] = useState<ActionKind | null>(null);
  const [age, setAge] = useState<Age | null>(null);
  const p = data.pantheons.get(build.pantheon);
  const god = data.gods.get(build.god);
  const label = useLabel();
  const ctx = { pantheon: build.pantheon, god: build.god };
  if (!p || !god) return null;
  const minors = Object.values(chosenMinors(build));

  const allowed = (requires?: string[], excludeGods?: string[]) => {
    if (excludeGods?.includes(build.god)) return false;
    const minorReqs = (requires ?? []).filter((r) => data.minors.has(r));
    if (minorReqs.length && !minorReqs.some((r) => minors.includes(r))) return false;
    return (requires ?? []).every((r) => !data.gods.has(r) || r === build.god);
  };

  const empowerSources = (p.def.empower?.sources ?? []).filter(
    (s) => !s.gods || s.gods.includes(build.god),
  );
  const summonUnits =
    p.def.summon && p.def.summon.gods.includes(build.god) ? p.def.summon.units : [];

  /** Only actions this god can use (Time Shift, promotions, Empower, summons…). */
  const available = (k: ActionKind): boolean => {
    if (k === "timeShift") return god.timeShift !== undefined;
    if (k === "empower") return empowerSources.length > 0;
    if (k === "summon") return summonUnits.length > 0;
    if (k === "promote")
      return [...p.units.values()].some((u) => u.promotion && allowed(u.requires, u.excludeGods));
    return true;
  };

  const current = kind && available(kind) ? kind : null;

  const options = (): Option[] => {
    switch (current) {
      case "train":
      case "autoTrain":
      case "trainWhenAffordable":
        return [...p.units.values()]
          .filter((u) => u.trainedAt.length > 0 && allowed(u.requires, u.excludeGods))
          .map((u) => ({
            id: u.id,
            age: u.age,
            detail: `${costText(u.cost, t)} · ${u.trainTime} s`,
          }));
      case "promote":
        return [...p.units.values()]
          .filter((u) => u.promotion && allowed(u.requires, u.excludeGods))
          .map((u) => ({
            id: u.id,
            age: u.age,
            detail: `→ ${text(locale, p.units.get(u.promotion!.to)?.name ?? u.name)} · ${costText(u.promotion!.cost, t)}`,
          }));
      case "empower":
        return (p.def.empower?.targets ?? [])
          .map((id) => p.buildings.get(id))
          .filter(
            (b): b is NonNullable<typeof b> =>
              b !== undefined && allowed(b.requires, b.excludeGods),
          )
          .map((b) => ({ id: b.id, age: b.age }));
      case "summon":
        return summonUnits
          .map((id) => p.units.get(id))
          .filter((u): u is NonNullable<typeof u> => u !== undefined)
          .map((u) => ({
            id: u.id,
            age: u.age,
            detail: `${costText(u.cost, t)} · ${u.trainTime} s${u.carcass ? ` · ${u.carcass} ${t("res.food").toLowerCase()}` : ""}`,
          }));
      case "timeShift":
        return (god.timeShift?.buildings ?? [])
          .map((r) => p.buildings.get(r.id))
          .filter((b): b is NonNullable<typeof b> => b !== undefined)
          .map((b) => ({ id: b.id, age: b.age, detail: `${b.buildTime} s` }));
      case "build":
        return [...p.buildings.values()]
          .filter((b) => allowed(b.requires, b.excludeGods) && b.id !== p.def.townCenter)
          .map((b) => ({
            id: b.id,
            age: b.age,
            detail: `${costText(b.cost, t)} · ${b.buildTime} s`,
          }));
      case "research":
        return [...p.researches.values()]
          .filter((r) => allowed(r.requires, r.excludeGods))
          .map((r) => ({ id: r.id, age: r.age, detail: `${costText(r.cost, t)} · ${r.time} s` }));
      case "power": {
        const ids = [...god.powers, ...minors.flatMap((m) => data.minors.get(m)?.powers ?? [])];
        return [...new Set(ids)].filter((id) => data.powers.has(id)).map((id) => ({ id }));
      }
      case "age": {
        const taken = chosenMinors(build);
        return (["classical", "heroic", "mythic"] as const)
          .filter((a) => !taken[a])
          .flatMap((a) => god.minors[a].map((m) => ({ id: m, age: a })));
      }
      default:
        return [];
    }
  };

  const actionFor = (o: Option): Action | undefined => {
    switch (current) {
      case "train":
        return { when: "asap", do: "train", unit: o.id, count: 1 };
      case "autoTrain":
        return { when: "asap", do: "autoTrain", unit: o.id };
      case "trainWhenAffordable":
        return { when: "asap", do: "trainWhenAffordable", unit: o.id };
      case "promote":
        return { when: "asap", do: "promote", unit: o.id };
      case "build":
        return { when: "asap", do: "build", building: o.id };
      case "timeShift":
        return { when: "asap", do: "timeShift", building: o.id };
      case "empower":
        return { when: "asap", do: "empower", by: empowerSources[0]!.unit, building: o.id };
      case "summon":
        return { when: "asap", do: "summon", unit: o.id, count: 1, hunt: true };
      case "research":
        return { when: "asap", do: "research", research: o.id };
      case "power":
        return { when: "asap", do: "power", power: o.id };
      case "age":
        return { when: "asap", do: "age", to: o.age as Exclude<Age, "archaic">, minor: o.id };
    }
    return undefined;
  };

  /** Kinds that add an action right away (no entity to pick). */
  const immediate = (k: ActionKind): Action | undefined => {
    if (k === "move")
      return idle > 0
        ? { when: "asap", do: "move", count: idle, from: "idle", to: "food" }
        : { when: "asap", do: "move", count: 1, from: "food", to: "wood" };
    if (k === "stopAutoTrain") return { when: "asap", do: "stopAutoTrain" };
    if (k === "stopTrainWhenAffordable") return { when: "asap", do: "stopTrainWhenAffordable" };
    if (k === "event") return { when: "asap", do: "event", note: "" };
    return undefined;
  };

  const choose = (k: ActionKind) => {
    const a = immediate(k);
    if (a) return onAdd(a);
    setKind(kind === k ? null : k);
  };

  /** Drag an action from the palette into a position of the action list. */
  const draggable = (a: Action | undefined) =>
    a
      ? {
          draggable: true,
          onDragStart: (e: DragEvent) => e.dataTransfer?.setData(ACTION_MIME, JSON.stringify(a)),
        }
      : {};

  const list = options().filter((o) => !age || !o.age || o.age === age);
  const sorted = [...list].sort(
    (a, b) => ageRank(a.age ?? "archaic") - ageRank(b.age ?? "archaic"),
  );

  return (
    <div class="panel" data-testid="palette">
      <h3>
        <Svg name="plus" />
        <HelpText k="editor.add" />
      </h3>
      {PALETTE_GROUPS.map((g) => {
        const kinds = g.kinds.filter(available);
        if (kinds.length === 0) return null;
        return (
          <div key={g.id} class="palette-group" data-testid={`palette-${g.id}`}>
            <span class="palette-group-label">
              <HelpText k={`palette.group.${g.id}`} />
            </span>
            <div class="palette-kinds" role="toolbar" aria-label={t(`palette.group.${g.id}`)}>
              {kinds.map((k) => (
                <Tip
                  key={k}
                  label={[label(`action.${k}`, ctx), help(`action.${k}`, ctx)]
                    .filter(Boolean)
                    .join("\n")}
                >
                  <button
                    class={`btn icon-only kind-btn kind-${k}`}
                    aria-pressed={kind === k}
                    aria-label={label(`action.${k}`, ctx)}
                    data-testid={`kind-${k}`}
                    onClick={() => choose(k)}
                    {...draggable(immediate(k))}
                  >
                    <Svg name={KIND_ICON[k] ?? "plus"} />
                  </button>
                </Tip>
              ))}
            </div>
          </div>
        );
      })}
      {current && (
        <>
          <div class="row" style={{ marginTop: "8px" }}>
            <button class="chip" aria-pressed={age === null} onClick={() => setAge(null)}>
              <HelpText k="palette.allAges" />
            </button>
            {AGES.map((a) => (
              <Tip key={a} label={text(locale, data.common.ages.find((x) => x.id === a)!.name)}>
                <button
                  class="chip"
                  aria-pressed={age === a}
                  onClick={() => setAge(age === a ? null : a)}
                >
                  <EntityIcon id={a} pantheon={build.pantheon} size={20} tip={false} />
                </button>
              </Tip>
            ))}
          </div>
          <div class="entity-grid" data-testid="entity-grid">
            {sorted.map((o) => {
              const name = text(
                locale,
                data.minors.get(o.id)?.name ??
                  p.units.get(o.id)?.name ??
                  p.buildings.get(o.id)?.name ??
                  p.researches.get(o.id)?.name ??
                  data.powers.get(o.id)?.name ?? { "pt-BR": o.id, en: o.id },
              );
              return (
                <Tip key={`${o.age}-${o.id}`} label={[name, o.detail].filter(Boolean).join("\n")}>
                  <button
                    class="entity-btn"
                    aria-label={name}
                    data-testid={`pick-${o.id}`}
                    onClick={() => {
                      const a = actionFor(o);
                      if (a) onAdd(a);
                    }}
                    {...draggable(actionFor(o))}
                  >
                    <EntityIcon id={o.id} pantheon={build.pantheon} size={40} tip={false} />
                    {o.age && o.age !== "archaic" && (
                      <span class="age-badge">
                        <EntityIcon id={o.age} pantheon={build.pantheon} size={14} tip={false} />
                      </span>
                    )}
                  </button>
                </Tip>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
