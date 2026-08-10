"""Coloring-book line-art engines for Image→Coloring and Batch Coloring.

legacy: existing fixed-threshold OpenCV path (default; byte-stable for clients that omit engine).
enhanced: OpenCV port of kdp_converter knobs (detail / contrast / edges / auto-threshold).
Not a skimage/scipy verbatim port — behavioral target only.
"""

from __future__ import annotations

import io
from typing import Any, Union

import cv2
import numpy as np
from PIL import Image, ImageEnhance

from src.services.kdp_specs import PRINT_DPI, interior_page_size_pts

# Reject absurd uploads before decode/process (WS7-A). ~50MP covers typical phone photos.
MAX_SOURCE_PIXELS = 50_000_000
DETAIL_LEVELS = frozenset({"low", "medium", "high"})
EDGE_MODES = frozenset({"off", "mild", "strong"})
ENGINES = frozenset({"legacy", "enhanced"})

DETAIL_SIGMA = {"low": 2.0, "medium": 1.0, "high": 0.5}
EDGE_DILATE_ITERS = {"off": 0, "mild": 1, "strong": 2}


class ColoringParamError(ValueError):
    """Invalid coloring form/API params — map to HTTP 400."""

    def __init__(self, message: str, code: str = "INVALID_INPUT"):
        super().__init__(message)
        self.code = code


def _target_pixels(trim_size: str, with_bleed: bool) -> tuple[int, int]:
    target_width_pt, target_height_pt = interior_page_size_pts(trim_size, with_bleed=with_bleed)
    return (
        int(target_width_pt / 72 * PRINT_DPI),
        int(target_height_pt / 72 * PRINT_DPI),
    )


def _load_rgb(img_bytes: bytes, *, flatten_alpha: bool) -> Image.Image:
    image = Image.open(io.BytesIO(img_bytes))
    w, h = image.size
    if w * h > MAX_SOURCE_PIXELS:
        raise ColoringParamError(
            f"Image too large ({w}×{h}). Max {MAX_SOURCE_PIXELS} pixels.",
            "IMAGE_TOO_LARGE",
        )
    if flatten_alpha and image.mode in ("RGBA", "LA", "P"):
        background = Image.new("RGB", image.size, (255, 255, 255))
        rgba = image.convert("RGBA")
        background.paste(rgba, mask=rgba.split()[-1])
        return background
    return image.convert("RGB")


def _prepare_canvas(image: Image.Image, trim_size: str, with_bleed: bool) -> Image.Image:
    """Aspect-fit + white pad to KDP trim pixels (Suite framing, not stretch-to-box)."""
    target_width_px, target_height_px = _target_pixels(trim_size, with_bleed)
    img_width, img_height = image.size
    aspect_ratio = img_width / img_height
    target_aspect = target_width_px / target_height_px

    if aspect_ratio > target_aspect:
        new_width = target_width_px
        new_height = int(new_width / aspect_ratio)
    else:
        new_height = target_height_px
        new_width = int(new_height * aspect_ratio)
    image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

    padded = Image.new("RGB", (target_width_px, target_height_px), (255, 255, 255))
    paste_x = (target_width_px - image.width) // 2
    paste_y = (target_height_px - image.height) // 2
    padded.paste(image, (paste_x, paste_y))
    return padded


def _png_bytes_from_gray_u8(gray: np.ndarray) -> bytes:
    output_buffer = io.BytesIO()
    Image.fromarray(gray).save(output_buffer, format="PNG")
    return output_buffer.getvalue()


def legacy_coloring_bitmap(
    img_bytes: bytes,
    trim_size: str,
    threshold: int = 127,
    with_bleed: bool = True,
) -> bytes:
    """Current Suite path: grayscale + fixed binary threshold."""
    image = _load_rgb(img_bytes, flatten_alpha=False)
    padded = _prepare_canvas(image, trim_size, with_bleed)
    cv_image = cv2.cvtColor(np.array(padded), cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, int(threshold), 255, cv2.THRESH_BINARY)
    return _png_bytes_from_gray_u8(binary)


def _remove_small_objects(mask: np.ndarray, min_size: int = 5) -> np.ndarray:
    """mask: bool, True = keep (line). Drop connected components smaller than min_size."""
    u8 = mask.astype(np.uint8)
    num, labels, stats, _ = cv2.connectedComponentsWithStats(u8, connectivity=8)
    out = np.zeros_like(u8)
    for label in range(1, num):
        if stats[label, cv2.CC_STAT_AREA] >= min_size:
            out[labels == label] = 1
    return out.astype(bool)


def _remove_small_holes(mask: np.ndarray, area_threshold: int = 10) -> np.ndarray:
    """Fill small False holes inside True regions."""
    inverted = ~mask
    cleaned_inv = _remove_small_objects(inverted, min_size=area_threshold)
    # Components that were "small holes" are removed from inverted → become False in inverted → True in result
    # Larger background stays True in inverted → False in result
    return ~cleaned_inv


def enhanced_coloring_bitmap(
    img_bytes: bytes,
    trim_size: str,
    *,
    with_bleed: bool = True,
    detail_level: str = "medium",
    threshold: Union[str, int] = "auto",
    contrast: int = 0,
    edge_enhancement: str = "mild",
) -> bytes:
    """OpenCV reimplementation of kdp_converter line-art knobs; Suite framing retained."""
    detail_level = (detail_level or "medium").lower()
    edge_enhancement = (edge_enhancement or "mild").lower()
    if detail_level not in DETAIL_LEVELS:
        raise ColoringParamError("Invalid detail_level", "INVALID_DETAIL_LEVEL")
    if edge_enhancement not in EDGE_MODES:
        raise ColoringParamError("Invalid edge_enhancement", "INVALID_EDGE_ENHANCEMENT")
    contrast = int(max(-50, min(50, int(contrast))))

    image = _load_rgb(img_bytes, flatten_alpha=True)
    padded = _prepare_canvas(image, trim_size, with_bleed)
    gray = cv2.cvtColor(np.array(padded), cv2.COLOR_RGB2GRAY)
    equalized = cv2.equalizeHist(gray)

    working = equalized
    if contrast != 0:
        pil = Image.fromarray(working)
        factor = 1 + (contrast / 100.0)
        working = np.array(ImageEnhance.Contrast(pil).enhance(factor), dtype=np.uint8)

    sigma = DETAIL_SIGMA[detail_level]
    blurred = cv2.GaussianBlur(working.astype(np.float64), (0, 0), sigmaX=sigma)

    gx = cv2.Sobel(blurred, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(blurred, cv2.CV_64F, 0, 1, ksize=3)
    mag = np.hypot(gx, gy)
    mag_norm = mag / (float(mag.max()) + 1e-8)
    edge_bool = mag_norm > 0.1
    dilate_iters = EDGE_DILATE_ITERS[edge_enhancement]
    if dilate_iters > 0:
        kernel = np.ones((3, 3), np.uint8)
        edge_bool = cv2.dilate(edge_bool.astype(np.uint8), kernel, iterations=dilate_iters).astype(bool)

    if threshold == "auto" or (isinstance(threshold, str) and threshold.lower() == "auto"):
        otsu_in = working.astype(np.uint8)
        threshold_value, _ = cv2.threshold(otsu_in, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        threshold_value = float(threshold_value)
    else:
        threshold_value = float(max(0, min(255, int(threshold))))

    # Dark pixels → line (True)
    binary = working.astype(np.float64) < threshold_value
    binary = _remove_small_objects(binary, min_size=5)
    binary = _remove_small_holes(binary, area_threshold=10)
    result = binary | edge_bool

    # True (line) → 0 black; False → 255 white
    out = ((1 - result.astype(np.uint8)) * 255).astype(np.uint8)
    return _png_bytes_from_gray_u8(out)


def parse_coloring_form(form: Any) -> dict:
    """Parse additive coloring form fields. Defaults yield legacy when engine omitted."""
    engine = (form.get("engine") or "legacy").strip().lower()
    if engine not in ENGINES:
        raise ColoringParamError("engine must be 'legacy' or 'enhanced'", "INVALID_ENGINE")

    detail_level = (form.get("detail_level") or "medium").strip().lower()
    if detail_level not in DETAIL_LEVELS:
        raise ColoringParamError(
            "detail_level must be low, medium, or high",
            "INVALID_DETAIL_LEVEL",
        )

    edge_enhancement = (form.get("edge_enhancement") or "mild").strip().lower()
    if edge_enhancement not in EDGE_MODES:
        raise ColoringParamError(
            "edge_enhancement must be off, mild, or strong",
            "INVALID_EDGE_ENHANCEMENT",
        )

    raw_contrast = form.get("contrast", "0")
    try:
        contrast = int(raw_contrast if raw_contrast not in (None, "") else 0)
    except (TypeError, ValueError) as exc:
        raise ColoringParamError("contrast must be an integer", "INVALID_CONTRAST") from exc
    if contrast < -50 or contrast > 50:
        raise ColoringParamError("contrast must be between -50 and 50", "INVALID_CONTRAST")

    raw_threshold = form.get("threshold")
    if engine == "enhanced":
        if raw_threshold is None or str(raw_threshold).strip() == "" or str(raw_threshold).strip().lower() == "auto":
            threshold: Union[str, int] = "auto"
        else:
            try:
                threshold = int(str(raw_threshold).strip())
            except ValueError as exc:
                raise ColoringParamError("threshold must be 'auto' or 0–255", "INVALID_THRESHOLD") from exc
            if threshold < 0 or threshold > 255:
                raise ColoringParamError("threshold must be 0–255", "INVALID_THRESHOLD")
    else:
        if raw_threshold is None or str(raw_threshold).strip() == "":
            threshold = 127
        elif str(raw_threshold).strip().lower() == "auto":
            raise ColoringParamError(
                "threshold 'auto' requires engine=enhanced",
                "INVALID_THRESHOLD",
            )
        else:
            try:
                threshold = int(str(raw_threshold).strip())
            except ValueError as exc:
                raise ColoringParamError("threshold must be 0–255", "INVALID_THRESHOLD") from exc
            if threshold < 0 or threshold > 255:
                raise ColoringParamError("threshold must be 0–255", "INVALID_THRESHOLD")

    return {
        "engine": engine,
        "detail_level": detail_level,
        "edge_enhancement": edge_enhancement,
        "contrast": contrast,
        "threshold": threshold,
    }


def coloring_bitmap(
    img_bytes: bytes,
    trim_size: str,
    *,
    with_bleed: bool = True,
    engine: str = "legacy",
    threshold: Union[str, int] = 127,
    detail_level: str = "medium",
    contrast: int = 0,
    edge_enhancement: str = "mild",
) -> bytes:
    """Dispatcher: default engine=legacy preserves prior output path."""
    engine = (engine or "legacy").lower()
    if engine == "enhanced":
        return enhanced_coloring_bitmap(
            img_bytes,
            trim_size,
            with_bleed=with_bleed,
            detail_level=detail_level,
            threshold=threshold,
            contrast=contrast,
            edge_enhancement=edge_enhancement,
        )
    if engine != "legacy":
        raise ColoringParamError("engine must be 'legacy' or 'enhanced'", "INVALID_ENGINE")
    return legacy_coloring_bitmap(
        img_bytes,
        trim_size,
        threshold=int(threshold) if threshold != "auto" else 127,
        with_bleed=with_bleed,
    )
