# Sources

Game: **Age of Mythology: Retold**, base game, patch **19.17020** (minor update, 2026-07-01). The last balance changes for the four base pantheons are in **19.16313** (2026-06-23).

Detailed per-pantheon notes, including every conflict and which source won:

- [atlanteans/SOURCES.md](atlanteans/SOURCES.md)
- [greeks/SOURCES.md](greeks/SOURCES.md)
- [egyptians/SOURCES.md](egyptians/SOURCES.md)
- [norse/SOURCES.md](norse/SOURCES.md)

## Priority (SPEC 4.2)

Since 2026-10-18 (owner decision) the game installation is the absolute source of truth.

1. The owner's installed game (build 19.17020): `Data.bar` (proto.xml, techtree.xml, major_gods.xml, minor_gods.xml, god powers), string tables (English, PortugueseBrazil) and UI images.
2. Measured in game by the project owner (`"source": "measured"`), for behaviour the files don't define.
3. aomr-analyzer.com (extracted game data).
4. Official pages and patch notes (ageofempires.com).
5. Community wikis (support only): Age of Empires Series Wiki (fandom), Liquipedia, Pro Game Guides.
6. aomstats.io (metadata only).

## Project-level decisions

| Topic                    | Decision                                                 | Why                                                                                                                       |
| ------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Atlantean build speed    | Citizen `buildRate` 1.5 over base build times            | Wiki says Citizens build 50% faster; matches the measured Krush Temple (~27 s) and Counter-Barracks near a Manor (~13 s). |
| Kronos Manor bonus       | ×1.25 per Manor in range, stacking additively            | manor.tactics (AutoRangedModify 1.25, range 20); official forum: intended.                                                |
| Free myth units (Kronos) | `ageUpFreeUnits` replaces the minor god's own free units | Kronos gets 2 instead of 1; measured in Krush.                                                                            |
| God `startExtras.units`  | Replaces the start count of that unit                    | Thor `{gatherer: 0, dwarf: 3}`, Gaia hero Citizens.                                                                       |
| Minor gods in `requires` | Any one of the listed minor gods is enough               | Norse giants are available to more than one minor god.                                                                    |
| Fish                     | Infinite                                                 | Retold fish do not run out.                                                                                               |
| Hunt amount              | Default 1200 (owner estimate)                            | Varies a lot per map.                                                                                                     |

| Gather techs | `op: "pct"` (added on the base rate) | Game files: relativity BasePercent. |
| Multiple builders | 2nd builder 60%, each further builder 30% | Game files: buildingefficiency 0.6, extrabuildingefficiency 0.3. |
| Favor cap | None | Owner (Greeks) and game files (all cultures). |
| Start | 4 Sentry Towers for every pantheon | Owner; random map scripts place 4 SentryTower per player. |



## Icons

Since 2026-10-18 every icon is taken from the installed game (`game/ui/UITextureCache4K.bar`, DDS → WebP) by `scripts/game-icons.py`; `public/icons/manifest.json` records the path of each one inside the game. Icons are game assets © Microsoft, used as fan content under the Game Content Usage Rules.
