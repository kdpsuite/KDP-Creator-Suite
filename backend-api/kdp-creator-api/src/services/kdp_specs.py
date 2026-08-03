"""Shared Amazon KDP paperback print specifications.

Sources (official KDP help):
- Paperback Submission Guidelines (G201857950)
- Create a Paperback Cover (G201953020)
- Print Options (G201834180)
- Save Your Manuscript File (G202145060)
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

PRINT_DPI = 300
BLEED_IN = 0.125
MIN_PAGE_COUNT = 24
SPINE_TEXT_MIN_PAGES = 79
BARCODE_W_IN = 2.0
BARCODE_H_IN = 1.2
BARCODE_SAFE_FROM_BOTTOM_IN = 0.25
BARCODE_SAFE_FROM_SPINE_IN = 0.25
COVER_SAFE_INSET_IN = 0.125

# Trim sizes used by this product (width x height inches)
KDP_TRIM_SIZES: dict[str, dict[str, float]] = {
    "5x8": {"width": 5.0, "height": 8.0},
    "5.5x8.5": {"width": 5.5, "height": 8.5},
    "6x9": {"width": 6.0, "height": 9.0},
    "8.5x11": {"width": 8.5, "height": 11.0},
}

# Spine thickness factors (inches per page) — Create a Paperback Cover
SPINE_FACTORS: dict[str, float] = {
    "bw_white": 0.002252,
    "bw_cream": 0.0025,
    "standard_color_white": 0.002252,
    "premium_color_white": 0.002347,
}

# Max page counts by trim + print profile (Paperback Submission Guidelines)
# Values for supported trims only.
MAX_PAGES: dict[str, dict[str, int]] = {
    "5x8": {
        "bw_white": 828,
        "bw_cream": 776,
        "standard_color_white": 600,
        "premium_color_white": 828,
    },
    "5.5x8.5": {
        "bw_white": 828,
        "bw_cream": 776,
        "standard_color_white": 600,
        "premium_color_white": 828,
    },
    "6x9": {
        "bw_white": 828,
        "bw_cream": 776,
        "standard_color_white": 600,
        "premium_color_white": 828,
    },
    "8.5x11": {
        "bw_white": 828,
        "bw_cream": 776,
        "standard_color_white": 600,
        "premium_color_white": 828,
    },
}

# Standard color minimum page count
STANDARD_COLOR_MIN_PAGES = 72

PRINT_PROFILES = (
    "bw_white",
    "bw_cream",
    "standard_color_white",
    "premium_color_white",
)

MARGIN_TABLE = (
    # (max_pages_inclusive, inside, outside_no_bleed, outside_with_bleed)
    (150, 0.375, 0.25, 0.375),
    (300, 0.5, 0.25, 0.375),
    (500, 0.625, 0.25, 0.375),
    (700, 0.75, 0.25, 0.375),
    (828, 0.875, 0.25, 0.375),
)


@dataclass(frozen=True)
class TrimSize:
    key: str
    width: float
    height: float


@dataclass(frozen=True)
class Margins:
    inside: float
    outside: float
    top: float
    bottom: float
    with_bleed: bool


@dataclass(frozen=True)
class InteriorPageSize:
    width: float
    height: float
    trim_width: float
    trim_height: float
    with_bleed: bool


@dataclass(frozen=True)
class CoverDimensions:
    width: float
    height: float
    spine_width: float
    trim_width: float
    trim_height: float
    bleed: float
    page_count: int
    allow_spine_text: bool


class KdpSpecError(ValueError):
    """Invalid KDP print option combination."""


def list_trim_sizes() -> list[dict[str, Any]]:
    return [
        {"key": key, "width": dims["width"], "height": dims["height"]}
        for key, dims in KDP_TRIM_SIZES.items()
    ]


def get_trim(trim_size: str) -> TrimSize:
    if trim_size not in KDP_TRIM_SIZES:
        raise KdpSpecError(
            f"Unsupported trim size '{trim_size}'. "
            f"Supported: {', '.join(KDP_TRIM_SIZES)}"
        )
    dims = KDP_TRIM_SIZES[trim_size]
    return TrimSize(key=trim_size, width=dims["width"], height=dims["height"])


def normalize_print_profile(ink: str | None = None, paper: str | None = None, profile: str | None = None) -> str:
    if profile:
        if profile not in PRINT_PROFILES:
            raise KdpSpecError(f"Unsupported print profile '{profile}'")
        return profile

    ink_norm = (ink or "bw").strip().lower().replace("-", "_").replace(" ", "_")
    paper_norm = (paper or "white").strip().lower()

    if ink_norm in ("bw", "black", "black_white", "black_and_white"):
        if paper_norm == "cream":
            return "bw_cream"
        return "bw_white"
    if ink_norm in ("standard_color", "standard"):
        return "standard_color_white"
    if ink_norm in ("premium_color", "premium", "color"):
        return "premium_color_white"
    raise KdpSpecError(f"Unsupported ink/paper combination: ink={ink}, paper={paper}")


def validate_page_count(page_count: int, trim_size: str, print_profile: str) -> int:
    if not isinstance(page_count, int) or page_count < 1:
        raise KdpSpecError("page_count must be a positive integer")

    get_trim(trim_size)
    if print_profile not in PRINT_PROFILES:
        raise KdpSpecError(f"Unsupported print profile '{print_profile}'")

    min_pages = STANDARD_COLOR_MIN_PAGES if print_profile == "standard_color_white" else MIN_PAGE_COUNT
    max_pages = MAX_PAGES[trim_size][print_profile]

    if page_count < min_pages:
        raise KdpSpecError(
            f"Page count {page_count} is below KDP minimum {min_pages} "
            f"for profile {print_profile}"
        )
    if page_count > max_pages:
        raise KdpSpecError(
            f"Page count {page_count} exceeds KDP maximum {max_pages} "
            f"for {trim_size} / {print_profile}"
        )
    return page_count


def even_page_count(page_count: int) -> int:
    """KDP rounds odd manuscript page counts up to the next even number."""
    if page_count < 1:
        raise KdpSpecError("page_count must be >= 1")
    return page_count if page_count % 2 == 0 else page_count + 1


def clamp_to_valid_page_count(page_count: int, trim_size: str, print_profile: str) -> int:
    """Round up to even, then clamp into the valid range for the profile."""
    get_trim(trim_size)
    if print_profile not in PRINT_PROFILES:
        raise KdpSpecError(f"Unsupported print profile '{print_profile}'")

    min_pages = STANDARD_COLOR_MIN_PAGES if print_profile == "standard_color_white" else MIN_PAGE_COUNT
    max_pages = MAX_PAGES[trim_size][print_profile]
    target = even_page_count(max(page_count, min_pages))
    if target > max_pages:
        # Max is always even in the published tables for our profiles.
        target = max_pages if max_pages % 2 == 0 else max_pages - 1
    validate_page_count(target, trim_size, print_profile)
    return target


def get_margins(page_count: int, with_bleed: bool = False) -> Margins:
    if page_count < 1:
        raise KdpSpecError("page_count must be >= 1")

    for max_pages, inside, outside_no_bleed, outside_with_bleed in MARGIN_TABLE:
        if page_count <= max_pages:
            outside = outside_with_bleed if with_bleed else outside_no_bleed
            # Top/bottom: use outside (bleed-aware) as minimum safe edge.
            return Margins(
                inside=inside,
                outside=outside,
                top=outside,
                bottom=outside,
                with_bleed=with_bleed,
            )
    raise KdpSpecError(f"No margin table entry for page_count={page_count}")


def interior_page_size(trim_size: str, with_bleed: bool = False) -> InteriorPageSize:
    """Interior PDF page size.

    With bleed: width = trim_w + 0.125, height = trim_h + 0.25
    (bleed on outer, top, and bottom edges — not the bind edge).
    """
    trim = get_trim(trim_size)
    if with_bleed:
        return InteriorPageSize(
            width=trim.width + BLEED_IN,
            height=trim.height + (BLEED_IN * 2),
            trim_width=trim.width,
            trim_height=trim.height,
            with_bleed=True,
        )
    return InteriorPageSize(
        width=trim.width,
        height=trim.height,
        trim_width=trim.width,
        trim_height=trim.height,
        with_bleed=False,
    )


def interior_page_size_pts(trim_size: str, with_bleed: bool = False) -> tuple[float, float]:
    size = interior_page_size(trim_size, with_bleed=with_bleed)
    return size.width * 72.0, size.height * 72.0


def spine_width_inches(page_count: int, print_profile: str) -> float:
    if print_profile not in SPINE_FACTORS:
        raise KdpSpecError(f"Unsupported print profile '{print_profile}'")
    if page_count < 1:
        raise KdpSpecError("page_count must be >= 1")
    return page_count * SPINE_FACTORS[print_profile]


def cover_dimensions(trim_size: str, page_count: int, print_profile: str) -> CoverDimensions:
    """Full-wrap paperback cover including 0.125\" bleed on all outer edges."""
    validated = validate_page_count(page_count, trim_size, print_profile)
    trim = get_trim(trim_size)
    spine = spine_width_inches(validated, print_profile)
    bleed = BLEED_IN
    width = bleed + trim.width + spine + trim.width + bleed
    height = bleed + trim.height + bleed
    return CoverDimensions(
        width=width,
        height=height,
        spine_width=spine,
        trim_width=trim.width,
        trim_height=trim.height,
        bleed=bleed,
        page_count=validated,
        allow_spine_text=validated >= SPINE_TEXT_MIN_PAGES,
    )


def cover_dimensions_pts(trim_size: str, page_count: int, print_profile: str) -> tuple[float, float, float]:
    dims = cover_dimensions(trim_size, page_count, print_profile)
    return dims.width * 72.0, dims.height * 72.0, dims.spine_width * 72.0


def overlay_zones(
    trim_size: str,
    with_bleed: bool = True,
    page_count: int = 24,
    page_side: str = "right",
) -> dict[str, Any]:
    """Percentage rects for UI overlay relative to the full interior page.

    page_side: 'right' (recto / odd) has outside on the right; 'left' (verso) has outside on the left.
    """
    page = interior_page_size(trim_size, with_bleed=with_bleed)
    margins = get_margins(page_count, with_bleed=with_bleed)
    page_w = page.width
    page_h = page.height

    if with_bleed:
        # Bleed is on outer + top + bottom. Bind edge has no bleed.
        if page_side == "right":
            trim_left = 0.0
            trim_right = BLEED_IN
        else:
            trim_left = BLEED_IN
            trim_right = 0.0
        trim_top = BLEED_IN
        trim_bottom = BLEED_IN
    else:
        trim_left = trim_right = trim_top = trim_bottom = 0.0

    trim_rect = {
        "top": (trim_top / page_h) * 100,
        "left": (trim_left / page_w) * 100,
        "width": (page.trim_width / page_w) * 100,
        "height": (page.trim_height / page_h) * 100,
    }

    if page_side == "right":
        inside_in = margins.inside
        outside_in = margins.outside
        safe_left_in = trim_left + inside_in
        safe_right_in = trim_right + outside_in
    else:
        inside_in = margins.inside
        outside_in = margins.outside
        safe_left_in = trim_left + outside_in
        safe_right_in = trim_right + inside_in

    safe_top_in = trim_top + margins.top
    safe_bottom_in = trim_bottom + margins.bottom
    safe_width_in = page_w - safe_left_in - safe_right_in
    safe_height_in = page_h - safe_top_in - safe_bottom_in

    safe_rect = {
        "top": (safe_top_in / page_h) * 100,
        "left": (safe_left_in / page_w) * 100,
        "width": (safe_width_in / page_w) * 100,
        "height": (safe_height_in / page_h) * 100,
    }

    return {
        "trim": trim_rect,
        "safe": safe_rect,
        "trimLabel": f"{page.trim_width:g} × {page.trim_height:g} in",
        "margins": asdict(margins),
        "page_side": page_side,
        "with_bleed": with_bleed,
    }


def inches_to_pts(value: float) -> float:
    return value * 72.0


def pts_to_inches(value: float) -> float:
    return value / 72.0


def dimensions_match(actual_w_in: float, actual_h_in: float, expected_w_in: float, expected_h_in: float, tolerance: float = 0.05) -> bool:
    return (
        abs(actual_w_in - expected_w_in) < tolerance
        and abs(actual_h_in - expected_h_in) < tolerance
    )


def profile_label(print_profile: str) -> str:
    labels = {
        "bw_white": "Black & white / white paper",
        "bw_cream": "Black & white / cream paper",
        "standard_color_white": "Standard color / white paper",
        "premium_color_white": "Premium color / white paper",
    }
    return labels.get(print_profile, print_profile)


def specs_summary() -> dict[str, Any]:
    return {
        "trim_sizes": list_trim_sizes(),
        "print_profiles": [
            {"key": key, "label": profile_label(key)} for key in PRINT_PROFILES
        ],
        "bleed_in": BLEED_IN,
        "min_page_count": MIN_PAGE_COUNT,
        "standard_color_min_page_count": STANDARD_COLOR_MIN_PAGES,
        "spine_text_min_pages": SPINE_TEXT_MIN_PAGES,
        "print_dpi": PRINT_DPI,
        "margin_table": [
            {
                "max_pages": row[0],
                "inside": row[1],
                "outside_no_bleed": row[2],
                "outside_with_bleed": row[3],
            }
            for row in MARGIN_TABLE
        ],
    }
