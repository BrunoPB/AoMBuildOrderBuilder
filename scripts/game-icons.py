#!/usr/bin/env python3
"""
Copies the icons used by the site from an installed Age of Mythology: Retold.

Reads the game's archives (never writes inside the game folder), finds the icon of every entity
listed in public/icons/manifest.json, and writes public/icons/<id>-64.webp and <id>-128.webp plus
the manifest entry (origin = the path inside the game). Entries it cannot find are left as they are.

    python scripts/game-icons.py "C:/Program Files (x86)/Steam/steamapps/common/Age of Mythology Retold"
    python scripts/game-icons.py <game> --report      # print the mapping, write nothing
    python scripts/game-icons.py <game> --only units/greeks-hoplite gods/zeus
    python scripts/game-icons.py <game> --out some/folder   # write there instead of public/icons

Needs Python 3.10+ and Pillow (`python -m pip install --user Pillow`).

How the game is laid out (build 19.17020):
  game/data/Data.bar               proto.xml, techtree.xml, major_gods.xml, minor_gods.xml,
                                   god_powers/*.godpowers (XMB) and strings/English/string_table.txt.
                                   Each unit/tech/god/power names its icon (some per culture), e.g.
                                   resources/greek/player_color/units/hoplite_icon.png
  game/ui/UITextureCache4K.bar     those icons as DDS (BC1/BC3), 256 px for most icons
  game/ui/UITextureCache.bar       the same at half size, plus some files the 4K cache lacks
Matching: the data's English name = the game's English display name (parentheses such as
"(Hero)" or "(Gaia)" ignored when needed), preferring the icon of the pantheon's culture; gods and
minor gods by id; MANUAL below for concepts (ages, resources, gather sources) and renamed entities.
Icons under player_color/ keep the player-colour mask in the alpha channel (alpha 0 = area the game
tints); the script drops that channel, so those areas show their neutral grey shading.
"""
from __future__ import annotations

import argparse
import io
import json
import re
import struct
import sys
import unicodedata
import zlib
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required: python -m pip install --user Pillow")

BUILD = "19.17020"
LICENSE = "Game asset © Microsoft; fan use under the Game Content Usage Rules"
SIZES = (64, 128)
CULTURE = {"greeks": "greek", "egyptians": "egyptian", "norse": "norse", "atlanteans": "atlantean"}
SPECIAL = re.compile(r"SPC|AOTG|Gauntlet|HIDDEN|KOTH|Tutorial|Story", re.I)
OTHER_CULTURES = ("chinese", "japanese", "aztec", "greek_demeter", "norse_freyr", "spc", "aotg")

# Entities whose icon is not reachable by name (concepts, renamed or merged entities).
# id -> texture path inside the UI texture caches (without extension).
MANUAL: dict[str, str] = {
    "ages/archaic": r"resources\shared\static_color\technologies\archaic_age_icon",
    "ages/classical": r"resources\shared\static_color\technologies\classical_age_icon",
    "ages/heroic": r"resources\shared\static_color\technologies\heroic_age_icon",
    "ages/mythic": r"resources\shared\static_color\technologies\mythic_age_icon",
    "ui/pantheon-greeks": r"resources\greek\static_color\major_gods\UI_god_pantheon_Greek",
    "ui/pantheon-egyptians": r"resources\egyptian\static_color\major_gods\UI_god_pantheon_egyptian",
    "ui/pantheon-norse": r"resources\norse\static_color\major_gods\UI_god_pantheon_Norse",
    "ui/pantheon-atlanteans": r"resources\atlantean\static_color\major_gods\UI_god_pantheon_Atlantean",
    "resources/food": r"resources\in_game\res_food_large",
    "resources/wood": r"resources\in_game\res_wood_large",
    "resources/gold": r"resources\in_game\res_gold_large",
    "resources/favor": r"resources\in_game\res_favor_large",
    # Gather sources: the icon of the typical proto unit (Deer, Goat, BerryBush, Farm, Fish, TreeOak, GoldMine).
    "resources/source-hunt": r"resources\nature\animals\land\deer_icon",
    "resources/source-herd": r"resources\nature\animals\land\goat_icon",
    "resources/source-berries": r"resources\nature\berry_bush_icon",
    "resources/source-farm": r"resources\shared\static_color\buildings\farm_icon",
    "resources/source-fish": r"resources\nature\animals\naval\fish_icon",
    "resources/source-wood": r"resources\nature\trees\tree_oak_icon",
    "resources/source-gold": r"resources\nature\mines\gold_mine_icon",
    # Proto CaravanGreek is named "Donkey Caravan" in the game.
    "units/greeks-caravan": r"resources\greek\player_color\units\caravan_greek_icon",
    # Power HesperidesTree is named "Hesperides Tree" in the game.
    "powers/hesperides": r"resources\atlantean\static_color\god_powers\hesperides_icon",
    # Time Shift is the Atlantean "Unbuild" command (proto_unit_commands.xml), not a god power.
    "powers/time-shift": r"resources\atlantean\static_color\abilities\time_shift_ability_icon",
}


# ---------------------------------------------------------------- .bar archives


def _lz4_block(src: bytes) -> bytes:
    dst = bytearray()
    i, n = 0, len(src)
    while i < n:
        tok = src[i]
        i += 1
        lit = tok >> 4
        if lit == 15:
            while True:
                b = src[i]
                i += 1
                lit += b
                if b != 255:
                    break
        dst += src[i : i + lit]
        i += lit
        if i >= n:
            break
        off = src[i] | (src[i + 1] << 8)
        i += 2
        ml = tok & 15
        if ml == 15:
            while True:
                b = src[i]
                i += 1
                ml += b
                if b != 255:
                    break
        ml += 4
        start = len(dst) - off
        if off >= ml:
            dst += dst[start : start + ml]
        else:
            for k in range(ml):
                dst.append(dst[start + k])
    return bytes(dst)


def _decompress(data: bytes) -> bytes:
    if data[:4] == b"alz4":
        _, csize, _ = struct.unpack_from("<III", data, 4)
        return _decompress(_lz4_block(data[16 : 16 + csize]))
    if data[:4] == b"l33t":
        return _decompress(zlib.decompress(data[8:]))
    if data[:4] == b"l66t":
        return _decompress(zlib.decompress(data[12:]))
    return data


class Bar:
    """Read-only view of a .bar archive: {lower-case path: (offset, stored size)}."""

    def __init__(self, path: Path):
        self.path = path
        self.files: dict[str, tuple[str, int, int]] = {}
        with open(path, "rb") as f:
            f.seek(0x120)
            (table,) = struct.unpack("<q", f.read(8))
            f.seek(table)
            (root_len,) = struct.unpack("<I", f.read(4))
            f.read(root_len * 2)
            (count,) = struct.unpack("<I", f.read(4))
            for _ in range(count):
                off, _s1, stored, _s3, name_len = struct.unpack("<qIIII", f.read(24))
                name = f.read(name_len * 2).decode("utf-16le")
                f.read(4)
                self.files[name.lower()] = (name, off, stored)

    def read(self, name: str) -> bytes:
        real, off, stored = self.files[name.lower()]
        with open(self.path, "rb") as f:
            f.seek(off)
            return _decompress(f.read(stored))


def xmb_to_tree(b: bytes) -> ET.Element:
    p = 0

    def u32() -> int:
        nonlocal p
        v = struct.unpack_from("<I", b, p)[0]
        p += 4
        return v

    def string() -> str:
        nonlocal p
        n = u32()
        v = b[p : p + n * 2].decode("utf-16le", "replace")
        p += n * 2
        return v

    assert b[:2] == b"X1", "not an XMB file"
    p = 2
    u32()
    assert b[p : p + 2] == b"XR"
    p += 2
    u32()
    version = u32()
    elements = [string() for _ in range(u32())]
    attributes = [string() for _ in range(u32())]

    def node() -> ET.Element:
        nonlocal p
        assert b[p : p + 2] == b"XN"
        p += 2
        u32()
        text = string()
        el = ET.Element(elements[u32()])
        if version >= 8:
            u32()
        for _ in range(u32()):
            key = attributes[u32()]
            el.set(key, string())
        el.text = text
        for _ in range(u32()):
            el.append(node())
        return el

    return node()


# ---------------------------------------------------------------- game index


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def tex_key(path: str) -> str:
    """'resources\\greek\\x\\y_icon.png' or 'greek/x/y_icon.png' -> 'resources\\greek\\x\\y_icon'."""
    p = path.strip().replace("/", "\\").lstrip("\\")
    p = re.sub(r"\.(png|dds|tga|ddt)$", "", p, flags=re.I)
    if not p.lower().startswith("resources\\"):
        p = "resources\\" + p
    return p.lower()


class Game:
    def __init__(self, root: Path):
        game = root / "game" if (root / "game").is_dir() else root
        self.data = Bar(game / "data" / "Data.bar")
        self.caches = [Bar(game / "ui" / "UITextureCache4K.bar"), Bar(game / "ui" / "UITextureCache.bar")]
        self.game = game
        self.textures: dict[str, list[tuple[Bar, str]]] = {}
        for bar in self.caches:
            for low, (name, _o, _s) in bar.files.items():
                if low.endswith(".dds"):
                    self.textures.setdefault(low[:-4], []).append((bar, name))
        self.strings = self._strings()
        self.protos = self._named("gameplay\\proto.xml.XMB", "unit")
        self.techs = self._named("gameplay\\techtree.xml.XMB", "tech")
        self.powers: list[dict] = []
        for low, (name, _o, _s) in self.data.files.items():
            if low.startswith("gameplay\\god_powers\\") and low.endswith(".godpowers.xmb"):
                self.powers += self._named(name, "power")
        self.majors: dict[str, dict] = {}
        for civ in xmb_to_tree(self.data.read("gameplay\\major_gods.xml.XMB")).iter("civ"):
            name = (civ.findtext("name") or "").strip()
            self.majors[norm(name)] = {
                "icon": civ.findtext("icon"),
                "portrait": civ.findtext("portrait"),
            }
        self.minors: dict[str, dict] = {}
        for el in xmb_to_tree(self.data.read("gameplay\\minor_gods.xml.XMB")):
            god = re.sub(r"^(classical|heroic|mythic)age", "", el.tag)
            self.minors[god] = {"icon": el.get("portraiticonfilename"), "portrait": el.get("portraitfilename")}

    def _strings(self) -> dict[str, str]:
        text = self.data.read("strings\\English\\string_table.txt").decode("utf-8", "replace")
        return dict(re.findall(r'ID\s*=\s*"([^"]+)"\s*;\s*Str\s*=\s*"((?:[^"\\]|\\.)*)"', text))

    def _named(self, file: str, tag: str) -> list[dict]:
        """One record per <icon> of each object; culture-specific icons carry their culture."""
        out = []
        for el in xmb_to_tree(self.data.read(file)).iter(tag):
            en = self.strings.get((el.findtext("displaynameid") or "").strip(), "")
            for icon in el.findall("icon"):
                if icon.text and icon.text.strip():
                    out.append(
                        {"name": el.get("name", ""), "en": en, "icon": icon.text.strip(), "culture": icon.get("culture")}
                    )
        return out

    def texture(self, key: str) -> tuple[Bar, str] | None:
        """Largest available copy of a texture."""
        found = self.textures.get(tex_key(key))
        if not found:
            return None
        return max(found, key=lambda t: t[0].files[t[1].lower()][2])

    def origin(self, tex: tuple[Bar, str]) -> str:
        bar, name = tex
        rel = bar.path.relative_to(self.game.parent).as_posix()
        return f"Game files {BUILD} ({rel}/{name.replace(chr(92), '/')})"


# ---------------------------------------------------------------- project entities


def load_entities(project: Path) -> dict[str, list[dict]]:
    """icon id -> entities that use it ({kind, id, name, pantheon})."""
    data = project / "src" / "data"
    read = lambda p: json.loads(p.read_text(encoding="utf-8"))
    out: dict[str, list[dict]] = {}

    def add(kind: str, x: dict, icon: str | None = None, pantheon: str | None = None):
        icon = icon or x.get("icon")
        if icon:
            name = x.get("name", {})
            out.setdefault(icon, []).append(
                {"kind": kind, "id": x["id"], "name": name.get("en", "") if isinstance(name, dict) else name,
                 "pantheon": pantheon or x.get("pantheon")}
            )

    common = read(data / "common.json")
    for a in common.get("ages", []):
        add("age", a)
    for p in common.get("pantheons", []):
        add("pantheon", p)
    for r in read(data / "resources.json"):
        add("resource", r)
    for s in read(data / "sources.json"):
        add("source", s)
    for f in sorted((data / "pantheons").glob("*.json")):
        p = read(f)
        for kind, key in (("unit", "units"), ("building", "buildings"), ("tech", "researches")):
            for x in p.get(key, []):
                add(kind, x, pantheon=p["id"])
    for folder, kind in (("gods", "god"), ("minors", "minor")):
        for f in sorted((data / folder).glob("*.json")):
            g = read(f)
            add(kind, g)
            if g.get("portrait"):
                add(kind + "-portrait", g, icon=g["portrait"])
    for pw in read(data / "powers.json"):
        add("power", pw)
    return out


# ---------------------------------------------------------------- matching


def culture_score(rec: dict, culture: str | None) -> int:
    if rec.get("culture"):
        return 4 if rec["culture"].lower() == culture else 0
    k = tex_key(rec["icon"])
    parts = k.split("\\")
    folder = parts[1] if len(parts) > 1 else ""
    if culture and folder == culture:
        return 3
    if folder in ("shared", "nature"):
        return 2
    if folder in OTHER_CULTURES or folder in CULTURE.values():
        return 0
    return 1


def pick(game: Game, candidates: list[dict], culture: str | None) -> tuple[str | None, str]:
    """Best icon among same-name game objects. Returns (icon, note)."""
    cands = [c for c in candidates if game.texture(c["icon"])]
    # Campaign / Arena of the Gods / hidden variants only when nothing else has that name.
    regular = [c for c in cands if not SPECIAL.search(c["name"])]
    cands = regular or cands
    if not cands:
        return None, "named object has no texture" if candidates else "no game object with that name"
    best = max(culture_score(c, culture) for c in cands)
    if best == 0:
        return None, "only other cultures: " + ", ".join(sorted({c["name"] for c in cands})[:4])
    top = [c for c in cands if culture_score(c, culture) == best]
    icons: dict[str, list[str]] = {}
    for c in top:
        icons.setdefault(tex_key(c["icon"]), []).append(c["name"])
    if len(icons) == 1:
        k, names = next(iter(icons.items()))
        return k, ",".join(names[:3])
    # Several icons: prefer the one used by most objects, then the shortest proto name.
    k = max(icons, key=lambda i: (len(icons[i]), -min(len(n) for n in icons[i])))
    return k, "AMBIGUOUS " + " | ".join(f"{i.split(chr(92))[-1]}<-{','.join(n[:2])}" for i, n in icons.items())


def slug_lookup(game: Game, slug: str, culture: str | None, folders: tuple[str, ...]) -> str | None:
    stem = slug.replace("-", "_") + "_icon"
    for c in ([culture] if culture else []) + ["shared"]:
        for folder in folders:
            for colour in ("player_color", "static_color"):
                k = f"resources\\{c}\\{colour}\\{folder}\\{stem}"
                if k in game.textures:
                    return k
    return None


def same_name(records: list[dict], name: str) -> list[dict]:
    """Objects whose English name is `name`; else compare without parentheses ("Achilles (Hero)", "Plow (Gaia)")."""
    exact = [r for r in records if norm(r["en"]) == norm(name)]
    if exact:
        return exact
    bare = lambda s: norm(re.sub(r"\([^)]*\)", " ", s))
    return [r for r in records if r["en"] and bare(r["en"]) == bare(name)]


def resolve(game: Game, icon_id: str, users: list[dict], overrides: dict[str, str]) -> tuple[str | None, str]:
    if icon_id in overrides:
        k = tex_key(overrides[icon_id])
        return (k, "manual") if k in game.textures else (None, f"manual path missing: {k}")
    if not users:
        return None, "not used by the data"
    u = users[0]
    kind, culture = u["kind"], CULTURE.get(u.get("pantheon") or "")
    name = norm(u["name"])
    if kind in ("god", "god-portrait"):
        g = game.majors.get(norm(u["id"])) or game.majors.get(name)
        field = "portrait" if kind.endswith("portrait") else "icon"
        return (tex_key(g[field]), "major_gods.xml") if g and g.get(field) else (None, "no major god")
    if kind in ("minor", "minor-portrait"):
        g = game.minors.get(u["id"].replace("-", ""))
        field = "portrait" if kind.endswith("portrait") else "icon"
        return (tex_key(g[field]), "minor_gods.xml") if g and g.get(field) else (None, "no minor god")
    if kind == "power":
        cands = same_name(game.powers, u["name"])
        k, note = pick(game, cands, culture)
        return k, "godpowers: " + note
    if kind in ("unit", "building"):
        cands = same_name(game.protos, u["name"])
        k, note = pick(game, cands, culture)
        if not k:
            folder = "units" if kind == "unit" else "buildings"
            s = slug_lookup(game, u["id"], culture, (folder,))
            if s:
                return s, f"by id ({note})"
        return k, "proto.xml: " + note
    if kind == "tech":
        cands = same_name(game.techs, u["name"])
        k, note = pick(game, cands, culture)
        if not k:
            s = slug_lookup(game, u["id"], culture, ("technologies",))
            if s:
                return s, f"by id ({note})"
        return k, "techtree.xml: " + note
    return None, f"no rule for {kind}"


# ---------------------------------------------------------------- images


def load_image(tex: tuple[Bar, str]) -> Image.Image:
    """Decodes a DDS (BC1/BC3/BC7 via Pillow) to RGBA."""
    bar, name = tex
    img = Image.open(io.BytesIO(bar.read(name)))
    img.load()
    img = img.convert("RGBA")
    if "\\player_color\\" in name.lower():
        # Alpha is the player-colour mask (0 = area the game tints), not transparency:
        # drop it so those areas show their neutral grey shading.
        img = img.convert("RGB").convert("RGBA")
    return img


def write_webp(img: Image.Image, size: int, out: Path) -> None:
    """Fit inside size x size (contain), centred on a transparent square."""
    scale = size / max(img.size)
    w, h = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    im = img.resize((w, h), Image.LANCZOS, reducing_gap=3.0)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(im, ((size - w) // 2, (size - h) // 2))
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, "WEBP", quality=88, method=6)


# ---------------------------------------------------------------- main


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("game", type=Path, help="Age of Mythology Retold install folder")
    ap.add_argument("--project", type=Path, default=Path(__file__).resolve().parent.parent)
    ap.add_argument("--report", action="store_true", help="print the mapping and write nothing")
    ap.add_argument("--only", nargs="*", help="icon ids to process")
    ap.add_argument("--out", type=Path, help="write the WebP files and manifest here instead of public/icons")
    args = ap.parse_args()

    game_root = args.game.resolve()
    project = args.project.resolve()
    icons_dir = project / "public" / "icons"
    out_dir = (args.out or icons_dir).resolve()
    if out_dir == game_root or game_root in out_dir.parents:
        sys.exit("refusing to write inside the game folder")

    game = Game(game_root)
    entities = load_entities(project)
    manifest = json.loads((icons_dir / "manifest.json").read_text(encoding="utf-8"))

    # Icons the data uses that the manifest does not list yet get a new entry.
    listed = {e["id"] for e in manifest["icons"]}
    for icon_id in sorted(set(entities) - listed):
        manifest["icons"].append({"id": icon_id, "file": "", "origin": "none", "license": "n/a", "placeholder": True})
    manifest["icons"].sort(key=lambda e: e["id"])

    overrides = dict(MANUAL)
    found, missing = 0, []
    for entry in manifest["icons"]:
        icon_id = entry["id"]
        if args.only and icon_id not in args.only:
            continue
        key, note = resolve(game, icon_id, entities.get(icon_id, []), overrides)
        tex = game.texture(key) if key else None
        if not tex:
            missing.append((icon_id, note, entry.get("placeholder", False)))
            if args.report:
                print(f"MISS {icon_id:55} {note}")
            continue
        found += 1
        origin = game.origin(tex)
        if args.report:
            print(f"OK   {icon_id:55} {tex[1]}  [{note}]")
            continue
        img = load_image(tex)
        for size in SIZES:
            write_webp(img, size, out_dir / f"{icon_id}-{size}.webp")
        entry.clear()
        entry.update(
            {
                "id": icon_id,
                "file": f"{icon_id}-64.webp",
                "file128": f"{icon_id}-128.webp",
                "origin": origin,
                "license": LICENSE,
            }
        )

    if not args.report:
        manifest["generatedAt"] = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
        out_dir.mkdir(parents=True, exist_ok=True)
        text = json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
        (out_dir / "manifest.json").write_text(text, encoding="utf-8", newline="\n")
    print(f"from the game: {found} - not found: {len(missing)}")
    for icon_id, note, placeholder in missing:
        print(f"  {icon_id}{' (placeholder)' if placeholder else ''}: {note}")


if __name__ == "__main__":
    main()
