# Greeks: pending / low-confidence items

## Open questions for the owner

- [ ] **Favor cap.** aomr-analyzer says Greeks are capped at 100 favor. The wiki says favor has had no cap since Retold. The schema has no cap field. Should one be added, and can you check this in-game?
- [ ] **Starting Sentry Towers.** The wiki says standard matches start with 4 Sentry Towers around the Town Center. They are not in `start.buildings`. Can you confirm in a 1v1 game?
- [ ] **Praying limit.** No limit on praying villagers is documented. `favor.table` stops at 30, so above that the simulator should extrapolate with the formula, or clamp.
- [ ] **Hero train time per age.** Greek heroes train 10% faster per age, which the schema cannot express. Values are taken at each hero's unlock age.

## Not expressible in the current schema (noted in `meta.note`, simulator must special-case)

- [ ] Vaults of Erebus (Hades): +1.75 gold/s (105/min) trickle with no workers.
- [ ] Plenty (Hephaestus power): Plenty Vault producing 3.5 food, wood and gold per second.
- [ ] Lure (Poseidon power):
  - Food drop site that attracts animals.
  - Spawns 3/4/6/10 Chickens (Archaic/Classical/Heroic/Mythic).
  - Total lured food is capped at 1200/1300/1500/1900.
  - There is no chicken unit id, so no `spawn` is given.
- [ ] Zeus: myth units cost 1 less pop. There is no pop modifier target.
- [ ] Carry-capacity bonuses (Husbandry, Hand Axe, Pickaxe, Bow Saw, Divine Blood, Salt Amphora...). There is no carry target.
- [ ] Village Center trains villagers 25% slower. There is no per-building trainTime modifier.
- [ ] Deimos' Sword of Dread (Ares) makes the Hypaspist available in Classical. The unit is kept at `age: "heroic"`.
- [ ] Hippocampus, Militia and Shade of Hades are free or spawned. They are listed with `trainedAt: []` and `cost: {}`.
- [ ] Argive Patronage (Hera): a free Myrmidon every 60 s per Fortress.
- [ ] Winged Messenger (Hermes): a free respawning Pegasus.

## Low / medium confidence values

- [ ] Forge of Olympus research-speed bonus: x0.6667 time is used. Wiki pages conflict between +50% speed, -25% time and +100% speed. Research time 5 s.
- [ ] Carcinos train time of 9 s (wiki only). It looks very short.
- [ ] Gather-tech stacking: the effects are assumed to stack multiplicatively. This matters for Plow/Irrigation/Flood Control, Purse Seine with Salt Amphora (+50% each), and the wood/gold lines.
- [ ] Forge of Olympus and Hades cost discounts are assumed not to touch favor costs.
- [ ] All build times, research times and myth-unit train times come from the wiki only, which is a single source. They are marked medium in `fieldMeta`.
- [ ] Archaic heroes (Jason, Ajax, Theseus): cost 100 food / 50 wood, 5 s. Overall confidence is medium (wiki and analyzer unit JSON, but the analyzer tags them "Classical").
- [ ] Wooden Gate build time 0 (low): it is converted from a long wall segment. The wall cost and time used are those of the long segment (15 gold / 15 s).
- [ ] Omniscience cost is variable (100 gold x enemy population), so `cost` is left as `{}`.
- [ ] House limit 16 (wiki).
- [ ] Fortress limit 15 and Sentry Tower limit 30 (wiki).
- [ ] Research `at` holds a single building. Several myth techs can also be researched elsewhere (noted in each meta):
  - Golden Apples: also at the Temple.
  - Aegis Shield, Sarissa, Phobos', Deimos', Enyo's, Sun Ray, Shafts of Plague: also at the Armory.
  - Chthonic Rites: also at the Dock.
  - Olympian Parentage: also at the Fortress.
  - Phobos' Spear: also at the Stable.

## Names (pt-BR)

- [ ] No official Brazilian Portuguese localization was found for AoM Retold. All pt-BR names are my translations and should be checked against the game, for example:
  - Hipaspista, Mirmidão, Toxota, Pródromo
  - Depósito (Storehouse), Celeiro (Granary), Campo de Tiro com Arco
  - Tech names such as "Rede de Cerco" (Purse Seine)
  - God powers: Raio, Isca, Fartura...

## Icons (all 198 ids have a URL; visual checks suggested)

- [ ] Kries files whose subject is ambiguous:
  - `sentinel_icon.png` (the power, or the Sentinel unit?)
  - `lure_icon.png` (the power, or the Lure building?)
  - `bolt_icon.png`
  - `curse.png`
  - `carcinos.png`
  - `house_icon.png`, `temple_icon.png`, `dock_icon.png`, `market_icon.png`, `armory_icon.png`: possibly a non-Greek architecture variant.
- [ ] `gods/zeus-portrait` uses Kries `zeus_breakoutportrait.png`, because there is no `zeus_portrait.png`.
- [ ] The 115 wiki URLs were verified in a browser. curl from this environment gets 403 from wikia's CDN, so hotlinking may need a referer-free fetch or a local copy.
