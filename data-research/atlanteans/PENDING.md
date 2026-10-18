# Atlanteans — pending / not answered by the files

Updated 2026-10-18 after the game-files pass (build 19.17020).

## For the owner

- [ ] **Citizen train time: file 28 s vs measured ~30 s.** The file value is now used. With it the Krush golden test (`tests/engine/krush.test.ts`, "produces the auto-queued Citizens on time") fails: 9 auto-Citizens after 3:30 instead of 8, drifting −2 … −15 s vs the measured times. The 30 s cadence in the real match suggests something outside proto/techtree (queue/spawn delay?) — please re-measure one Citizen from click to spawn with an idle Town Center.
- [ ] **Counter Barracks: file 25 build points = 16.7 s with one Citizen vs measured 25 s.** Please re-measure (one Citizen, no Kronos Manor nearby).
- [ ] **Turma 9.5 s (file) vs 10 s (owner).**
- [ ] Kronos Temporal Scaffolding: whether several Manors in range stack (one modelled).
- [ ] `*-gaia` researches now carry the official name (same as the base tech), so a Gaia player sees two "Plow"/"Arado" entries in the palette; the engine does not stop researching both.

## Not expressible / not modelled

- Oracle favor: the formula (0.01 + m × (bonusLOS/100)²) is from the wiki; the files give its parameters only. Oranos (cap +4), Perception (LOS and LOS cap ×1.1) and Sons of the Sun are approximations at full LOS. LOS overlap is an engine rule.
- Time Shift with Temporal Chaos (duration ×0.5, 3 concurrent, tower/palace cost 25%): no modifier target for powers.
- Deconstruction duration (0.4 × build points of the target) and refund.
- Free Servant (Oceanus), Nereid (Heroic) and Man O' War (Mythic) at a Dock — only if a Dock exists.
- Horns of Consecration enables Fanatics in the Heroic Age (unit age stays mythic).
- Kronos 20% refund on lost siege/myth units; Oranos +4 LOS and revealers; Gaia Lush; Gaia Forest wood; Rheia's Gift refund of favor already spent (cap 2000); Frontline Heroics hero-unit cost ×0.9; Sky Passage build limit 2/3/4/5 per age (no `limit` set).
- Village Center: available in the Archaic Age only when no Town Center exists (shared build limit 1); kept as `classical`.

## Missing entities

- Bronze Wall, Iron Wall, Orichalcum Wall (wall upgrades after Stone Wall): not added, no icon in the manifest.
- New researches (towers, Stone Wall, Omniscience, Secrets of the Titans) borrow Greek/Egyptian icon ids; proper `techs/atlanteans-*` icons need manifest entries.

## Still from non-file sources

- Resource amounts in `sources.json` (shared, not Atlantean-specific; unchanged).
- Oracle `favorRate` 2.0 planning default (owner).
- Icons (see `icons.json`).
