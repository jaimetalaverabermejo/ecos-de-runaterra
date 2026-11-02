#!/usr/bin/env python3
"""Read-only check of EdR_Ground inner corners against the authored road mask."""
import argparse
import json
from pathlib import Path

def check(path):
    m = json.loads(Path(path).read_text(encoding="utf-8"))
    ground = next(s for s in m["tilesets"] if s.get("name") == "EdR_Ground" or Path(s.get("source", "").replace("\\", "/")).stem == "EdR_Ground")
    first = ground["firstgid"]
    data = next(l["data"] for l in m["layers"] if l["name"] == "Paths")
    width, height = m["width"], m["height"]
    def road(x, y):
        return 0 <= x < width and 0 <= y < height and data[y * width + x] != 0
    checked, errors, transformed = 0, [], []
    for i, gid in enumerate(data):
        local = (gid & 0x1fffffff) - first
        if local not in (236, 237, 271, 272):
            continue
        x, y = i % width, i // width
        if gid & 0xe0000000:
            transformed.append([x, y, gid])
            continue
        if not all(road(x + dx, y + dy) for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]):
            continue
        missing = [v for v in [(-1, -1, 272), (1, -1, 271), (-1, 1, 237), (1, 1, 236)] if not road(x + v[0], y + v[1])]
        if len(missing) != 1:
            continue
        checked += 1
        expected = first + missing[0][2]
        if gid != expected:
            errors.append({"x": x, "y": y, "gid": gid, "expected": expected})
    return {"checked": checked, "errors": errors, "transformed_review_required": transformed}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("map", type=Path)
    args = parser.parse_args()
    result = check(args.map)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(1 if result["errors"] or result["transformed_review_required"] else 0)
