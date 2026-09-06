"""Render every practice figure into one QA sheet."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]


def load_objects():
    source = (ROOT / "constellations.js").read_text(encoding="utf-8")
    return json.loads(source.split("window.CONSTELLATIONS=", 1)[1].rstrip(";\n"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    objects = load_objects()
    cell_width, cell_height, columns = 360, 300, 5
    rows = (len(objects) + columns - 1) // columns
    image = Image.new("RGB", (cell_width * columns, cell_height * rows), "#0b0b0d")
    draw = ImageDraw.Draw(image)
    title_font = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 20)
    meta_font = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 13)

    for index, item in enumerate(objects):
        col, row = index % columns, index // columns
        left, top = col * cell_width, row * cell_height
        draw.rectangle((left + 4, top + 4, left + cell_width - 4, top + cell_height - 4), fill="#141417", outline="#34343a")
        draw.text((left + 18, top + 14), f"{index + 1}. {item['name']}", fill="#f5f5f2", font=title_font)
        draw.text((left + 18, top + 42), f"{len(item['points'])} точек · {len(item['edges'])} линий · {item['source']}", fill="#8d8d92", font=meta_font)

        plot_left, plot_top, plot_size = left + 48, top + 68, 230
        project = lambda point: (
            plot_left + (point["x"] + 16) / 32 * plot_size,
            plot_top + (16 - point["y"]) / 32 * plot_size,
        )
        for a, b in item["edges"]:
            draw.line((*project(item["points"][a]), *project(item["points"][b])), fill="#ffd31a", width=3)
        for point_index, point in enumerate(item["points"]):
            x, y = project(point)
            radius = 6 if point_index == item.get("alphaIndex") else 4
            fill = "#c7ff5e" if point_index == item.get("alphaIndex") else "#f5f5f2"
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=fill)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    image.save(args.output)
    print(args.output)


if __name__ == "__main__":
    main()
