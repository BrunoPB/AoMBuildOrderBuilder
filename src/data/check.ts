import type { GameData } from "./load.ts";
import type { Meta } from "./schema.ts";

/** Every id referenced inside the game data must exist. Returns one message per broken reference. */
export function checkReferences(data: GameData): string[] {
  const issues: string[] = [];
  for (const [pid, p] of data.pantheons) {
    const known = (id: string) =>
      p.units.has(id) ||
      p.buildings.has(id) ||
      p.researches.has(id) ||
      data.gods.has(id) ||
      data.minors.has(id);
    const where = (kind: string, id: string) => `${pid}/${kind} "${id}"`;
    const need = (ok: boolean, from: string, what: string, id: string) => {
      if (!ok) issues.push(`${from}: unknown ${what} "${id}"`);
    };
    for (const w of p.def.workers) need(p.units.has(w), `${pid}/workers`, "unit", w);
    need(p.buildings.has(p.def.townCenter), `${pid}/townCenter`, "building", p.def.townCenter);
    for (const g of p.def.gods) {
      need(data.gods.has(g), `${pid}/gods`, "god", g);
      if (data.gods.get(g) && data.gods.get(g)!.pantheon !== pid)
        issues.push(`${pid}/gods: "${g}" belongs to another pantheon`);
    }
    for (const u of Object.keys(p.def.start.units)) need(p.units.has(u), `${pid}/start`, "unit", u);
    for (const b of Object.keys(p.def.start.buildings ?? {}))
      need(p.buildings.has(b), `${pid}/start`, "building", b);
    const favor = p.def.favor;
    if (favor.type === "oracles") {
      need(p.units.has(favor.unit), `${pid}/favor`, "unit", favor.unit);
      if (favor.heroUnit) need(p.units.has(favor.heroUnit), `${pid}/favor`, "unit", favor.heroUnit);
    }
    if (favor.type === "templeWorkers")
      need(p.buildings.has(favor.building), `${pid}/favor`, "building", favor.building);
    if (favor.type === "monuments")
      for (const b of Object.keys(favor.rates))
        need(p.buildings.has(b), `${pid}/favor`, "building", b);
    for (const a of p.def.ageUps) {
      need(p.buildings.has(a.at), `${pid}/ageUp ${a.to}`, "building", a.at);
      for (const group of a.requiresAnyOf ?? [])
        for (const id of group) need(known(id), `${pid}/ageUp ${a.to}`, "id", id);
    }
    for (const u of p.units.values()) {
      for (const b of u.trainedAt) need(p.buildings.has(b), where("unit", u.id), "building", b);
      for (const r of u.requires ?? []) need(known(r), where("unit", u.id), "requirement", r);
      if (u.promotion)
        need(p.units.has(u.promotion.to), where("unit", u.id), "promotion unit", u.promotion.to);
    }
    for (const b of p.buildings.values()) {
      for (const u of b.trains ?? []) need(p.units.has(u), where("building", b.id), "unit", u);
      for (const r of b.researches ?? [])
        need(p.researches.has(r), where("building", b.id), "research", r);
      for (const r of b.requires ?? []) need(known(r), where("building", b.id), "requirement", r);
    }
    for (const r of p.researches.values()) {
      need(p.buildings.has(r.at), where("research", r.id), "building", r.at);
      for (const q of r.requires ?? []) need(known(q), where("research", r.id), "requirement", q);
    }
  }
  for (const g of data.gods.values()) {
    const p = data.pantheons.get(g.pantheon);
    if (!p) {
      issues.push(`god "${g.id}": pantheon "${g.pantheon}" has no data`);
      continue;
    }
    for (const pw of g.powers)
      if (!data.powers.has(pw)) issues.push(`god "${g.id}": unknown power "${pw}"`);
    for (const [age, list] of Object.entries(g.minors)) {
      for (const m of list) {
        const minor = data.minors.get(m);
        if (!minor) issues.push(`god "${g.id}": unknown minor god "${m}"`);
        else if (minor.age !== age)
          issues.push(`god "${g.id}": minor "${m}" is ${minor.age}, listed as ${age}`);
      }
    }
    for (const u of g.unlocks ?? []) {
      if (!p.units.has(u) && !p.buildings.has(u) && !p.researches.has(u))
        issues.push(`god "${g.id}": unknown unlock "${u}"`);
    }
  }
  for (const m of data.minors.values()) {
    const p = data.pantheons.get(m.pantheon);
    if (!p) {
      issues.push(`minor "${m.id}": pantheon "${m.pantheon}" has no data`);
      continue;
    }
    for (const pw of m.powers)
      if (!data.powers.has(pw)) issues.push(`minor "${m.id}": unknown power "${pw}"`);
    for (const u of m.unlocks) {
      if (!p.units.has(u) && !p.buildings.has(u) && !p.researches.has(u))
        issues.push(`minor "${m.id}": unknown unlock "${u}"`);
    }
    for (const u of Object.keys(m.freeUnitsOnAgeUp ?? {}))
      if (!p.units.has(u)) issues.push(`minor "${m.id}": unknown free unit "${u}"`);
  }
  for (const pw of data.powers.values()) {
    const p = data.pantheons.get(pw.pantheon);
    for (const u of Object.keys(pw.effect.spawn ?? {})) {
      if (p && !p.units.has(u)) issues.push(`power "${pw.id}": unknown spawn unit "${u}"`);
    }
  }
  return issues;
}

/** Every icon id used anywhere in the data. */
export function usedIcons(data: GameData): Set<string> {
  const icons = new Set<string>();
  for (const a of data.common.ages) icons.add(a.icon);
  for (const p of data.common.pantheons) icons.add(p.icon);
  for (const r of data.resources) icons.add(r.icon);
  for (const s of data.sources.values()) icons.add(s.icon);
  for (const p of data.pantheons.values()) {
    for (const x of [...p.units.values(), ...p.buildings.values(), ...p.researches.values()])
      icons.add(x.icon);
  }
  for (const g of data.gods.values()) {
    icons.add(g.icon);
    if (g.portrait) icons.add(g.portrait);
  }
  for (const m of data.minors.values()) {
    icons.add(m.icon);
    if (m.portrait) icons.add(m.portrait);
  }
  for (const pw of data.powers.values()) icons.add(pw.icon);
  return icons;
}

export type LowConfidence = { where: string; field?: string; meta: Meta };

export function listLowConfidence(data: GameData): LowConfidence[] {
  const out: LowConfidence[] = [];
  const visit = (where: string, entity: { meta: Meta; fieldMeta?: Record<string, Meta> }) => {
    if (entity.meta.confidence === "low") out.push({ where, meta: entity.meta });
    for (const [field, meta] of Object.entries(entity.fieldMeta ?? {})) {
      if (meta.confidence === "low") out.push({ where, field, meta });
    }
  };
  for (const [pid, p] of data.pantheons) {
    visit(`${pid}`, p.def);
    if (p.def.favor.meta.confidence === "low")
      out.push({ where: `${pid}/favor`, meta: p.def.favor.meta });
    for (const a of p.def.ageUps) visit(`${pid}/age ${a.to}`, a);
    for (const u of p.units.values()) visit(`${pid}/unit ${u.id}`, u);
    for (const b of p.buildings.values()) visit(`${pid}/building ${b.id}`, b);
    for (const r of p.researches.values()) visit(`${pid}/research ${r.id}`, r);
  }
  for (const g of data.gods.values()) visit(`god ${g.id}`, g);
  for (const m of data.minors.values()) visit(`minor ${m.id}`, m);
  for (const pw of data.powers.values()) visit(`power ${pw.id}`, pw);
  for (const s of data.sources.values()) visit(`source ${s.id}`, s);
  return out;
}
