#!/usr/bin/env python3
"""Scan Prodewty image assets by actual visible pixels.

The scanner inventories image files, proposes stable asset names from path
context, detects transparent content bounds, finds component crops for likely
sprite sheets, and audits runtime frames currently wired in RpgAssetRegistry.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter, deque
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
DEFAULT_ASSET_ROOTS = [
    "app/assets",
    "app/ios/Prodewty/Images.xcassets",
    "docs/rpg-asset-atlas",
]
IGNORED_PATH_PARTS = {"node_modules", ".git"}
MAX_COMPONENT_PIXELS = 4096 * 4096
MAX_COMPONENTS_IN_REPORT = 80
MIN_COMPONENT_AREA = 8


@dataclass(frozen=True)
class FrameRef:
    name: str
    source_const: str
    source_path: str
    x: int
    y: int
    width: int
    height: int
    sheet_width: int
    sheet_height: int
    origin: str


def rel(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def normalize_token(value: str) -> str:
    value = re.sub(r"(?i)^craftpix[-_ ]?net[-_ ]?\d+[-_ ]?", "", value)
    value = re.sub(r"(?i)^free[-_ ]?", "", value)
    value = re.sub(r"(?i)\bpixel[-_ ]?art\b", "pixel", value)
    value = value.replace("&", "and")
    value = re.sub(r"[^A-Za-z0-9]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_")
    return value.lower()


def title_from_token(value: str) -> str:
    words = [word for word in re.split(r"[_\-\s]+", value) if word]
    return " ".join(word[:1].upper() + word[1:] for word in words)


def package_name(path: str) -> str:
    parts = path.split("/")
    if "assets" in parts:
        index = parts.index("assets")
        if index + 1 < len(parts):
            if parts[index + 1] == "game" and index + 2 < len(parts):
                return parts[index + 2]
            return parts[index + 1]
    if "Images.xcassets" in parts:
        index = parts.index("Images.xcassets")
        if index + 1 < len(parts):
            return parts[index + 1]
    if parts[:2] == ["docs", "rpg-asset-atlas"]:
        return "rpg-asset-atlas"
    return parts[0] if parts else "unknown"


def infer_tags(path: str) -> list[str]:
    text = normalize_token(path)
    tags = []
    keywords = [
        "animal",
        "archive",
        "book",
        "bush",
        "button",
        "cave",
        "chest",
        "crop",
        "crystal",
        "dungeon",
        "farm",
        "forest",
        "icon",
        "inventory",
        "object",
        "plant",
        "resource",
        "seed",
        "shop",
        "sprite",
        "temple",
        "tile",
        "ui",
        "weapon",
    ]
    for keyword in keywords:
        if keyword in text:
            tags.append(keyword)
    if "with_shadow" in text:
        tags.append("shadowed")
    if "without_shadow" in text:
        tags.append("shadowless")
    if "separately" in text or "assets" in text:
        tags.append("separate")
    if "sheet" in text or "packed" in text or "animation" in text:
        tags.append("sheet")
    return sorted(set(tags))


def proposed_identity(path: str) -> dict[str, str]:
    stem = Path(path).stem
    pack = normalize_token(package_name(path))
    name_token = normalize_token(stem)
    parent = normalize_token(Path(path).parent.name)
    prefix = parent if parent not in {"png", "assets", "separately", "tiled", "tiled_files"} else pack
    if prefix and name_token and not name_token.startswith(prefix):
        proposed_id = f"{prefix}.{name_token}"
    else:
        proposed_id = name_token or prefix or "asset"
    return {
        "id": proposed_id.replace("..", "."),
        "name": title_from_token(name_token or stem),
    }


def image_mask(image: Image.Image) -> tuple[np.ndarray, str]:
    rgba = image.convert("RGBA")
    arr = np.asarray(rgba)
    alpha = arr[:, :, 3]
    if np.any(alpha < 255):
        return alpha > 8, "alpha"

    rgb = arr[:, :, :3].astype(np.int16)
    h, w = alpha.shape
    corners = np.array([rgb[0, 0], rgb[0, w - 1], rgb[h - 1, 0], rgb[h - 1, w - 1]])
    rounded = [tuple((corner // 8 * 8).tolist()) for corner in corners]
    bg = np.array(Counter(rounded).most_common(1)[0][0], dtype=np.int16)
    diff = np.max(np.abs(rgb - bg), axis=2)
    if np.mean(diff <= 8) > 0.05:
        return diff > 8, "corner-background"
    return np.ones((h, w), dtype=bool), "opaque"


def bbox_from_mask(mask: np.ndarray) -> dict[str, int] | None:
    ys, xs = np.nonzero(mask)
    if xs.size == 0:
        return None
    x0 = int(xs.min())
    y0 = int(ys.min())
    x1 = int(xs.max()) + 1
    y1 = int(ys.max()) + 1
    return {"x": x0, "y": y0, "width": x1 - x0, "height": y1 - y0}


def should_component_scan(path: str, width: int, height: int, has_transparency: bool, bbox: dict[str, int] | None) -> bool:
    if width * height > MAX_COMPONENT_PIXELS:
        return False
    if bbox is None:
        return False
    text = normalize_token(path)
    sheetish = any(token in text for token in ["sheet", "sprite", "packed", "tileset", "animation", "icons", "inventory", "shop", "supplies", "plants", "objects"])
    large = width >= 128 and height >= 128
    return has_transparency and (sheetish or large)


def merge_nearby_boxes(boxes: list[dict[str, int]], gap: int = 3) -> list[dict[str, int]]:
    merged = boxes[:]
    changed = True
    while changed:
        changed = False
        next_boxes: list[dict[str, int]] = []
        used = [False] * len(merged)
        for index, box in enumerate(merged):
            if used[index]:
                continue
            current = box.copy()
            used[index] = True
            for other_index in range(index + 1, len(merged)):
                if used[other_index]:
                    continue
                other = merged[other_index]
                ax0, ay0 = current["x"] - gap, current["y"] - gap
                ax1 = current["x"] + current["width"] + gap
                ay1 = current["y"] + current["height"] + gap
                bx0, by0 = other["x"], other["y"]
                bx1 = other["x"] + other["width"]
                by1 = other["y"] + other["height"]
                if ax0 <= bx1 and bx0 <= ax1 and ay0 <= by1 and by0 <= ay1:
                    nx0 = min(current["x"], other["x"])
                    ny0 = min(current["y"], other["y"])
                    nx1 = max(current["x"] + current["width"], other["x"] + other["width"])
                    ny1 = max(current["y"] + current["height"], other["y"] + other["height"])
                    current = {"x": nx0, "y": ny0, "width": nx1 - nx0, "height": ny1 - ny0, "area": current.get("area", 0) + other.get("area", 0)}
                    used[other_index] = True
                    changed = True
            next_boxes.append(current)
        merged = next_boxes
    return sorted(merged, key=lambda box: (box["y"], box["x"], box["width"], box["height"]))


def component_boxes(mask: np.ndarray) -> list[dict[str, int]]:
    height, width = mask.shape
    visited = np.zeros(mask.shape, dtype=bool)
    boxes: list[dict[str, int]] = []
    ys, xs = np.nonzero(mask)
    starts = list(zip(xs.tolist(), ys.tolist()))
    for start_x, start_y in starts:
        if visited[start_y, start_x] or not mask[start_y, start_x]:
            continue
        queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
        visited[start_y, start_x] = True
        min_x = max_x = start_x
        min_y = max_y = start_y
        area = 0
        while queue:
            x, y = queue.popleft()
            area += 1
            min_x = min(min_x, x)
            max_x = max(max_x, x)
            min_y = min(min_y, y)
            max_y = max(max_y, y)
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if nx < 0 or nx >= width or ny < 0 or ny >= height:
                    continue
                if visited[ny, nx] or not mask[ny, nx]:
                    continue
                visited[ny, nx] = True
                queue.append((nx, ny))
        if area >= MIN_COMPONENT_AREA:
            boxes.append({"x": min_x, "y": min_y, "width": max_x - min_x + 1, "height": max_y - min_y + 1, "area": area})
    return merge_nearby_boxes(boxes)


def classify_image(path: str, width: int, height: int, has_alpha: bool, bbox: dict[str, int] | None, components: list[dict[str, int]] | None) -> str:
    text = normalize_token(path)
    if any(token in text for token in ["appicon", "splash", "android_icon", "icon_dusk", "icon_sunset", "icon_snow"]):
        return "app-icon"
    if any(token in text for token in ["tileset", "main_tiles", "tile"]):
        return "tileset"
    if any(token in text for token in ["animation", "sheet", "packed"]):
        return "animation-sheet"
    if components and len(components) >= 4:
        return "extractable-sheet"
    if width >= 256 and height >= 256 and has_alpha:
        return "possible-sheet"
    if bbox and bbox["width"] < width * 0.98 and bbox["height"] < height * 0.98:
        return "single-transparent-asset"
    return "single-image"


def scan_image(path: Path, root: Path) -> dict[str, Any]:
    relative = rel(path, root)
    stat = path.stat()
    identity = proposed_identity(relative)
    try:
        with Image.open(path) as image:
            width, height = image.size
            mode = image.mode
            mask, mask_kind = image_mask(image)
            bbox = bbox_from_mask(mask)
            has_alpha = mask_kind == "alpha"
            content_pixels = int(mask.sum())
            density = round(content_pixels / max(width * height, 1), 5)
            components = None
            if should_component_scan(relative, width, height, has_alpha, bbox):
                boxes = component_boxes(mask)
                components = boxes[:MAX_COMPONENTS_IN_REPORT]
                component_count = len(boxes)
            else:
                component_count = 0
            classification = classify_image(relative, width, height, has_alpha, bbox, components)
            return {
                "path": relative,
                "package": package_name(relative),
                "proposedId": identity["id"],
                "proposedName": identity["name"],
                "tags": infer_tags(relative),
                "classification": classification,
                "bytes": stat.st_size,
                "width": width,
                "height": height,
                "mode": mode,
                "maskKind": mask_kind,
                "contentBox": bbox,
                "contentPixels": content_pixels,
                "contentDensity": density,
                "componentCount": component_count,
                "componentsSample": components,
            }
    except Exception as exc:  # noqa: BLE001
        return {
            "path": relative,
            "package": package_name(relative),
            "proposedId": identity["id"],
            "proposedName": identity["name"],
            "tags": infer_tags(relative),
            "classification": "unreadable",
            "bytes": stat.st_size,
            "error": str(exc),
        }


def iter_image_paths(root: Path, asset_roots: list[str]) -> list[Path]:
    paths: list[Path] = []
    for asset_root in asset_roots:
        base = root / asset_root
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            if any(part in IGNORED_PATH_PARTS for part in path.parts):
                continue
            paths.append(path)
    return sorted(set(paths))


def parse_required_sources(root: Path) -> tuple[dict[str, str], list[dict[str, str]]]:
    sources: dict[str, str] = {}
    references: list[dict[str, str]] = []
    for code_path in sorted((root / "app").rglob("*")):
        if code_path.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
            continue
        if "node_modules" in code_path.parts:
            continue
        text = code_path.read_text(encoding="utf-8", errors="ignore")
        code_rel = rel(code_path, root)
        for match in re.finditer(r"const\s+([A-Z0-9_]+)\s*=\s*require\('([^']+)'\)", text):
            source_path = (code_path.parent / match.group(2)).resolve()
            try:
                sources[match.group(1)] = rel(source_path, root)
            except ValueError:
                sources[match.group(1)] = source_path.as_posix()
        for match in re.finditer(r"require\('([^']+\.(?:png|jpg|jpeg|webp))'\)", text, flags=re.IGNORECASE):
            source_path = (code_path.parent / match.group(1)).resolve()
            try:
                source_rel = rel(source_path, root)
            except ValueError:
                source_rel = source_path.as_posix()
            references.append({"codePath": code_rel, "assetPath": source_rel})
    return sources, references


def parse_runtime_frames(root: Path, sources: dict[str, str]) -> list[FrameRef]:
    registry_path = root / "app/src/engine/RpgAssetRegistry.ts"
    if not registry_path.exists():
        return []
    text = registry_path.read_text(encoding="utf-8")
    frames: list[FrameRef] = []
    seen: set[tuple[str, str, int, int, int, int]] = set()

    def add_frame(frame: FrameRef) -> None:
        key = (frame.name, frame.source_path, frame.x, frame.y, frame.width, frame.height)
        if key not in seen:
            seen.add(key)
            frames.append(frame)

    helper_patterns = {
        "rpgUiIcon": ("RPG_UI_ICONS_SHEET", 16, 16, 96, 304),
        "rpgBookFrame": ("RPG_ARCHIVE_BOOK_SHEET", 272, 272, 1088, 816),
        "rpgFarmPlant": ("RPG_FARM_PLANTS_SHEET", 48, 48, 768, 432),
        "rpgFarmSupply": ("RPG_FARM_SUPPLIES_SHEET", 32, 32, 288, 224),
    }

    for line_no, line in enumerate(text.splitlines(), start=1):
        asset_match = re.search(r"assetId:\s*'([^']+)'.*?frame:\s*rpgSpriteFrame\((RPG_[A-Z0-9_]+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)", line)
        if asset_match:
            source_const = asset_match.group(2)
            if source_const in sources:
                add_frame(FrameRef(
                    name=asset_match.group(1),
                    source_const=source_const,
                    source_path=sources[source_const],
                    x=int(asset_match.group(3)),
                    y=int(asset_match.group(4)),
                    width=int(asset_match.group(5)),
                    height=int(asset_match.group(6)),
                    sheet_width=int(asset_match.group(7)),
                    sheet_height=int(asset_match.group(8)),
                    origin=f"RpgAssetRegistry.ts:{line_no}",
                ))
                continue
        direct_match = re.search(r"^\s*([A-Za-z0-9_]+):\s*rpgSpriteFrame\((RPG_[A-Z0-9_]+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)", line)
        if direct_match:
            source_const = direct_match.group(2)
            if source_const in sources:
                add_frame(FrameRef(
                    name=direct_match.group(1),
                    source_const=source_const,
                    source_path=sources[source_const],
                    x=int(direct_match.group(3)),
                    y=int(direct_match.group(4)),
                    width=int(direct_match.group(5)),
                    height=int(direct_match.group(6)),
                    sheet_width=int(direct_match.group(7)),
                    sheet_height=int(direct_match.group(8)),
                    origin=f"RpgAssetRegistry.ts:{line_no}",
                ))
        helper_match = re.search(r"([A-Za-z0-9_]+):\s*(rpgUiIcon|rpgBookFrame|rpgFarmPlant|rpgFarmSupply)\((\d+),\s*(\d+)\)", line)
        if helper_match:
            helper = helper_match.group(2)
            source_const, frame_width, frame_height, sheet_width, sheet_height = helper_patterns[helper]
            row = int(helper_match.group(3))
            col = int(helper_match.group(4))
            if source_const in sources:
                add_frame(FrameRef(
                    name=helper_match.group(1),
                    source_const=source_const,
                    source_path=sources[source_const],
                    x=col * frame_width,
                    y=row * frame_height,
                    width=frame_width,
                    height=frame_height,
                    sheet_width=sheet_width,
                    sheet_height=sheet_height,
                    origin=f"RpgAssetRegistry.ts:{line_no}",
                ))

    animation_regex = re.compile(r"([A-Za-z0-9_]+):\s*rpgSpriteAnimationGrid\((RPG_[A-Z0-9_]+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),")
    for match in animation_regex.finditer(text):
        name = match.group(1)
        source_const = match.group(2)
        if source_const not in sources:
            continue
        frame_width = int(match.group(3))
        frame_height = int(match.group(4))
        columns = int(match.group(5))
        rows = int(match.group(6))
        add_frame(FrameRef(
            name=f"animation.{name}.frame0",
            source_const=source_const,
            source_path=sources[source_const],
            x=0,
            y=0,
            width=frame_width,
            height=frame_height,
            sheet_width=frame_width * columns,
            sheet_height=frame_height * rows,
            origin="RpgAssetRegistry.ts:animation-grid",
        ))
    return frames


def audit_frame(root: Path, frame: FrameRef) -> dict[str, Any]:
    path = root / frame.source_path
    result: dict[str, Any] = {
        "name": frame.name,
        "sourcePath": frame.source_path,
        "sourceConst": frame.source_const,
        "origin": frame.origin,
        "frame": {
            "x": frame.x,
            "y": frame.y,
            "width": frame.width,
            "height": frame.height,
            "sheetWidth": frame.sheet_width,
            "sheetHeight": frame.sheet_height,
        },
        "issues": [],
    }
    if not path.exists():
        result["issues"].append("missing-source")
        return result
    with Image.open(path) as image:
        width, height = image.size
        result["actualSheet"] = {"width": width, "height": height}
        if width != frame.sheet_width or height != frame.sheet_height:
            result["issues"].append("sheet-size-mismatch")
        if frame.x < 0 or frame.y < 0 or frame.x + frame.width > width or frame.y + frame.height > height:
            result["issues"].append("frame-out-of-bounds")
            return result
        crop = image.crop((frame.x, frame.y, frame.x + frame.width, frame.y + frame.height))
        mask, _ = image_mask(crop)
        bbox = bbox_from_mask(mask)
        pixels = int(mask.sum())
        result["contentBox"] = bbox
        result["contentPixels"] = pixels
        result["contentDensity"] = round(pixels / max(frame.width * frame.height, 1), 5)
        if pixels == 0:
            result["issues"].append("empty-frame")
        else:
            edge_counts = {
                "left": int(mask[:, 0].sum()),
                "right": int(mask[:, -1].sum()),
                "top": int(mask[0, :].sum()),
                "bottom": int(mask[-1, :].sum()),
            }
            result["edgePixels"] = edge_counts
            if any(count > 0 for count in edge_counts.values()):
                result["issues"].append("content-touches-frame-edge")
            if result["contentDensity"] < 0.03 and frame.width * frame.height >= 256:
                result["issues"].append("very-sparse-frame")
            if bbox and (bbox["width"] <= 2 or bbox["height"] <= 2):
                result["issues"].append("sliver-content")
    return result


def summarize(images: list[dict[str, Any]], frame_audits: list[dict[str, Any]], code_references: list[dict[str, str]]) -> dict[str, Any]:
    classes = Counter(image["classification"] for image in images)
    packages = Counter(image["package"] for image in images)
    referenced_assets = {reference["assetPath"] for reference in code_references}
    sheet_candidates = [
        image for image in images
        if image["classification"] in {"extractable-sheet", "possible-sheet", "animation-sheet", "tileset"}
    ]
    issue_frames = [audit for audit in frame_audits if audit["issues"]]
    material_issue_frames = [
        audit for audit in issue_frames
        if any(issue != "content-touches-frame-edge" for issue in audit["issues"])
    ]
    return {
        "totalImages": len(images),
        "totalReferencedImages": len(referenced_assets),
        "classificationCounts": dict(classes.most_common()),
        "topPackages": dict(packages.most_common(25)),
        "likelySheetCount": len(sheet_candidates),
        "runtimeFrameCount": len(frame_audits),
        "runtimeFrameIssueCount": len(issue_frames),
        "runtimeFrameMaterialIssueCount": len(material_issue_frames),
    }


def write_markdown(report: dict[str, Any], output_path: Path) -> None:
    summary = report["summary"]
    images = report["images"]
    frame_audits = report["runtimeFrameAudits"]
    sheet_candidates = [
        image for image in images
        if image["classification"] in {"extractable-sheet", "possible-sheet", "animation-sheet", "tileset"}
    ]
    sheet_candidates = sorted(sheet_candidates, key=lambda image: (image.get("componentCount", 0), image.get("width", 0) * image.get("height", 0)), reverse=True)
    issue_frames = [audit for audit in frame_audits if audit["issues"]]
    material_issue_frames = [
        audit for audit in issue_frames
        if any(issue != "content-touches-frame-edge" for issue in audit["issues"])
    ]
    lines = [
        "# RPG Asset Map",
        "",
        f"Generated: `{report['generatedAt']}`",
        "",
        "## Summary",
        "",
        f"- Images scanned: {summary['totalImages']}",
        f"- Images referenced by code: {summary['totalReferencedImages']}",
        f"- Likely sheets / tilesets: {summary['likelySheetCount']}",
        f"- Runtime frames audited: {summary['runtimeFrameCount']}",
        f"- Runtime frames with warnings: {summary['runtimeFrameIssueCount']}",
        f"- Runtime frames with material problems: {summary['runtimeFrameMaterialIssueCount']}",
        "",
        "## Classification Counts",
        "",
        "| Classification | Count |",
        "| --- | ---: |",
    ]
    for name, count in summary["classificationCounts"].items():
        lines.append(f"| `{name}` | {count} |")

    lines.extend([
        "",
        "## Largest Asset Packages",
        "",
        "| Package | Image count |",
        "| --- | ---: |",
    ])
    for name, count in summary["topPackages"].items():
        lines.append(f"| `{name}` | {count} |")

    lines.extend([
        "",
        "## Top Sheet Candidates",
        "",
        "These are the best candidates for proper visual extraction instead of equal grid slicing.",
        "",
        "| Source | Size | Components | Proposed name |",
        "| --- | ---: | ---: | --- |",
    ])
    for image in sheet_candidates[:80]:
        lines.append(
            f"| `{image['path']}` | {image.get('width', '?')}x{image.get('height', '?')} | "
            f"{image.get('componentCount', 0)} | {image.get('proposedName', '')} |"
        )

    lines.extend([
        "",
        "## Runtime Frame Material Problems",
        "",
        "These are high-priority frame problems: empty crops, slivers, out-of-bounds boxes, or sheet-size mismatches.",
        "",
        "| Frame | Source | Box | Issues |",
        "| --- | --- | ---: | --- |",
    ])
    if material_issue_frames:
        for audit in material_issue_frames:
            frame = audit["frame"]
            box = f"{frame['x']},{frame['y']} {frame['width']}x{frame['height']}"
            issues = ", ".join(f"`{issue}`" for issue in audit["issues"])
            lines.append(f"| `{audit['name']}` | `{audit['sourcePath']}` | {box} | {issues} |")
    else:
        lines.append("| None found |  |  |  |")

    lines.extend([
        "",
        "## Runtime Frame Edge Warnings",
        "",
        "A warning is not always a bug. UI panels and tiles often touch frame edges on purpose, but empty, sparse, or size-mismatched frames need review.",
        "",
        "| Frame | Source | Box | Issues |",
        "| --- | --- | ---: | --- |",
    ])
    for audit in issue_frames[:120]:
        frame = audit["frame"]
        box = f"{frame['x']},{frame['y']} {frame['width']}x{frame['height']}"
        issues = ", ".join(f"`{issue}`" for issue in audit["issues"])
        lines.append(f"| `{audit['name']}` | `{audit['sourcePath']}` | {box} | {issues} |")

    lines.extend([
        "",
        "## Next Use",
        "",
        "- Use `docs/rpg-asset-map.json` as the authoritative machine-readable scan.",
        "- Promote sheet components into curated assets only after visual/contact-sheet review.",
        "- Treat frames flagged `empty-frame`, `sliver-content`, or `frame-out-of-bounds` as high priority.",
    ])
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_csv(report: dict[str, Any], output_path: Path) -> None:
    referenced_assets = {reference["assetPath"] for reference in report["codeReferences"]}
    fieldnames = [
        "path",
        "proposedId",
        "proposedName",
        "package",
        "classification",
        "width",
        "height",
        "componentCount",
        "contentDensity",
        "referencedByCode",
        "tags",
    ]
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for image in report["images"]:
            writer.writerow({
                "path": image["path"],
                "proposedId": image["proposedId"],
                "proposedName": image["proposedName"],
                "package": image["package"],
                "classification": image["classification"],
                "width": image.get("width", ""),
                "height": image.get("height", ""),
                "componentCount": image.get("componentCount", ""),
                "contentDensity": image.get("contentDensity", ""),
                "referencedByCode": "yes" if image["path"] in referenced_assets else "no",
                "tags": ",".join(image.get("tags", [])),
            })


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan RPG assets by visible pixels.")
    parser.add_argument("--root", default=Path(__file__).resolve().parents[2].as_posix())
    parser.add_argument("--json", default="docs/rpg-asset-map.json")
    parser.add_argument("--markdown", default="docs/RPG_ASSET_MAP.md")
    parser.add_argument("--csv", default="docs/rpg-asset-index.csv")
    parser.add_argument("--asset-root", action="append", dest="asset_roots")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    asset_roots = args.asset_roots or DEFAULT_ASSET_ROOTS
    image_paths = iter_image_paths(root, asset_roots)
    images = [scan_image(path, root) for path in image_paths]
    sources, code_references = parse_required_sources(root)
    runtime_frames = parse_runtime_frames(root, sources)
    frame_audits = [audit_frame(root, frame) for frame in runtime_frames]
    report = {
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "assetRoots": asset_roots,
        "summary": summarize(images, frame_audits, code_references),
        "codeReferences": code_references,
        "runtimeFrames": [frame.__dict__ for frame in runtime_frames],
        "runtimeFrameAudits": frame_audits,
        "images": images,
    }

    json_path = root / args.json
    md_path = root / args.markdown
    csv_path = root / args.csv
    json_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.parent.mkdir(parents=True, exist_ok=True)
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    write_markdown(report, md_path)
    write_csv(report, csv_path)

    print(f"Scanned {report['summary']['totalImages']} images")
    print(f"Wrote {rel(json_path, root)}")
    print(f"Wrote {rel(md_path, root)}")
    print(f"Wrote {rel(csv_path, root)}")
    if report["summary"]["runtimeFrameIssueCount"]:
        print(f"Runtime frame warnings: {report['summary']['runtimeFrameIssueCount']}")
        print(f"Runtime frame material problems: {report['summary']['runtimeFrameMaterialIssueCount']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
