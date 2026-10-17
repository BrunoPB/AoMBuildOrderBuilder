# Egyptians — pending / low-confidence checklist

No value is `low`. Everything comes from the game files of build 19.17020. Items marked `medium` have only one source. The rest are modelling gaps or questions for the owner.

## Medium-confidence values (game data only, or wiki disagrees)

- [ ] `roc` pop = 3 (proto). The wiki says 2 "since Retold". Check in game.
- [ ] `sentry-tower` cost 200 Gold, no Wood (Egyptian override; the wiki's generic page shows 150 Wood + 100 Gold).
- [ ] `wall` modelled as one short Wooden Wall segment (6 Gold, 15 bp, so 20 s). The connector costs 3, the medium segment 9, and the long segment and gate 15.
- [ ] Researches `stone-wall`, `fortified-wall`, `citadel-wall`, `guard-tower`, `ballista-tower`: cost and time are from techtree only.

## Mechanics the schema cannot express (only in `meta.note`)

- [ ] **Pharaoh empower** (and Ra Priests / Ra Monument aura): x1.75 (Priest x1.45) build, research and military-train rate; x1.2 (x1.12) Monument favor; x1.2 (x1.12) "DropsiteRate", meaning resources dropped at an empowered Granary/camp/TC yield 20% more. This needs an `empowered` condition or an empower rule in the pantheon.
- [ ] Isis: empowered Monuments make x2.0 favor instead of x1.2. This is entered as `favorRate x1.667, condition: "custom"`.
- [ ] Set: Devotees, -10% unit cost near a Monument. Entered as `cost x0.9, condition: "custom"`.
- [ ] Set: free Animals of Set on each age-up (Classical 1 Hyena + 2 Gazelles, Heroic 1 Crocodile + 2 Giraffes, Mythic 1 Rhino + 2 Hippos). `ageUpFreeUnits` only covers minor-god myth units.
- [ ] Free Leviathan (Heroic) and War Turtle (Mythic) at a Dock on age-up. These are generic, not tied to a god.
- [ ] Flood of the Nile (Isis): +1 Food/s trickle (60/min). There is no trickle modifier target.
- [ ] Carry-capacity bonuses (Husbandry, Hand Axe, etc.) are not modelled.
- [ ] Rain/Prosperity: duration-limited gather multipliers are in `effect.modifiers`. Check how the simulator applies `duration`.
- [ ] Citadel god power: the TC becomes a Citadel Center with 25 pop instead of 15 (+10 pop), stronger, and trains/researches faster.
- [ ] Valley of the Kings, New Kingdom (second Pharaoh), Funeral Rites (8 Gold per dead soldier): notes only.

## Modelling choices to confirm

- [ ] **BasePercent stacking**: the game adds tech bonuses to the base rate (Plow + Irrigation + Flood Control = +30%, Purse Seine + Salt Amphora = x2.0). The data uses `op: "mul"` (x1.1 each), so the simulator would compound (x1.331, x2.25). Should these be `add` instead?
- [ ] `buildTime` already includes the Laborer build penalty (buildpoints / 0.75). `laborer.worker.buildRate` = 1.
- [ ] Isis +5 pop is a `popCap add 5` modifier on `town-center`. `start.popCap` stays 15. Confirm the simulator applies it to the starting TC (expected 20).
- [ ] Set `startExtras` = `{ units: { "baboon-of-set": 1 } }`. This is assumed additive to the pantheon start.
- [ ] Start state: the Pharaoh is counted as a starting unit (spawned at t≈0 by tech `PharaohFirstSpawn`). Start Favor = 0 (none in `major_gods.xml`).
- [ ] Pharaoh: 0 pop, `trainedAt: []`, and it respawns for free if killed. Animals of Set have `trainedAt: ["pharaoh", "pharaoh-new-kingdom"]`, so a unit is the producer.
- [ ] Heroic age-up requires an **Armory OR a Market** (`OrPrereqs`). Classical needs a Temple and Mythic a Migdol Stronghold.
- [ ] The Town Center has no `limit`. It is limited to 1 in the Archaic Age and must sit on a Settlement.
- [ ] `village-center` (Retold, off-Settlement TC, no pop) is included. Check whether it matters for 1v1 build orders.
- [ ] Researches offered in several buildings use one `at` (primary). The others are listed in `meta.note`.
- [ ] `effects` also hold cost, train-time, build-time and pop effects (Shaduf, Sun-dried Mud-brick, Spirit of Maat, Levy/Conscript, Tusks of Apedemak, Fortified TC), not only gather rates.
- [ ] Isis -10% tech cost is scoped with `tags: ["research"]`. Every research carries the tag `research` and every building the tag `building`.
- [ ] God power cost = first-cast Favor cost. Retold raises the cost by `repeatcost` per cast (noted in meta). Uses are unlimited, limited only by the recharge (`cooldown`).

## Icons

- [ ] All 206 icon ids resolved and checked (HTTP 200 + image). No placeholders needed.
- [ ] 123 icons come from MiguelMG24/aom-retold-build-order, which has no license file. Confirm they are acceptable, or replace them with Kries/wiki files.
- [ ] `pharaoh-new-kingdom` reuses the Pharaoh icon.

## Questions for the owner


- [ ] Should BasePercent bonuses be `add` (game-exact) or `mul` (current)?
