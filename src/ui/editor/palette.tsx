import { useState } from "preact/hooks";
import { AGES, type Age } from "../../data/schema.ts";
import type { Action, ActionKind, Build } from "../../engine/build.ts";
import { text } from "../../i18n/index.ts";
import { useApp } from "../context.tsx";
import { EntityIcon, Tip, HelpText, useHelp } from "../icon.tsx";
import { KIND_ICON, Svg } from "../svg.tsx";
import { ageRank, chosenMinors, PALETTE_KINDS } from "./labels.ts";

type Option = { id: string; age?: Age; detail?: string };

function costText(cost: Partial<Record<string, number>>, t: (k: string) => string): string {
  return Object.entries(cost)
    .filter(([, v]) => v)
    .map(([r, v]) => `${v} ${t(`res.${r}`).toLowerCase()}`)
    .join(" · ");
}

export function Palette({ build, onAdd }: { build: Build; onAdd: (a: Action) => void }) {
  const { data, t, locale } = useApp();
  const help = useHelp();
  const [kind, setKind] = useState<ActionKind | null>(null);
  const [age, setAge] = useState<Age | null>(null);
  const p = data.pantheons.get(build.pantheon);
  const god = data.gods.get(build.god);
  if (!p || !god) return null;
  const minors = Object.values(chosenMinors(build));

  const allowed = (requires?: string[]) => {
    const minorReqs = (requires ?? []).filter((r) => data.minors.has(r));
    if (minorReqs.length && !minorReqs.some((r) => minors.includes(r))) return false;
    return (requires ?? []).every((r) => !data.gods.has(r) || r === build.god);
  };

  const options = (): Option[] => {
    switch (kind) {
      case "train":
      case "autoTrain":
      case "trainWhenAffordable":
        return [...p.units.values()]
          .filter((u) => u.trainedAt.length > 0 && allowed(u.requires))
          .map((u) => ({
            id: u.id,
            age: u.age,
            detail: `${costText(u.cost, t)} · ${u.trainTime} s`,
          }));
      case "promote":
        return [...p.units.values()]
          .filter((u) => u.promotion)
          .map((u) => ({ id: u.id, age: u.age }));
      case "build":
      case "timeShift":
        return [...p.buildings.values()]
          .filter((b) => allowed(b.requires) && b.id !== p.def.townCenter)
          .map((b) => ({
            id: b.id,
            age: b.age,
            detail: `${costText(b.cost, t)} · ${b.buildTime} s`,
          }));
      case "research":
        return [...p.researches.values()]
          .filter((r) => allowed(r.requires))
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

  const pick = (o: Option) => {
    switch (kind) {
      case "train":
        return onAdd({ when: "asap", do: "train", unit: o.id, count: 1 });
      case "autoTrain":
        return onAdd({ when: "asap", do: "autoTrain", unit: o.id });
      case "trainWhenAffordable":
        return onAdd({ when: "asap", do: "trainWhenAffordable", unit: o.id });
      case "promote":
        return onAdd({ when: "asap", do: "promote", unit: o.id });
      case "build":
        return onAdd({ when: "asap", do: "build", building: o.id });
      case "timeShift":
        return onAdd({ when: "asap", do: "timeShift", building: o.id });
      case "research":
        return onAdd({ when: "asap", do: "research", research: o.id });
      case "power":
        return onAdd({ when: "asap", do: "power", power: o.id });
      case "age":
        return onAdd({
          when: "asap",
          do: "age",
          to: o.age as Exclude<Age, "archaic">,
          minor: o.id,
        });
    }
  };

  const choose = (k: ActionKind) => {
    if (k === "move")
      return onAdd({ when: "asap", do: "move", count: 1, from: "food", to: "wood" });
    if (k === "stopAutoTrain") return onAdd({ when: "asap", do: "stopAutoTrain" });
    if (k === "stopTrainWhenAffordable")
      return onAdd({ when: "asap", do: "stopTrainWhenAffordable" });
    if (k === "event") return onAdd({ when: "asap", do: "event", note: "" });
    setKind(kind === k ? null : k);
  };

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
      <div class="palette-kinds" role="toolbar" aria-label={t("editor.add")}>
        {PALETTE_KINDS.map((k) => (
          <Tip key={k} label={[t(`action.${k}`), help(`action.${k}`)].filter(Boolean).join("\n")}>
            <button
              class={`btn icon-only kind-btn kind-${k}`}
              aria-pressed={kind === k}
              aria-label={t(`action.${k}`)}
              data-testid={`kind-${k}`}
              onClick={() => choose(k)}
            >
              <Svg name={KIND_ICON[k] ?? "plus"} />
            </button>
          </Tip>
        ))}
      </div>
      {kind && (
        <>
          <div class="row" style={{ marginTop: 8 }}>
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
                    onClick={() => pick(o)}
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
