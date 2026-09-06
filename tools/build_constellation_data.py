"""Build the compact browser dataset used by the trainer.

The geometry comes from d3-celestial's constellation line GeoJSON. Star names
and positions are joined by HIP identifier so the alpha marker is attached to
the same point used by the line drawing.
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

# Compact school-style figures for constellations whose attached table did not
# contain a coordinate scheme.  These deliberately keep only the memorable
# "skeleton" used in recognition exercises instead of the full atlas drawing.
SIMPLIFIED_SCHEMES = {
    "CrB": {"lines": [[(-8, 1), (-6, 4), (-3, 6), (0, 7), (3, 6), (6, 4), (8, 1)]], "alpha": (0, 7), "names": {(0, 7): "Альфекка"}},
    "Ori": {"lines": [[(-6, 6), (-2, 2), (0, 1), (2, 2), (6, 6)], [(-2, 2), (-5, -7)], [(2, 2), (5, -7)], [(0, 1), (0, -3)]], "alpha": (-6, 6), "names": {(-6, 6): "Бетельгейзе", (-2, 2): "Альнитак", (0, 1): "Альнилам", (2, 2): "Минтака", (6, 6): "Беллатрикс", (-5, -7): "Саиф", (5, -7): "Ригель", (0, -3): "Меч Ориона"}},
    "Gem": {"lines": [[(-5, 8), (-4, 4), (-3, 0), (-6, -6)], [(5, 8), (4, 4), (3, 0), (6, -6)], [(-4, 4), (4, 4)], [(-3, 0), (3, 0)]], "alpha": (-5, 8), "names": {(-5, 8): "Кастор", (5, 8): "Поллукс"}},
    "Leo": {"lines": [[(-7, -3), (-7, 0), (-6, 3), (-4, 6), (-2, 3), (-7, 0)], [(-7, -3), (1, -2), (7, 0), (-2, 3)]], "alpha": (-7, -3), "names": {(-7, -3): "Регул"}},
    "Boo": {"lines": [[(0, -7), (-3, -1), (0, 6), (4, 3), (5, -1), (0, -7)], [(-3, -1), (-6, 2)]], "alpha": (0, -7), "names": {(0, -7): "Арктур"}},
    "Sco": {"lines": [[(-9, 6), (-7, 4), (-5, 5), (-4, 2), (-2, 0), (0, -3), (3, -6), (6, -7), (9, -5), (8, -2)]], "alpha": (-4, 2), "names": {(-4, 2): "Антарес"}},
    "Peg": {"lines": [[(-4, 5), (4, 5), (4, -2), (-4, -2), (-4, 5)], [(-4, 5), (-8, 7), (-11, 6)], [(4, -2), (7, -6)], [(-4, -2), (-7, -6)]], "alpha": (-4, -2), "names": {(-4, -2): "Маркаб"}},
    "Aur": {"lines": [[(0, 8), (6, 3), (5, -5), (-3, -7), (-7, 0), (0, 8)], [(0, 8), (-2, 3)]], "alpha": (0, 8), "names": {(0, 8): "Капелла"}},
    "Aql": {"lines": [[(-8, 4), (-3, 1), (0, 3), (3, 1), (8, 4)], [(0, 3), (0, -6)], [(-3, 1), (-6, -3)]], "alpha": (0, 3), "names": {(0, 3): "Альтаир"}},
    "Vir": {"lines": [[(-8, 5), (-4, 2), (0, 0), (4, -2), (7, -7)], [(-4, 2), (-7, -1)], [(0, 0), (5, 2), (9, 1)]], "alpha": (7, -7), "names": {(7, -7): "Спика"}},
    "Her": {"lines": [[(-3, 3), (3, 4), (4, -1), (-2, -2), (-3, 3)], [(-3, 3), (-7, 7)], [(3, 4), (8, 7)], [(-2, -2), (-6, -7)], [(4, -1), (7, -7)]], "alpha": (-6, -7), "names": {(-6, -7): "Рас Альгети"}},
    "CVn": {"lines": [[(-7, 3), (7, -3)]], "alpha": (7, -3), "names": {(7, -3): "Сердце Карла"}},
    "CMa": {"lines": [[(-8, 3), (-2, 4), (1, 1), (4, -3), (2, -6), (-4, -5), (-8, 3)], [(-2, 4), (2, 7), (1, 1)]], "alpha": (-2, 4), "names": {(-2, 4): "Сириус"}},
    "CMi": {"lines": [[(-7, -2), (7, 2)]], "alpha": (-7, -2), "names": {(-7, -2): "Процион"}},
    "Cru": {"lines": [[(-8, 1), (8, -1)], [(0, 7), (0, -7)]], "alpha": (0, -7), "names": {(0, -7): "Акрукс"}},
    "Tau": {"lines": [[(-10, 8), (-5, 4), (-2, 0), (0, -4)], [(10, 8), (5, 4), (2, 0), (0, -4)]], "alpha": (-5, 4), "names": {(-5, 4): "Альдебаран"}},
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


def star_label(item, abbr):
    proper_name = item.get("ru") or item.get("name")
    if proper_name:
        return proper_name
    designation = item.get("desig") or item.get("bayer") or item.get("flam")
    return f"{designation} {abbr}" if designation else item.get("hip", f"звезда {abbr}")


def main():
    lines_json = json.loads((SOURCE / "constellations.lines.json").read_text(encoding="utf-8"))
    stars_json = json.loads((SOURCE / "stars.6.json").read_text(encoding="utf-8"))
    names = json.loads((SOURCE / "starnames.json").read_text(encoding="utf-8"))
    line_by_id = {feature["id"]: feature["geometry"]["coordinates"] for feature in lines_json["features"]}
    star_pos = {str(feature["id"]): tuple(feature["geometry"]["coordinates"]) for feature in stars_json["features"]}

    output = []
    for abbr, title, alpha_name in TARGETS:
        raw_points, points, edges = normalize(line_by_id[abbr])
        alpha_candidates = [
            (hip, item) for hip, item in names.items()
            if item.get("c") == abbr and str(item.get("bayer", "")).startswith("α") and hip in star_pos
        ]
        if not alpha_candidates:
            raise RuntimeError(f"No alpha star found for {abbr}")
        alpha_hip, _ = alpha_candidates[0]
        alpha_coord = star_pos[alpha_hip]
        alpha_index = min(range(len(raw_points)), key=lambda i: angular_distance(raw_points[i], alpha_coord))
        # raw_points can repeat; point order is first occurrence.
        unique_raw = []
        for point in raw_points:
            if point not in unique_raw:
                unique_raw.append(point)
        alpha_index = min(range(len(unique_raw)), key=lambda i: angular_distance(unique_raw[i], alpha_coord))
        constellation_stars = [
            (item, star_pos[hip]) for hip, item in names.items()
            if item.get("c") == abbr and hip in star_pos
        ]
        point_names = []
        for raw_point in unique_raw:
            nearest_item, _ = min(constellation_stars, key=lambda candidate: angular_distance(raw_point, candidate[1]))
            point_names.append(star_label(nearest_item, abbr))
        source = "astronomical"
        if abbr in SCHOOL_SCHEMES or abbr in SIMPLIFIED_SCHEMES:
            scheme = SCHOOL_SCHEMES.get(abbr, SIMPLIFIED_SCHEMES.get(abbr))
            point_index, points, edges = indexed_scheme(scheme["lines"])
            alpha_index = point_index[scheme["alpha"]]
            point_names = [f"Звезда схемы №{index + 1}" for index in range(len(points))]
            for coordinate, star_name in scheme.get("names", {}).items():
                point_names[point_index[coordinate]] = star_name
            source = "teacher-document" if abbr in SCHOOL_SCHEMES else "curated-school-scheme"
        else:
            # Convert the astronomical projection to a roomy printable grid.
            points = [
                {"x": (point["x"] - 50) * .36, "y": (50 - point["y"]) * .28}
                for point in points
            ]

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
            "source": source,
            "points": points,
            "edges": edges,
        })

    output.extend([
        {
            "id": "summer-triangle",
            "name": "Летне-осенний треугольник",
            "kind": "asterism",
            "source": "astronomical",
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

    payload = json.dumps(output, ensure_ascii=False, separators=(",", ":"))
    (ROOT / "constellations.js").write_text(
        "// Geometry derived from d3-celestial (MIT). See README.md.\n"
        f"window.CONSTELLATIONS={payload};\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(output)} objects to constellations.js")


if __name__ == "__main__":
    main()
