# Egyptians — sources

Checked: 2026-10-17. Game build: **19.17020** (AoMRT_s.exe FileVersion 100.19.17020.0, Steam build id 23996698).
Official notes for this build: "Age of Mythology: Retold Minor Update 19.17020" (ageofempires.com/news/age-of-mythology-retold-minor-update-19-17020/, July 2026). It contains bug and stability fixes only, with no Egyptian economy changes.

## Primary source: extracted game data (local install, read-only)

The owner's own Steam install (`C:\Program Files (x86)\Steam\steamapps\common\Age of Mythology Retold\game\data\Data.bar`) was unpacked read-only into a scratch folder. BAR v6 has alz4/LZ4 entries and XMB files were converted to XML. Files used:

- `gameplay/major_gods.xml`: starting resources and units per major god.
- `gameplay/proto.xml`: unit and building cost, train/build points, pop, gather/build rates, popcap, limits, monument favor (AutoGather), train lists.
- `gameplay/techtree.xml`: age techs (`ArchaicAgeEgyptian`, `ArchaicAgeRa/Isis/Set`, `ClassicalAge<Minor>`…), tech cost/time/prereqs/effects, Egyptian cost overrides, god power cooldowns.
- `gameplay/god_powers/egyptian.godpowers`: favor cost, repeat cost, duration and build-up of each god power.
- `gameplay/tactics/pharaoh.tactics`, `priest.tactics`, `monument.tactics`: empower multipliers (Pharaoh x1.75 / x1.2, Ra Priest and Monument aura x1.45 / x1.12, Set Devotees x0.9).
- `strings/English` and `strings/PortugueseBrazil/string_table.txt`: official en and pt-BR names. `strings/string_replacement_values.xml`: god bonus numbers.

This counts as the brief's priority-2 source ("extracted game data"), read straight from the files.

Conversions:

- Gather rates are proto `<Gather>` rate (per second) x 60, so they are per minute.
- `buildTime` is buildpoints / Laborer build rate 0.75. The Obelisk is built by Priests at rate 1.0.
- Favor is AutoGather x 60.

## Cross-check source: Age of Empires Series Wiki (Fandom), via the MediaWiki API

For each unit, research, power, age-up and Egyptian-specific building, the infobox was compared automatically with the game data. 161 of 169 entities agree, so they are marked `high`. Key pages: Egyptians (Age of Mythology), Laborer, Monument (Age of Mythology), Migdol Stronghold, Barracks/Siege Works (Age of Mythology), Classical Age/Heroic Age/Mythic Age, Ra, Isis, Set, and each god-power page. The wiki pages cite updates up to 19.16313, so they are current.

## Not used

- **aomr-analyzer.com** (brief priority 2): its footer says "Reproduction, duplication, scraping, re-hosting and AI training on this content are strictly prohibited without written consent". I loaded the homepage and the Egyptian page once, saw this notice, deleted the copies and did not use the site. Local game files give the same kind of data. The owner should decide whether that site may be used.
- Liquipedia returned 403 and was not used.

## Conflicts and resolution

| Item                                                                  | Game data (used)       | Other source                                   | Note                                                                                                          |
| --------------------------------------------------------------------- | ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Roc population                                                        | 3 (proto)              | Wiki: 2 "since Retold"                         | Game file wins. Possibly a later wiki or game change.                                                         |
| Flood of the Nile cost                                                | 150 Gold, 8 Favor      | Wiki shows 135 / 7.2                           | Wiki shows the Isis-discounted price (x0.9), so the two agree.                                                |
| Wall/tower techs (Stone/Fortified/Citadel Wall, Guard/Ballista Tower) | techtree values        | Wiki infobox is the building's, not the tech's | Not a real conflict. These are `medium` because no second source was found.                                   |
| Monument favor                                                        | 4.5/6/7.5/9/12 per min | Owner values and wiki                          | All agree.                                                                                                    |
| Hathor                                                                | absent                 | Owner's list had Hathor (heroic)               | In Retold, **Sobek replaces Hathor** (minor_gods.xml and wiki). Sobek gives Petsuchos + Roc and Locust Swarm. |

## Icons (`icons.json`, 206 entries, all checked with HEAD: HTTP 200 and image/*)

- Kries-Dev/BuildOrders (preferred), 74 icons.
- MiguelMG24/aom-retold-build-order (`assets/egipcios/...`, file names identical to the game's), 123 icons. The repo has no license file.
- 12sg3/aom_tech_tree (`docs/img/...webp`, MIT code), 9 icons: 8 god powers and Advanced Fortifications. The id mapping comes from its `docs/data.json`.
- Fandom static images are blocked from this environment (Cloudflare 403), so no wiki image URLs are used.
