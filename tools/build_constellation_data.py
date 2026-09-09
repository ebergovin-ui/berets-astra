"""Build the compact browser dataset used by the trainer.

Every schematic path is traced from the green stick figure on the linked
Wikipedia/Wikimedia constellation map. HIP positions keep those traced stars
in their real relative sky geometry and attach the alpha marker to the same
vertex used by the figure.
"""

from __future__ import annotations

import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / ".source-data"

TARGETS = [
    ("Cyg", "Лебедь", "Денеб"),
    ("CrB", "Северная Корона", "Альфекка"),
    ("Ori", "Орион", "Бетельгейзе"),
    ("Gem", "Близнецы", "Кастор"),
    ("Leo", "Лев", "Регул"),
    ("And", "Андромеда", "Альферац"),
    ("Lyr", "Лира", "Вега"),
    ("Boo", "Волопас", "Арктур"),
    ("Sco", "Скорпион", "Антарес"),
    ("Per", "Персей", "Мирфак"),
    ("Peg", "Пегас", "Маркаб"),
    ("Cep", "Цефей", "Альдерамин"),
    ("UMa", "Большая Медведица", "Дубхе"),
    ("UMi", "Малая Медведица", "Полярная"),
    ("Aur", "Возничий", "Капелла"),
    ("Aql", "Орёл", "Альтаир"),
    ("Vir", "Дева", "Спика"),
    ("Her", "Геркулес", "Рас Альгети"),
    ("Dra", "Дракон", "Тубан"),
    ("Cas", "Кассиопея", "Шедар"),
    ("CVn", "Гончие Псы", "Сердце Карла"),
    ("CMa", "Большой Пёс", "Сириус"),
    ("CMi", "Малый Пёс", "Процион"),
    ("Cru", "Южный Крест", "Акрукс"),
    ("Tau", "Телец", "Альдебаран"),
]

GENITIVE = {
    "Cyg": "Лебедя", "CrB": "Северной Короны", "Ori": "Ориона", "Gem": "Близнецов",
    "Leo": "Льва", "And": "Андромеды", "Lyr": "Лиры", "Boo": "Волопаса",
    "Sco": "Скорпиона", "Per": "Персея", "Peg": "Пегаса", "Cep": "Цефея",
    "UMa": "Большой Медведицы", "UMi": "Малой Медведицы", "Aur": "Возничего",
    "Aql": "Орла", "Vir": "Девы", "Her": "Геркулеса", "Dra": "Дракона",
    "Cas": "Кассиопеи", "CVn": "Гончих Псов", "CMa": "Большого Пса",
    "CMi": "Малого Пса", "Cru": "Южного Креста", "Tau": "Тельца",
}

# Exact coordinate schemes printed in the teacher's attached Word document.
# Each nested list is a separate stroke; a repeated point closes a loop.
SCHOOL_SCHEMES = {
    "Cyg": {
        "lines": [[(-3, 4), (-2, 2), (0, 0), (2, -2)], [(5, -3), (3, 1), (-3, -1), (-7, -2)]],
        "alpha": (-3, 4),
    },
    "Lyr": {
        "lines": [[(2, 5), (1, 4), (0, 4), (-1, 3), (-1, 2), (-5, 1), (-7, -2), (-5, -1), (0, 0), (-1, 2)]],
        "alpha": (2, 5),
    },
    "And": {
        "lines": [[(-2, 9), (0, 7), (1, 4), (2, -2), (-2, -1)], [(1, 4), (-2, 5), (-4, 4)]],
        "alpha": (-2, 9),
    },
    "Dra": {
        "lines": [[(12, 6), (14, 0), (12, -1), (9, -5), (4, -7), (1, -7), (-1, -6), (-4, -2), (-4, 2), (-7, 5), (-10, 5), (-10, 2), (-8, -5), (-11, -7), (-7, -9), (-6, -7), (-8, -5)]],
        "alpha": (-4, 2),
    },
    "Cep": {
        "lines": [[(0, 5), (-1, 4), (-2, 1), (1, -1), (6, -1), (3, 2), (-1, 4)]],
        "alpha": (-2, 1),
    },
    "Per": {
        "lines": [[(-5, -3), (-2, -2), (0, -1), (2, -2), (4, -1), (5, 0), (6, 2)], [(0, -1), (1, 1), (1, 3)]],
        "alpha": (0, -1),
    },
    "Cas": {
        "lines": [[(-5, 0), (-3, 2), (-1, 0), (1, 0), (3, -2)]],
        "alpha": (-3, 2),
    },
    "UMi": {
        "lines": [[(6, 6), (3, 7), (0, 7.5), (-3, 5.5), (-5, 7), (-8, 5), (-6, 3), (-3, 5.5)]],
        "alpha": (6, 6),
    },
    "UMa": {
        "lines": [[(-15, -7), (-10, -5), (-3, -6), (6, -6), (5, -10), (-1, -10), (-3, -6)]],
        "alpha": (6, -6),
    },
}

# Compact classroom figures traced from the green stick figures on the
# constellation-map images used by Wikipedia and hosted on Wikimedia Commons.
# HIP identifiers keep the traced vertices attached to the correct real stars.
WIKIMEDIA_SCHEMES = {
    "Cyg": [[102098, 100453, 95947], [97165, 100453, 102488]],
    "Lyr": [[91262, 91971, 92420, 93194, 92791, 91971]],
    "And": [[677, 3092, 5447, 9640], [5447, 4436]],
    "Dra": [[87833, 85670, 85819, 87585, 87833], [85670, 83895, 80331, 78527, 75458, 68756, 61281, 56211]],
    "Cep": [[116727, 106032, 105199, 102422], [105199, 109492, 110991, 112724, 116727]],
    "Per": [[14328, 15863, 17358, 18532, 18614], [15863, 14576, 17448], [15863, 13268]],
    "Cas": [[746, 3179, 4427, 6686, 8886]],
    "UMi": [[11767, 85822, 82080, 77055, 79822, 75097, 72607, 77055]],
    "UMa": [[67301, 65378, 62956, 59774, 58001, 53910, 54061, 59774]],
    "CrB": [[76127, 75695, 76267, 76952, 77512, 78159, 78493]],
    "Ori": [[27989, 25336, 24436, 27366, 27989], [26727, 26311, 25930]],
    "Gem": [[36850, 32246, 30343, 28734], [37826, 35550, 34088, 31681]],
    "Leo": [[57632, 54879, 49669, 49583, 50583, 54872, 57632], [50583, 50335, 48455, 47908], [54872, 54879]],
    "Boo": [[71795, 69673, 72105, 74666, 73555, 71075, 71053, 69673, 67927, 67459]],
    "Sco": [[85927, 86670, 87073, 86228, 84143, 82671, 82514, 82396, 81266, 80763, 78401], [80763, 78265], [80763, 78820]],
    "Peg": [[677, 113881, 113963, 1067, 677], [113881, 112748, 112440, 109176], [113963, 112447, 112029, 109427]],
    "Aur": [[28380, 28360, 24608, 23453, 23015], [25428, 23015], [25428, 28380]],
    "Aql": [[98036, 97649, 97278], [97649, 95501, 97804, 99473], [95501, 93747, 93244], [95501, 93805]],
    "Vir": [[57380, 60030, 61941, 65474, 69427, 69701, 71957], [65474, 66249, 68520, 72220], [66249, 63090, 63608], [63090, 61941]],
    "Her": [[81833, 81693, 83207, 84380, 81833], [81833, 81126, 79992, 77760], [84380, 84606, 85112, 87808], [81693, 84345], [83207, 84379]],
    "CVn": [[61317, 63125]],
    "CMa": [[33160, 34045, 33347, 32349, 33977, 34444, 35037, 35904], [33579, 33856, 34444], [32349, 30324]],
    "CMi": [[37279, 36188]],
    "Cru": [[61084, 60718], [62434, 59747]],
    "Tau": [[25428, 21881, 20889], [21421, 26451], [21421, 20894, 20205], [20889, 20648, 20455], [20205, 20455]],
}

WIKIMEDIA_SOURCE_URLS = {
    "Cyg": "https://commons.wikimedia.org/wiki/File:Cygnus_constellation_map.svg",
    "Lyr": "https://commons.wikimedia.org/wiki/File:Lyra_constellation_map.svg",
    "And": "https://commons.wikimedia.org/wiki/File:Andromeda_constellation_map.svg",
    "Dra": "https://commons.wikimedia.org/wiki/File:Draco_constellation_map.svg",
    "Cep": "https://commons.wikimedia.org/wiki/File:Cepheus_constellation_map.svg",
    "Per": "https://commons.wikimedia.org/wiki/File:Perseus_constellation_map.svg",
    "Cas": "https://commons.wikimedia.org/wiki/File:Cassiopeia_constellation_map.svg",
    "UMi": "https://commons.wikimedia.org/wiki/File:Ursa_Minor_constellation_map.svg",
    "UMa": "https://commons.wikimedia.org/wiki/File:Ursa_Major_constellation_map.svg",
    "CrB": "https://commons.wikimedia.org/wiki/File:Corona_Borealis_constellation_map.svg",
    "Ori": "https://commons.wikimedia.org/wiki/File:Orion_constellation_map.svg",
    "Gem": "https://commons.wikimedia.org/wiki/File:Gemini_constellation_map.svg",
    "Leo": "https://commons.wikimedia.org/wiki/File:Leo_constellation_map.svg",
    "Boo": "https://commons.wikimedia.org/wiki/File:Bo%C3%B6tes_constellation_map.svg",
    "Sco": "https://commons.wikimedia.org/wiki/File:Scorpius_constellation_map.svg",
    "Peg": "https://commons.wikimedia.org/wiki/File:Pegasus_constellation_map.svg",
    "Aur": "https://commons.wikimedia.org/wiki/File:Auriga_constellation_map.svg",
    "Aql": "https://commons.wikimedia.org/wiki/File:Aquila_constellation_map.svg",
    "Vir": "https://commons.wikimedia.org/wiki/File:Virgo_constellation_map.svg",
    "Her": "https://commons.wikimedia.org/wiki/File:Hercules_constellation_map.svg",
    "CVn": "https://commons.wikimedia.org/wiki/File:Canes_Venatici_constellation_map.svg",
    "CMa": "https://commons.wikimedia.org/wiki/File:Canis_Major_constellation_map.svg",
    "CMi": "https://commons.wikimedia.org/wiki/File:Canis_Minor_constellation_map.svg",
    "Cru": "https://commons.wikimedia.org/wiki/File:Crux_constellation_map.svg",
    "Tau": "https://commons.wikimedia.org/wiki/File:Taurus_constellation_map.svg",
}

# Legible integer-grid redraws of the same Wikimedia paths. These are used only
# where the real sky projection compresses several connected stars into one
# small area; the vertex and edge topology above remains unchanged.
PEDAGOGICAL_LAYOUTS = {
    "Cep": [
        {"x": -9, "y": 12}, {"x": 3, "y": 5}, {"x": 7, "y": -2},
        {"x": 13, "y": -1}, {"x": 2, "y": -11}, {"x": -3, "y": -11},
        {"x": -8, "y": -3},
    ],
    "Dra": [
        {"x": 13, "y": 9}, {"x": 9, "y": 7}, {"x": 8, "y": 12},
        {"x": 12, "y": 13}, {"x": 7, "y": 3}, {"x": 4, "y": 1},
        {"x": 1, "y": -2}, {"x": -2, "y": -5}, {"x": -6, "y": -9},
        {"x": -10, "y": -8}, {"x": -14, "y": -4},
    ],
    "Tau": [
        {"x": -13, "y": 11}, {"x": -8, "y": 5}, {"x": -3, "y": 1},
        {"x": 0, "y": 0}, {"x": 13, "y": 9}, {"x": 2, "y": -3},
        {"x": 0, "y": -7}, {"x": -3, "y": -3}, {"x": -5, "y": -7},
    ],
}


def angular_distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    dx = abs(a[0] - b[0])
    dx = min(dx, 360 - dx)
    return math.hypot(dx * math.cos(math.radians((a[1] + b[1]) / 2)), a[1] - b[1])


def compact_longitudes(values: list[float]) -> dict[float, float]:
    wrapped = sorted({v % 360 for v in values})
    if len(wrapped) < 2:
        return {values[0]: 0.0}
    gaps = []
    for i, value in enumerate(wrapped):
        next_value = wrapped[(i + 1) % len(wrapped)] + (360 if i == len(wrapped) - 1 else 0)
        gaps.append((next_value - value, i))
    _, gap_index = max(gaps)
    start = wrapped[(gap_index + 1) % len(wrapped)]
    return {value: (value % 360 - start) % 360 for value in values}


def normalize(lines: list[list[list[float]]]):
    raw_points = [tuple(point) for line in lines for point in line]
    lon_map = compact_longitudes([p[0] for p in raw_points])
    transformed = [(lon_map[p[0]], p[1]) for p in raw_points]
    min_x = min(p[0] for p in transformed)
    max_x = max(p[0] for p in transformed)
    min_y = min(p[1] for p in transformed)
    max_y = max(p[1] for p in transformed)
    span_x = max(max_x - min_x, 1)
    span_y = max(max_y - min_y, 1)
    scale = min(76 / span_x, 70 / span_y)
    offset_x = (100 - span_x * scale) / 2
    offset_y = (100 - span_y * scale) / 2

    index: dict[tuple[float, float], int] = {}
    points = []
    edges = []
    for line in lines:
        previous = None
        for raw in map(tuple, line):
            if raw not in index:
                x = offset_x + (lon_map[raw[0]] - min_x) * scale
                y = offset_y + (max_y - raw[1]) * scale
                index[raw] = len(points)
                points.append({"x": round(x, 2), "y": round(y, 2)})
            current = index[raw]
            if previous is not None and previous != current:
                edge = sorted((previous, current))
                if edge not in edges:
                    edges.append(edge)
            previous = current
    return raw_points, points, edges


def indexed_scheme(lines):
    index = {}
    points = []
    edges = []
    for line in lines:
        previous = None
        for raw in map(tuple, line):
            if raw not in index:
                index[raw] = len(points)
                points.append({"x": raw[0], "y": raw[1]})
            current = index[raw]
            if previous is not None and previous != current:
                edge = sorted((previous, current))
                if edge not in edges:
                    edges.append(edge)
            previous = current
    return index, points, edges


def wikimedia_scheme(paths, star_pos):
    coordinate_lines = []
    for path in paths:
        missing = [hip for hip in path if str(hip) not in star_pos]
        if missing:
            raise RuntimeError(f"Missing HIP positions: {missing}")
        coordinate_lines.append([star_pos[str(hip)] for hip in path])

    _, normalized, edges = normalize(coordinate_lines)
    points = [{"x": (point["x"] - 50) * .36, "y": (50 - point["y"]) * .36} for point in normalized]
    unique_hips = []
    for path in paths:
        for hip in path:
            if hip not in unique_hips:
                unique_hips.append(hip)
    return unique_hips, points, edges


def integerize_points(points):
    """Place every reference star on a unique integer grid coordinate."""
    candidates = [(x, y) for x in range(-16, 17) for y in range(-16, 17)]
    used = set()
    output = []
    for point in points:
        target = min(
            (candidate for candidate in candidates if candidate not in used),
            key=lambda candidate: (candidate[0] - point["x"]) ** 2 + (candidate[1] - point["y"]) ** 2,
        )
        used.add(target)
        output.append({"x": target[0], "y": target[1]})
    return output


def rotate_points(points, degrees):
    angle = math.radians(degrees)
    cosine = math.cos(angle)
    sine = math.sin(angle)
    return [
        {"x": point["x"] * cosine - point["y"] * sine, "y": point["x"] * sine + point["y"] * cosine}
        for point in points
    ]


def fit_points(points, limit=13):
    extent = max(max(abs(point["x"]), abs(point["y"])) for point in points)
    scale = limit / max(extent, 1)
    return [{"x": point["x"] * scale, "y": point["y"] * scale} for point in points]


def star_label(item, abbr):
    proper_name = item.get("ru") or item.get("name")
    if proper_name:
        return proper_name
    designation = item.get("desig") or item.get("bayer") or item.get("flam")
    return f"{designation} {abbr}" if designation else item.get("hip", f"звезда {abbr}")


def main():
    stars_json = json.loads((SOURCE / "stars.6.json").read_text(encoding="utf-8"))
    names = json.loads((SOURCE / "starnames.json").read_text(encoding="utf-8"))
    star_pos = {str(feature["id"]): tuple(feature["geometry"]["coordinates"]) for feature in stars_json["features"]}

    output = []
    target_meta = {}
    for abbr, title, alpha_name in TARGETS:
        target_meta[abbr] = (title, alpha_name)
        alpha_candidates = [
            (hip, item) for hip, item in names.items()
            if item.get("c") == abbr and str(item.get("bayer", "")).startswith("α") and hip in star_pos
        ]
        if not alpha_candidates:
            raise RuntimeError(f"No alpha star found for {abbr}")
        alpha_hip, _ = alpha_candidates[0]
        alpha_coord = star_pos[alpha_hip]
        if abbr not in WIKIMEDIA_SCHEMES:
            raise RuntimeError(f"Missing Wikipedia/Wikimedia schematic figure for {abbr}")
        hips, points, edges = wikimedia_scheme(WIKIMEDIA_SCHEMES[abbr], star_pos)
        alpha_index = min(
            range(len(hips)),
            key=lambda index: angular_distance(star_pos[str(hips[index])], alpha_coord),
        )
        point_names = [star_label(names.get(str(hip), {"hip": hip}), abbr) for hip in hips]

        if abbr in PEDAGOGICAL_LAYOUTS:
            if len(PEDAGOGICAL_LAYOUTS[abbr]) != len(points):
                raise RuntimeError(f"Pedagogical Wikipedia redraw length mismatch for {abbr}")
            points = PEDAGOGICAL_LAYOUTS[abbr]
        points = integerize_points(points)
        point_names[alpha_index] = alpha_name

        output.append({
            "id": abbr,
            "name": title,
            "kind": "constellation",
            "alpha": alpha_name,
            "alphaDesignation": f"α {abbr}",
            "alphaScientific": f"α {GENITIVE[abbr]}",
            "alphaIndex": alpha_index,
            "pointNames": point_names,
            "source": "wikipedia-wikimedia",
            "sourceUrl": WIKIMEDIA_SOURCE_URLS.get(abbr),
            "points": points,
            "edges": edges,
        })

    output.extend([
        {
            "id": "summer-triangle",
            "name": "Летне-осенний треугольник",
            "kind": "asterism",
            "source": "astronomical",
            "sourceUrl": "https://en.wikipedia.org/wiki/Summer_Triangle",
            "points": [{"x": 0, "y": 8}, {"x": -10, "y": 1}, {"x": 6, "y": -8}],
            "pointNames": ["Денеб", "Вега", "Альтаир"],
            "edges": [[0, 1], [1, 2], [2, 0]],
            "vertices": [
                {"index": 0, "star": "Денеб", "constellation": "Лебедь"},
                {"index": 1, "star": "Вега", "constellation": "Лира"},
                {"index": 2, "star": "Альтаир", "constellation": "Орёл"},
            ],
        },
        {
            "id": "winter-triangle",
            "name": "Зимний треугольник",
            "kind": "asterism",
            "source": "astronomical",
            "sourceUrl": "https://en.wikipedia.org/wiki/Winter_Triangle",
            "points": [{"x": -3, "y": 8}, {"x": -9, "y": -8}, {"x": 9, "y": -2}],
            "pointNames": ["Бетельгейзе", "Сириус", "Процион"],
            "edges": [[0, 1], [1, 2], [2, 0]],
            "vertices": [
                {"index": 0, "star": "Бетельгейзе", "constellation": "Орион"},
                {"index": 1, "star": "Сириус", "constellation": "Большой Пёс"},
                {"index": 2, "star": "Процион", "constellation": "Малый Пёс"},
            ],
        },
    ])

    # The nine teacher figures also return as separate exact-coordinate tasks.
    # They are mixed into the same random deck rather than exposed as a mode.
    for abbr, scheme in SCHOOL_SCHEMES.items():
        title, alpha_name = target_meta[abbr]
        point_index, points, edges = indexed_scheme(scheme["lines"])
        alpha_index = point_index[scheme["alpha"]]
        point_names = [f"Звезда схемы №{index + 1}" for index in range(len(points))]
        for coordinate, star_name in scheme.get("names", {}).items():
            point_names[point_index[coordinate]] = star_name
        output.append({
            "id": f"{abbr}-coordinates",
            "name": title,
            "kind": "constellation",
            "alpha": alpha_name,
            "alphaDesignation": f"α {abbr}",
            "alphaScientific": f"α {GENITIVE[abbr]}",
            "alphaIndex": alpha_index,
            "pointNames": point_names,
            "source": "teacher-document",
            "sourceUrl": None,
            "points": integerize_points(points),
            "edges": edges,
        })

    payload = json.dumps(output, ensure_ascii=False, separators=(",", ":"))
    (ROOT / "constellations.js").write_text(
        "// Geometry uses the teacher document and Wikipedia/Wikimedia constellation maps. See README.md.\n"
        f"window.CONSTELLATIONS={payload};\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(output)} objects to constellations.js")


if __name__ == "__main__":
    main()
