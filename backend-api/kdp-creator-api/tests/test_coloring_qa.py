"""Conversion QA unit tests — blank/solid guards, RGBA split, trim pixel sizes."""

from __future__ import annotations

import io
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.services.coloring import ColoringParamError, coloring_bitmap
from src.services.kdp_specs import PRINT_DPI, interior_page_size_pts

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURES = REPO_ROOT / "tests" / "fixtures" / "conversion"
GEN_SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "generate_conversion_fixtures.py"


def _ensure_fixtures() -> None:
    if (FIXTURES / "lineart_black_on_white.png").exists():
        return
    subprocess.check_call([sys.executable, str(GEN_SCRIPT)])


@pytest.fixture(scope="module", autouse=True)
def fixtures_ready():
    _ensure_fixtures()


def _ink_ratio(png_bytes: bytes) -> float:
    gray = np.array(Image.open(io.BytesIO(png_bytes)).convert("L"))
    return float(np.mean(gray < 128))


def _size(png_bytes: bytes) -> tuple[int, int]:
    img = Image.open(io.BytesIO(png_bytes))
    return img.size  # (w, h)


def _expected_px(trim: str, bleed: bool) -> tuple[int, int]:
    w_pt, h_pt = interior_page_size_pts(trim, with_bleed=bleed)
    return int(w_pt / 72 * PRINT_DPI), int(h_pt / 72 * PRINT_DPI)


def test_happy_path_lineart_not_blank_or_solid():
    src = (FIXTURES / "lineart_black_on_white.png").read_bytes()
    legacy = coloring_bitmap(src, "6x9", engine="legacy", threshold=127)
    enhanced = coloring_bitmap(src, "6x9", engine="enhanced", threshold="auto")
    for label, out in (("legacy", legacy), ("enhanced", enhanced)):
        ratio = _ink_ratio(out)
        assert 0.002 < ratio < 0.98, f"{label} ink_ratio={ratio} blank/solid"


def test_rgba_legacy_vs_enhanced_background():
    """Document the real bug: legacy does not flatten alpha (black behind transparency)."""
    src = (FIXTURES / "rgba_on_transparent.png").read_bytes()
    legacy = coloring_bitmap(src, "6x9", engine="legacy", threshold=127, with_bleed=True)
    enhanced = coloring_bitmap(src, "6x9", engine="enhanced", threshold="auto", with_bleed=True)

    g_leg = np.array(Image.open(io.BytesIO(legacy)).convert("L"))
    g_enh = np.array(Image.open(io.BytesIO(enhanced)).convert("L"))

    margin = 40
    h, w = g_leg.shape
    mask = np.ones_like(g_leg, dtype=bool)
    mask[margin : h - margin, margin : w - margin] = False

    legacy_margin_dark = int(np.sum(mask & (g_leg < 250)))
    enhanced_margin_dark = int(np.sum(mask & (g_enh < 250)))

    # Enhanced flattens onto white → pad stays white
    assert enhanced_margin_dark < 100, f"enhanced margin dark={enhanced_margin_dark}"
    # Legacy composites onto black → pad/halo is dark (assert the bug exists)
    assert legacy_margin_dark > 100, (
        f"expected legacy alpha black halo, got margin_dark={legacy_margin_dark}"
    )


def test_output_dimensions_6x9_bleed_and_no_bleed():
    src = (FIXTURES / "lineart_black_on_white.png").read_bytes()
    for bleed in (True, False):
        out = coloring_bitmap(src, "6x9", with_bleed=bleed, engine="legacy")
        w, h = _size(out)
        exp_w, exp_h = _expected_px("6x9", bleed)
        assert (w, h) == (exp_w, exp_h), f"bleed={bleed} got {w}x{h} expected {exp_w}x{exp_h}"


def test_tiny_32_upscales_to_trim():
    src = (FIXTURES / "tiny_32.png").read_bytes()
    out = coloring_bitmap(src, "6x9", with_bleed=True, engine="legacy")
    w, h = _size(out)
    exp_w, exp_h = _expected_px("6x9", True)
    assert (w, h) == (exp_w, exp_h)


def test_image_too_large_rejected():
    """50MP cap — create a modest oversize metadata claim via PIL array if memory allows.

    Uses a synthetic size just over the cap boundary by mocking through coloring's check.
    Full 50MP+ allocation is heavy; we assert ColoringParamError on a crafted large image
    only when env ALLOW_LARGE_IMAGE_TEST=1, otherwise skip.
    """
    if os.environ.get("ALLOW_LARGE_IMAGE_TEST") != "1":
        pytest.skip("Set ALLOW_LARGE_IMAGE_TEST=1 to allocate >50MP image")
    # ~7100x7100 ≈ 50.4MP
    img = Image.new("RGB", (7100, 7100), (255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    with pytest.raises(ColoringParamError) as exc:
        coloring_bitmap(buf.getvalue(), "6x9", engine="legacy")
    assert exc.value.code == "IMAGE_TOO_LARGE"


def test_filled_cartoon_often_high_ink_legacy():
    """Filled regions threshold to large black areas — regression signal, not a hard fail band."""
    src = (FIXTURES / "filled_cartoon.png").read_bytes()
    legacy = coloring_bitmap(src, "6x9", engine="legacy", threshold=127)
    ratio = _ink_ratio(legacy)
    # Soft assertion: filled cartoon should produce substantial ink (blobs)
    assert ratio > 0.05, f"expected filled blobs, ink={ratio}"
