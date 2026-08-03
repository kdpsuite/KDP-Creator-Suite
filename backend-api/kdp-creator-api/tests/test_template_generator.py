"""Tests for template product generation."""

import os
import sys

import pytest
from pypdf import PdfReader

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.data.templates import STARTER_TEMPLATES, get_template
from src.services.kdp_specs import SPINE_TEXT_MIN_PAGES, interior_page_size
from src.services.template_generator import generate_product


@pytest.mark.parametrize("template_id", [t["id"] for t in STARTER_TEMPLATES])
def test_each_template_generates_valid_interior_and_cover(template_id):
    template = get_template(template_id)
    assert template is not None

    # Keep page counts modest for speed but valid for profile
    options = {
        **template["defaults"],
        "page_count": max(24, min(int(template["defaults"]["page_count"]), 48)),
        "include_spine_text": False,
    }
    if options["print_profile"] == "standard_color_white":
        options["page_count"] = 72

    result = generate_product(template, options)
    assert result.compliance["is_valid"] is True
    assert result.page_count % 2 == 0
    assert result.page_count >= 24

    expected = interior_page_size(result.trim_size, with_bleed=result.with_bleed)
    interior = PdfReader(__import__("io").BytesIO(result.interior_pdf))
    assert len(interior.pages) == result.page_count
    for page in interior.pages:
        w = float(page.mediabox.width) / 72.0
        h = float(page.mediabox.height) / 72.0
        assert abs(w - expected.width) < 0.05
        assert abs(h - expected.height) < 0.05

    cover = PdfReader(__import__("io").BytesIO(result.cover_pdf))
    assert len(cover.pages) == 1
    cw = float(cover.pages[0].mediabox.width) / 72.0
    ch = float(cover.pages[0].mediabox.height) / 72.0
    assert abs(cw - result.cover_width_in) < 0.05
    assert abs(ch - result.cover_height_in) < 0.05


def test_spine_text_suppressed_below_79_pages():
    template = get_template("tpl-coloring-cottagecore")
    options = {
        **template["defaults"],
        "page_count": 40,
        "include_spine_text": True,
        "print_profile": "bw_white",
    }
    result = generate_product(template, options)
    assert result.page_count < SPINE_TEXT_MIN_PAGES
    assert result.allow_spine_text is False
    assert result.compliance["is_valid"] is True
    assert result.compliance["cover"]["num_pages"] == 1
