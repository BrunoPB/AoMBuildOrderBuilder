# Pending

Values with `confidence: "low"`, missing data and rules the simulator does not model yet. `npm run check-data` lists the low-confidence values from the data itself.

Per-pantheon checklists: [atlanteans](atlanteans/PENDING.md) · [greeks](greeks/PENDING.md) · [egyptians](egyptians/PENDING.md) · [norse](norse/PENDING.md).

## Open questions for the owner (SPEC 18 + research)

- [ ] Population: reserved when training starts or ends? (default: start; configurable per build)
- [ ] Oracle hero promotion cost: research says 30 food + 45 gold + 1 favor (7 s). With that cost the Krush simulation is ~20 s late on Citizens and Turmas, so the Krush preset has no promotions. Confirm the cost in game.
- [ ] Deconstruction: first cast free, then 10 favor (+10 per reuse), 180 s cooldown. Time Shift: no favor cost or cooldown (50% resource cost for towers/Palace/Mirror Tower).
- [ ] Average real Oracle favor rate in a match (default 2.0/min per Oracle).
- [ ] Typical hunt near the base (data default 1400; Krush preset uses 2000).
- [ ] Final list of standard builds (presets).
- [ ] Greek favor cap (100 per aomr-analyzer vs none per wiki).
- [ ] Do 1v1 matches start with Sentry Towers around the Town Center?
- [ ] Gather techs: multiplicative (`mul`) or additive (`add`) on the base rate (game adds: +10% +10% +10% = +30%).

## Not modelled yet (needs schema or engine work)

- [ ] Multiple builders: build speed is the sum of the builders' rates (linear); real diminishing returns unknown.
- [ ] Kronos Manor bonus stacking per Manor in range.
- [ ] Egyptian Pharaoh/Priest empower (×1.75 build/research/train, ×1.2 monument favor), Isis/Set monument auras.
- [ ] Resource trickles: Vaults of Erebus, Plenty, Flood of the Nile, Hersir/Godi favor trickle.
- [ ] Carry capacity and dropsite distance (covered by `efficiency`).
- [ ] Zeus myth units −1 pop; per-age hero train time for Greeks.
- [ ] Thor: Dwarven Armory replaces the Armory; free Dwarf per Dwarven Armory tech.
- [ ] Norse infantry building (only gatherers/dwarves build in the simulator).
- [ ] Set's Animals of Set (summoned by the Pharaoh) and free Leviathan/War Turtle.
- [ ] Favor caps.
- [ ] Hunt decay (12 food/min once killed).
- [ ] 47 icons are placeholders (see `npm run check-data`).
