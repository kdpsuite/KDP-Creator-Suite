"""Unit tests for shared KDP paperback specifications."""

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.services.kdp_specs import (
    BLEED_IN,
    MIN_PAGE_COUNT,
    SPINE_TEXT_MIN_PAGES,
    STANDARD_COLOR_MIN_PAGES,
    KdpSpecError,
    clamp_to_valid_page_count,
    cover_dimensions,
    even_page_count,
    get_margins,
    get_trim,
    interior_page_size,
    normalize_print_profile,
    overlay_zones,
    spine_width_inches,
    validate_page_count,
)


def test_trim_sizes():
    trim = get_trim("6x9")
    assert trim.width == 6.0
    assert trim.height == 9.0
    with pytest.raises(KdpSpecError):
        get_trim("9x12")


def test_interior_bleed_is_asymmetric():
    no_bleed = interior_page_size("6x9", with_bleed=False)
    assert no_bleed.width == 6.0
    assert no_bleed.height == 9.0

    bled = interior_page_size("6x9", with_bleed=True)
    assert bled.width == pytest.approx(6.0 + BLEED_IN)
    assert bled.height == pytest.approx(9.0 + BLEED_IN * 2)


def test_margins_scale_with_page_count():
    m24 = get_margins(24, with_bleed=False)
    assert m24.inside == 0.375
    assert m24.outside == 0.25

    m200 = get_margins(200, with_bleed=True)
    assert m200.inside == 0.5
    assert m200.outside == 0.375

    m600 = get_margins(600, with_bleed=False)
    assert m600.inside == 0.75


def test_even_page_count():
    assert even_page_count(24) == 24
    assert even_page_count(25) == 26


def test_validate_page_count_bounds():
    assert validate_page_count(24, "6x9", "bw_white") == 24
    with pytest.raises(KdpSpecError):
        validate_page_count(20, "6x9", "bw_white")
    with pytest.raises(KdpSpecError):
        validate_page_count(50, "6x9", "standard_color_white")
    assert validate_page_count(STANDARD_COLOR_MIN_PAGES, "6x9", "standard_color_white") == 72


def test_clamp_to_valid_page_count():
    assert clamp_to_valid_page_count(23, "6x9", "bw_white") == MIN_PAGE_COUNT
    assert clamp_to_valid_page_count(25, "6x9", "bw_white") == 26
    assert clamp_to_valid_page_count(10, "6x9", "standard_color_white") == 72


def test_spine_and_cover_dimensions():
    spine = spine_width_inches(100, "bw_white")
    assert spine == pytest.approx(100 * 0.002252)

    cover = cover_dimensions("6x9", 100, "bw_white")
    assert cover.height == pytest.approx(9.0 + BLEED_IN * 2)
    assert cover.width == pytest.approx(BLEED_IN + 6.0 + spine + 6.0 + BLEED_IN)
    assert cover.allow_spine_text is True

    short = cover_dimensions("6x9", 50, "bw_white")
    assert short.page_count == 50
    assert short.allow_spine_text is False
    assert SPINE_TEXT_MIN_PAGES == 79


def test_print_profile_normalization():
    assert normalize_print_profile(ink="bw", paper="cream") == "bw_cream"
    assert normalize_print_profile(ink="premium_color", paper="white") == "premium_color_white"
    assert normalize_print_profile(profile="standard_color_white") == "standard_color_white"
    with pytest.raises(KdpSpecError):
        normalize_print_profile(ink="neon", paper="pink")


def test_overlay_zones_mirrored():
    right = overlay_zones("6x9", with_bleed=True, page_count=100, page_side="right")
    left = overlay_zones("6x9", with_bleed=True, page_count=100, page_side="left")
    assert right["safe"]["left"] != left["safe"]["left"]
    assert right["trim"]["width"] == pytest.approx(left["trim"]["width"])
