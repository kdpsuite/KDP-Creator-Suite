#!/usr/bin/env python3
"""Run coloring/PDF conversion QA matrix locally (no JWT/quota).

Writes gitignored tests/qa-output/ with bitmaps, PDF summaries, and index.html.
"""

from __future__ import annotations

import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from pypdf import PdfReader, PdfWriter, Transformation

# API package root
API_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_ROOT))

from src.services.coloring import coloring_bitmap  # noqa: E402
from src.services.kdp_specs import PRINT_DPI, interior_page_size_pts  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURES = REPO_ROOT / "tests" / "fixtures" / "conversion"
OUT = REPO_ROOT / "tests" / "qa-output"

TRIMS = ("5x8", "5.5x8.5", "6x9", "8.5x11")
SWEEP_SOURCES = ("lineart_black_on_white.png", "photo_gradient.png")


def expected_pixels(trim_size: str, with_bleed: bool) -> tuple[int, int]:
    w_pt, h_pt = interior_page_size_pts(trim_size, with_bleed=with_bleed)
    return int(w_pt / 72 * PRINT_DPI), int(h_pt / 72 * PRINT_DPI)


def ink_ratio(gray: np.ndarray) -> float:
    """Fraction of pixels that are ink (dark)."""
    return float(np.mean(gray < 128))


def load_gray(png_bytes: bytes) -> np.ndarray:
    return np.array(Image.open(io.BytesIO(png_bytes)).convert("L"))


def flag_blank_or_solid(ratio: float) -> list[str]:
    flags = []
    if ratio < 0.002:
        flags.append("BLANK_WHITE")
    if ratio > 0.98:
        flags.append("SOLID_BLACK")
    return flags


def margin_dark_pixels(gray: np.ndarray, margin: int = 40) -> int:
    """Count non-white pixels in outer margin (legacy alpha halo detector)."""
    h, w = gray.shape
    mask = np.ones_like(gray, dtype=bool)
    mask[margin : h - margin, margin : w - margin] = False
    return int(np.sum(mask & (gray < 250)))


def run_coloring_defaults() -> list[dict]:
    results = []
    color_dir = OUT / "coloring"
    color_dir.mkdir(parents=True, exist_ok=True)

    manifest = json.loads((FIXTURES / "manifest.json").read_text())
    image_files = [m["file"] for m in manifest if m["tool"] == "coloring"]

    for name in image_files:
        src = FIXTURES / name
        if not src.exists():
            results.append({"source": name, "error": "missing fixture"})
            continue
        img_bytes = src.read_bytes()
        stem = src.stem

        legacy = coloring_bitmap(img_bytes, "6x9", with_bleed=True, engine="legacy", threshold=127)
        enhanced = coloring_bitmap(
            img_bytes,
            "6x9",
            with_bleed=True,
            engine="enhanced",
            threshold="auto",
            detail_level="medium",
            contrast=0,
            edge_enhancement="mild",
        )

        leg_path = color_dir / f"{stem}__legacy_t127.png"
        enh_path = color_dir / f"{stem}__enhanced_auto.png"
        leg_path.write_bytes(legacy)
        enh_path.write_bytes(enhanced)

        g_leg = load_gray(legacy)
        g_enh = load_gray(enhanced)
        r_leg = ink_ratio(g_leg)
        r_enh = ink_ratio(g_enh)
        exp_w, exp_h = expected_pixels("6x9", True)

        flags = []
        flags.extend([f"legacy_{f}" for f in flag_blank_or_solid(r_leg)])
        flags.extend([f"enhanced_{f}" for f in flag_blank_or_solid(r_enh)])
        if abs(r_leg - r_enh) > 0.35:
            flags.append("ENGINE_INK_DIVERGENCE")
        if g_leg.shape[1] != exp_w or g_leg.shape[0] != exp_h:
            flags.append(f"SIZE_MISMATCH_legacy_{g_leg.shape[1]}x{g_leg.shape[0]}_expected_{exp_w}x{exp_h}")
        if g_enh.shape[1] != exp_w or g_enh.shape[0] != exp_h:
            flags.append(f"SIZE_MISMATCH_enhanced_{g_enh.shape[1]}x{g_enh.shape[0]}_expected_{exp_w}x{exp_h}")
        if name == "rgba_on_transparent.png":
            margin_dark = margin_dark_pixels(g_leg)
            if margin_dark > 100:
                flags.append(f"LEGACY_ALPHA_BLACK_HALO_margin_dark={margin_dark}")
            margin_enh = margin_dark_pixels(g_enh)
            if margin_enh > 100:
                flags.append(f"ENHANCED_MARGIN_DARK={margin_enh}")
        if "landscape" in name or "square" in name:
            # Document letterbox: top/bottom or side rows nearly all white
            top_row = float(np.mean(g_enh[0:20, :] > 250))
            if top_row > 0.95:
                flags.append("LETTERBOX_DOCUMENTED")

        # Copy source thumbnail for gallery
        try:
            src_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            src_img.thumbnail((400, 400))
            thumb = color_dir / f"{stem}__source.jpg"
            src_img.save(thumb, quality=80)
            thumb_rel = thumb.name
        except Exception:
            thumb_rel = None

        results.append(
            {
                "source": name,
                "legacy_ink": round(r_leg, 4),
                "enhanced_ink": round(r_enh, 4),
                "legacy_file": leg_path.name,
                "enhanced_file": enh_path.name,
                "source_thumb": thumb_rel,
                "size": f"{g_leg.shape[1]}x{g_leg.shape[0]}",
                "flags": flags,
            }
        )
    return results


def run_knob_sweep() -> list[dict]:
    sweep_dir = OUT / "sweep"
    sweep_dir.mkdir(parents=True, exist_ok=True)
    results = []

    for name in SWEEP_SOURCES:
        src = FIXTURES / name
        if not src.exists():
            continue
        img_bytes = src.read_bytes()
        stem = src.stem

        # Trim + bleed
        for trim in TRIMS:
            for bleed in (True, False):
                out = coloring_bitmap(
                    img_bytes, trim, with_bleed=bleed, engine="legacy", threshold=127
                )
                gray = load_gray(out)
                exp = expected_pixels(trim, bleed)
                label = f"{stem}__trim_{trim}_bleed_{int(bleed)}"
                path = sweep_dir / f"{label}.png"
                path.write_bytes(out)
                flags = []
                if gray.shape[1] != exp[0] or gray.shape[0] != exp[1]:
                    flags.append(f"SIZE_MISMATCH_got_{gray.shape[1]}x{gray.shape[0]}_exp_{exp[0]}x{exp[1]}")
                results.append(
                    {
                        "kind": "trim_bleed",
                        "source": name,
                        "params": {"trim": trim, "bleed": bleed, "engine": "legacy"},
                        "file": path.name,
                        "ink": round(ink_ratio(gray), 4),
                        "flags": flags,
                    }
                )

        # Legacy thresholds
        for thr in (64, 127, 200):
            out = coloring_bitmap(img_bytes, "6x9", with_bleed=True, engine="legacy", threshold=thr)
            gray = load_gray(out)
            path = sweep_dir / f"{stem}__legacy_t{thr}.png"
            path.write_bytes(out)
            flags = [f"legacy_{f}" for f in flag_blank_or_solid(ink_ratio(gray))]
            results.append(
                {
                    "kind": "threshold",
                    "source": name,
                    "params": {"engine": "legacy", "threshold": thr},
                    "file": path.name,
                    "ink": round(ink_ratio(gray), 4),
                    "flags": flags,
                }
            )

        # Enhanced knobs
        for detail in ("low", "medium", "high"):
            for edge in ("off", "mild", "strong"):
                for contrast in (-50, 0, 50):
                    out = coloring_bitmap(
                        img_bytes,
                        "6x9",
                        with_bleed=True,
                        engine="enhanced",
                        threshold="auto",
                        detail_level=detail,
                        edge_enhancement=edge,
                        contrast=contrast,
                    )
                    gray = load_gray(out)
                    path = sweep_dir / f"{stem}__enh_d{detail}_e{edge}_c{contrast}.png"
                    path.write_bytes(out)
                    flags = [f"enhanced_{f}" for f in flag_blank_or_solid(ink_ratio(gray))]
                    results.append(
                        {
                            "kind": "enhanced_knobs",
                            "source": name,
                            "params": {
                                "detail": detail,
                                "edge": edge,
                                "contrast": contrast,
                            },
                            "file": path.name,
                            "ink": round(ink_ratio(gray), 4),
                            "flags": flags,
                        }
                    )
    return results


def _fit_page_to_target(page, target_w, target_h):
    src_w = float(page.mediabox.width)
    src_h = float(page.mediabox.height)
    if src_w <= 0 or src_h <= 0:
        return page
    scale = min(target_w / src_w, target_h / src_h)
    writer = PdfWriter()
    blank = writer.add_blank_page(width=target_w, height=target_h)
    tx = (target_w - src_w * scale) / 2
    ty = (target_h - src_h * scale) / 2
    blank.merge_transformed_page(
        page,
        Transformation().scale(scale, scale).translate(tx, ty),
    )
    return blank


def format_pdf_like_api(pdf_bytes: bytes, trim_size: str, with_bleed: bool = True) -> tuple[bytes, int]:
    """Mirror format-kdp print path: fit + pad odd→even + min 24 pages."""
    from src.services.kdp_specs import MIN_PAGE_COUNT

    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    w_pt, h_pt = interior_page_size_pts(trim_size, with_bleed=with_bleed)
    for page in reader.pages:
        writer.add_page(_fit_page_to_target(page, w_pt, h_pt))
    while len(writer.pages) % 2 != 0:
        writer.add_blank_page(width=w_pt, height=h_pt)
    while len(writer.pages) < MIN_PAGE_COUNT:
        writer.add_blank_page(width=w_pt, height=h_pt)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue(), len(writer.pages)


def run_pdf_qa() -> list[dict]:
    pdf_dir = OUT / "pdf"
    pdf_dir.mkdir(parents=True, exist_ok=True)
    results = []
    manifest = json.loads((FIXTURES / "manifest.json").read_text())
    pdf_files = [m["file"] for m in manifest if m["tool"] == "format-kdp"]

    for name in pdf_files:
        src = FIXTURES / name
        if not src.exists():
            continue
        pdf_bytes = src.read_bytes()
        for trim in ("6x9", "8.5x11"):
            out_bytes, page_count = format_pdf_like_api(pdf_bytes, trim, with_bleed=True)
            out_path = pdf_dir / f"{Path(name).stem}__{trim}_bleed.pdf"
            out_path.write_bytes(out_bytes)
            reader = PdfReader(io.BytesIO(out_bytes))
            page0 = reader.pages[0]
            w = float(page0.mediabox.width)
            h = float(page0.mediabox.height)
            exp_w, exp_h = interior_page_size_pts(trim, with_bleed=True)
            flags = []
            if page_count < 24:
                flags.append(f"PAGE_COUNT_LT_24_{page_count}")
            if page_count % 2 != 0:
                flags.append(f"ODD_PAGE_COUNT_{page_count}")
            if abs(w - exp_w) > 0.05 * 72 or abs(h - exp_h) > 0.05 * 72:
                flags.append(f"SIZE_MISMATCH_{w:.1f}x{h:.1f}_exp_{exp_w:.1f}x{exp_h:.1f}")
            results.append(
                {
                    "source": name,
                    "trim": trim,
                    "page_count": page_count,
                    "page_size_pt": f"{w:.1f}x{h:.1f}",
                    "file": out_path.name,
                    "flags": flags,
                }
            )
    return results


def write_gallery(coloring: list[dict], sweep: list[dict], pdfs: list[dict]) -> None:
    flagged = [r for r in coloring if r.get("flags")] + [r for r in sweep if r.get("flags")] + [
        r for r in pdfs if r.get("flags")
    ]

    rows = []
    for r in coloring:
        flags_html = ", ".join(r.get("flags") or []) or "ok"
        flag_class = "flag" if r.get("flags") else "ok"
        thumb = r.get("source_thumb") or ""
        thumb_img = f'<img src="coloring/{thumb}" alt="source">' if thumb else ""
        rows.append(
            f"""
            <tr class="{flag_class}">
              <td>{r['source']}<br>{thumb_img}</td>
              <td>ink={r.get('legacy_ink')}<br><img src="coloring/{r.get('legacy_file')}" alt="legacy"></td>
              <td>ink={r.get('enhanced_ink')}<br><img src="coloring/{r.get('enhanced_file')}" alt="enhanced"></td>
              <td>{r.get('size')}<br><code>{flags_html}</code></td>
            </tr>
            """
        )

    sweep_flagged = [r for r in sweep if r.get("flags")]
    sweep_rows = "".join(
        f"<li><code>{r['file']}</code> ink={r['ink']} params={r['params']} "
        f"<strong>{', '.join(r['flags'])}</strong></li>"
        for r in sweep_flagged[:80]
    ) or "<li>No flagged sweep rows</li>"

    pdf_rows = "".join(
        f"<li>{r['source']} → {r['trim']}: pages={r['page_count']} size={r['page_size_pt']} "
        f"flags=<code>{', '.join(r['flags']) or 'ok'}</code></li>"
        for r in pdfs
    )

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>KDP Conversion QA</title>
<style>
body {{ font-family: system-ui, sans-serif; margin: 1.5rem; background: #111; color: #eee; }}
table {{ border-collapse: collapse; width: 100%; }}
td, th {{ border: 1px solid #444; padding: 8px; vertical-align: top; }}
img {{ max-width: 280px; max-height: 360px; background: #fff; }}
tr.flag {{ background: #3a1515; }}
tr.ok {{ background: #152015; }}
code {{ color: #f8a; }}
h1,h2 {{ color: #fff; }}
.summary {{ padding: 1rem; background: #222; margin-bottom: 1rem; }}
</style></head><body>
<h1>KDP Conversion QA Gallery</h1>
<div class="summary">
  <p>Coloring sources: {len(coloring)} | Sweep rows: {len(sweep)} | PDF runs: {len(pdfs)}</p>
  <p><strong>Flagged items: {len(flagged)}</strong></p>
</div>
<h2>Coloring defaults (6x9 bleed) — legacy_t127 vs enhanced_auto</h2>
<table>
<tr><th>Source</th><th>Legacy</th><th>Enhanced</th><th>Size / Flags</th></tr>
{''.join(rows)}
</table>
<h2>Knob sweep — flagged only (cap 80)</h2>
<ul>{sweep_rows}</ul>
<h2>PDF format-kdp (print bleed pad)</h2>
<ul>{pdf_rows}</ul>
</body></html>
"""
    (OUT / "index.html").write_text(html)

    summary = {
        "coloring_count": len(coloring),
        "sweep_count": len(sweep),
        "pdf_count": len(pdfs),
        "flagged_count": len(flagged),
        "coloring": coloring,
        "sweep_flagged": [r for r in sweep if r.get("flags")],
        "pdfs": pdfs,
    }
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")


def main() -> int:
    if not (FIXTURES / "manifest.json").exists():
        print("Fixtures missing. Run generate_conversion_fixtures.py first.", file=sys.stderr)
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    print("Running coloring defaults…")
    coloring = run_coloring_defaults()
    print("Running knob sweep…")
    sweep = run_knob_sweep()
    print("Running PDF QA…")
    pdfs = run_pdf_qa()
    write_gallery(coloring, sweep, pdfs)
    flagged = sum(1 for r in coloring if r.get("flags")) + sum(1 for r in sweep if r.get("flags"))
    print(f"Done. Gallery: {OUT / 'index.html'}")
    print(f"Flagged coloring+sweep rows: {flagged}")
    for r in coloring:
        if r.get("flags"):
            print(f"  FLAG {r['source']}: {', '.join(r['flags'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
