# Egyptians — pending checklist

Checked against the game files of build 19.17020 on 2026-10-18. No value is `medium` or `low`. What is left are modelling gaps (the schema/engine cannot express a file value) and questions for the owner.

## Mechanics the schema cannot express (only in `meta.note`)

- [ ] **Pharaoh empower** (and Ra Priests / Ra Monument aura): x1.75 (x1.45) build, research and military-train rate; x1.2 (x1.12) Monument favor; x1.2 (x1.12) "DropsiteRate" (resources dropped at an empowered dropsite +20%). Needs an `empowered` condition or an empower rule.
- [ ] Isis: empowered Monuments make x2.0 favor instead of x1.2. Entered as `favorRate mul 1.667, condition: "custom"` (the BasePercent applies to the empower factor, so `mul` is intended).
- [ ] Set: Devotees, -10% unit cost in Barracks / Migdol Strongholds within 20 of a Monument. Entered as `cost mul 0.9, condition: "custom"`.
- [ ] Set: free Animals of Set on each age-up (Classical 1 Hyena + 2 Gazelles, Heroic 1 Crocodile + 2 Giraffes, Mythic 1 Rhinoceros + 2 Hippopotamuses, at a Temple). `ageUpFreeUnits` only covers minor-god myth units.
- [ ] Animals of Set are summoned by the Pharaoh (CommandAdd on Pharaoh / Pharaoh (New Kingdom)), so `trainedAt` is `[]`.
- [ ] Free Leviathan (Heroic) and War Turtle (Mythic) at a Dock on age-up (`HeroicAgeEgyptian` / `MythicAgeEgyptian` CreateUnit). Not tied to a god.
- [ ] Carry-capacity bonuses (Husbandry, Hand Axe, Salt Amphora...) and Husbandry's livestock fattening x1.25 are not modelled.
- [ ] Citadel god power: the TC becomes a Citadel Center (25 pop instead of 15).
- [ ] Valley of the Kings (double-train chance, +40% empowered train rate), New Kingdom (second Pharaoh), Funeral Rites (8 Gold per dead soldier/hero), Clairvoyance (free, faster Vision charges): notes only.
- [ ] God power cost ramp: each cast costs `repeatcost` more (noted per power); `cost` is the first cast.

## Not answered by the files

- [ ] Whether a Monument produces favor while still a foundation (the engine counts it only when not "building").
- [ ] Rain's map-wide reach: the power has `radius` 12 in the godpowers file; the note keeps "map-wide" from the earlier pass. Owner to confirm in game.
- [ ] Which builder counts as "first" for the multi-builder rule when rates differ (general, see game-files-findings.md).

## Modelling choices to confirm

- [ ] Hero names use the official strings with the "(Hero)" / "(Herói)" suffix (Priest, Pharaoh, Pharaoh (New Kingdom)). The other pantheons should do the same for their heroes so the UI is consistent.
- [ ] `buildTime` already includes the Laborer build penalty (buildpoints / 0.75); `laborer.worker.buildRate` = 1.
- [ ] Town Center and Village Center have no `limit` (limit 1 only in the Archaic Age).
- [ ] `wall` = one short Wooden Wall segment (6 Gold, 15 bp => 20 s).
- [ ] Researches offered in several buildings use one `at`; the others are in `meta.note`.
- [ ] Isis -10% research cost is scoped with `tags: ["research"]`; age-ups are excluded (`ignoreAgeUps` in the file).
- [ ] Wonder `trickle.favor` 60 comes from the generic Wonder proto, so the other pantheons' Wonders should get it too.

## Icons

- [ ] 123 icons come from MiguelMG24/aom-retold-build-order, which has no license file. Confirm they are acceptable, or replace them with Kries/wiki files.
- [ ] `pharaoh-new-kingdom` reuses the Pharaoh icon.
