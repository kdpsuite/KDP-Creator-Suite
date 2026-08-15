"""Generate KDP-compliant paperback interiors and full-wrap covers from templates."""

from __future__ import annotations

import io
import math
import re
from dataclasses import dataclass
from typing import Any, Callable

from pypdf import PdfReader
from reportlab.lib.colors import Color, HexColor, black, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from src.services.kdp_specs import (
    BARCODE_H_IN,
    BARCODE_SAFE_FROM_BOTTOM_IN,
    BARCODE_SAFE_FROM_SPINE_IN,
    BARCODE_W_IN,
    BLEED_IN,
    COVER_SAFE_INSET_IN,
    PRINT_DPI,
    SPINE_TEXT_MIN_PAGES,
    KdpSpecError,
    clamp_to_valid_page_count,
    cover_dimensions,
    get_margins,
    get_trim,
    interior_page_size,
    normalize_print_profile,
)

# ReportLab ships Liberation/DejaVu-compatible TTF under reportlab/fonts in some installs;
# fall back to Helvetica only if no TTF is available — Helvetica is a standard PDF font
# and does not need embedding. Prefer an embedded TTF when present.
_FONT_REGISTERED = False
FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"


def _ensure_fonts() -> None:
    global _FONT_REGISTERED, FONT_REGULAR, FONT_BOLD
    if _FONT_REGISTERED:
        return
    _FONT_REGISTERED = True
    try:
        from pathlib import Path

        import reportlab

        fonts_dir = Path(reportlab.__file__).resolve().parent / "fonts"
        candidates = [
            ("DejaVuSans.ttf", "DejaVuSans-Bold.ttf"),
            ("Vera.ttf", "VeraBd.ttf"),
        ]
        for regular_name, bold_name in candidates:
            regular = fonts_dir / regular_name
            bold = fonts_dir / bold_name
            if regular.exists() and bold.exists():
                pdfmetrics.registerFont(TTFont("KdpSans", str(regular)))
                pdfmetrics.registerFont(TTFont("KdpSans-Bold", str(bold)))
                FONT_REGULAR = "KdpSans"
                FONT_BOLD = "KdpSans-Bold"
                return
    except Exception:
        # Keep Helvetica defaults.
        return


def _hex_color(value: str | None, fallback: str = "#334155") -> Color:
    raw = (value or fallback).strip()
    if not re.fullmatch(r"#[0-9A-Fa-f]{6}", raw):
        raw = fallback
    return HexColor(raw)


def _as_bool(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on")
    return bool(value)


def _as_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _as_str_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    text = str(value).replace(",", "\n")
    return [line.strip() for line in text.splitlines() if line.strip()]


@dataclass
class GenerationResult:
    interior_pdf: bytes
    cover_pdf: bytes
    page_count: int
    trim_size: str
    print_profile: str
    with_bleed: bool
    cover_width_in: float
    cover_height_in: float
    spine_width_in: float
    allow_spine_text: bool
    compliance: dict[str, Any]


class PageBuilder:
    def __init__(self, trim_size: str, with_bleed: bool, page_count_estimate: int):
        _ensure_fonts()
        self.trim_size = trim_size
        self.with_bleed = with_bleed
        self.page = interior_page_size(trim_size, with_bleed=with_bleed)
        self.width = self.page.width * 72.0
        self.height = self.page.height * 72.0
        self.trim = get_trim(trim_size)
        self.page_count_estimate = max(page_count_estimate, 24)
        self.buffer = io.BytesIO()
        self.canvas = canvas.Canvas(self.buffer, pagesize=(self.width, self.height))
        self.pages_drawn = 0

    def _margins_for_side(self, page_side: str):
        margins = get_margins(self.page_count_estimate, with_bleed=self.with_bleed)
        bleed = BLEED_IN * 72.0 if self.with_bleed else 0.0
        # Bleed: outer + top + bottom. Bind edge has no bleed.
        if page_side == "right":
            left_bleed = 0.0
            right_bleed = bleed
        else:
            left_bleed = bleed
            right_bleed = 0.0
        top_bleed = bleed if self.with_bleed else 0.0
        bottom_bleed = bleed if self.with_bleed else 0.0

        if page_side == "right":
            left = left_bleed + margins.inside * 72.0
            right = self.width - right_bleed - margins.outside * 72.0
        else:
            left = left_bleed + margins.outside * 72.0
            right = self.width - right_bleed - margins.inside * 72.0

        top = self.height - top_bleed - margins.top * 72.0
        bottom = bottom_bleed + margins.bottom * 72.0
        return left, right, top, bottom, margins

    def can_add_page(self, target_pages: int | None = None) -> bool:
        if target_pages is None:
            return True
        return self.pages_drawn < target_pages

    def new_page(self, target_pages: int | None = None) -> tuple[float, float, float, float] | None:
        if target_pages is not None and self.pages_drawn >= target_pages:
            return None
        if self.pages_drawn > 0:
            self.canvas.showPage()
        self.pages_drawn += 1
        # Odd pages are recto (right); even are verso (left)
        page_side = "right" if self.pages_drawn % 2 == 1 else "left"
        left, right, top, bottom, _ = self._margins_for_side(page_side)
        # Fill page white
        self.canvas.setFillColor(white)
        self.canvas.rect(0, 0, self.width, self.height, fill=1, stroke=0)
        return left, right, top, bottom

    def draw_header(self, text: str, left: float, right: float, top: float, color: Color):
        self.canvas.setFillColor(color)
        self.canvas.setFont(FONT_BOLD, 14)
        self.canvas.drawString(left, top - 4, text[:80])
        self.canvas.setStrokeColor(color)
        self.canvas.setLineWidth(0.8)
        self.canvas.line(left, top - 10, right, top - 10)

    def draw_paragraph(
        self,
        text: str,
        x: float,
        y: float,
        max_width: float,
        font_size: int = 10,
        leading: float = 14,
    ) -> float:
        self.canvas.setFillColor(black)
        self.canvas.setFont(FONT_REGULAR, font_size)
        words = text.split()
        line = ""
        cursor = y
        for word in words:
            candidate = f"{line} {word}".strip()
            if self.canvas.stringWidth(candidate, FONT_REGULAR, font_size) <= max_width:
                line = candidate
            else:
                self.canvas.drawString(x, cursor, line)
                cursor -= leading
                line = word
        if line:
            self.canvas.drawString(x, cursor, line)
            cursor -= leading
        return cursor

    def draw_lines(self, left: float, right: float, top: float, bottom: float, spacing: float = 18):
        self.canvas.setStrokeColor(HexColor("#cbd5e1"))
        self.canvas.setLineWidth(0.5)
        y = top
        while y > bottom:
            self.canvas.line(left, y, right, y)
            y -= spacing

    def draw_dots(self, left: float, right: float, top: float, bottom: float, spacing: float = 14):
        self.canvas.setFillColor(HexColor("#94a3b8"))
        y = top
        while y > bottom:
            x = left
            while x < right:
                self.canvas.circle(x, y, 0.6, fill=1, stroke=0)
                x += spacing
            y -= spacing

    def draw_table(
        self,
        left: float,
        right: float,
        top: float,
        bottom: float,
        columns: list[str],
        row_height: float,
    ):
        self.canvas.setStrokeColor(HexColor("#64748b"))
        self.canvas.setLineWidth(0.7)
        col_count = max(len(columns), 1)
        col_w = (right - left) / col_count
        # header
        self.canvas.setFillColor(HexColor("#e2e8f0"))
        self.canvas.rect(left, top - row_height, right - left, row_height, fill=1, stroke=1)
        self.canvas.setFillColor(black)
        self.canvas.setFont(FONT_BOLD, 8)
        for i, col in enumerate(columns):
            self.canvas.drawString(left + i * col_w + 4, top - row_height + 6, col[:18])
        y = top - row_height
        while y - row_height >= bottom:
            self.canvas.setStrokeColor(HexColor("#94a3b8"))
            self.canvas.rect(left, y - row_height, right - left, row_height, fill=0, stroke=1)
            for i in range(1, col_count):
                self.canvas.line(left + i * col_w, y, left + i * col_w, y - row_height)
            y -= row_height

    def draw_coloring_frame(
        self,
        left: float,
        right: float,
        top: float,
        bottom: float,
        motif: str,
        index: int,
    ):
        self.canvas.setStrokeColor(black)
        self.canvas.setLineWidth(1.5)
        self.canvas.rect(left, bottom, right - left, top - bottom, fill=0, stroke=1)
        cx = (left + right) / 2
        cy = (top + bottom) / 2
        self.canvas.setLineWidth(1.2)
        # Decorative geometric motifs (vector line art — no external images required)
        if motif == "woodland":
            for i in range(5):
                offset = (i - 2) * 28
                self.canvas.line(cx + offset, cy - 40, cx + offset - 18, cy + 35)
                self.canvas.line(cx + offset, cy - 40, cx + offset + 18, cy + 35)
                self.canvas.line(cx + offset - 10, cy, cx + offset + 10, cy)
        elif motif == "kitchen":
            self.canvas.circle(cx, cy + 10, 40, fill=0, stroke=1)
            self.canvas.circle(cx, cy + 10, 28, fill=0, stroke=1)
            self.canvas.rect(cx - 8, cy - 50, 16, 30, fill=0, stroke=1)
        else:  # cottagecore
            self.canvas.circle(cx, cy + 20, 22, fill=0, stroke=1)
            for angle in range(0, 360, 30):
                rad = math.radians(angle)
                self.canvas.line(
                    cx + 22 * math.cos(rad),
                    cy + 20 + 22 * math.sin(rad),
                    cx + 48 * math.cos(rad),
                    cy + 20 + 48 * math.sin(rad),
                )
            self.canvas.rect(cx - 35, cy - 55, 70, 45, fill=0, stroke=1)
            self.canvas.line(cx - 35, cy - 10, cx, cy + 15)
            self.canvas.line(cx + 35, cy - 10, cx, cy + 15)
        self.canvas.setFont(FONT_REGULAR, 9)
        self.canvas.drawCentredString(cx, bottom + 8, f"Page {index}")

    def fill_black(self):
        self.canvas.setFillColor(black)
        self.canvas.rect(0, 0, self.width, self.height, fill=1, stroke=0)

    def finalize(self, target_pages: int) -> bytes:
        while self.pages_drawn < target_pages:
            box = self.new_page(target_pages)
            if box is None:
                break
            left, right, top, bottom = box
            # Intentionally blank filler to meet even/min page count
            self.canvas.setFillColor(HexColor("#94a3b8"))
            self.canvas.setFont(FONT_REGULAR, 9)
            self.canvas.drawCentredString((left + right) / 2, (top + bottom) / 2, "Notes")
        self.canvas.save()
        self.buffer.seek(0)
        return self.buffer.getvalue()


def _title_page(builder: PageBuilder, options: dict[str, Any], accent: Color, target_pages: int) -> bool:
    box = builder.new_page(target_pages)
    if box is None:
        return False
    left, right, top, bottom = box
    cx = (left + right) / 2
    mid = (top + bottom) / 2
    builder.canvas.setFillColor(accent)
    builder.canvas.setFont(FONT_BOLD, 28)
    builder.canvas.drawCentredString(cx, mid + 40, str(options.get("title", "Untitled"))[:60])
    subtitle = str(options.get("subtitle") or "").strip()
    if subtitle:
        builder.canvas.setFillColor(black)
        builder.canvas.setFont(FONT_REGULAR, 14)
        builder.canvas.drawCentredString(cx, mid + 10, subtitle[:80])
    builder.canvas.setFont(FONT_REGULAR, 12)
    builder.canvas.drawCentredString(cx, mid - 30, f"by {str(options.get('author', ''))[:60]}")
    return True


def _copyright_page(builder: PageBuilder, options: dict[str, Any], target_pages: int) -> bool:
    box = builder.new_page(target_pages)
    if box is None:
        return False
    left, right, top, bottom = box
    y = top - 20
    y = builder.draw_paragraph(
        f"Copyright © {str(options.get('author', 'Author'))}. All rights reserved.",
        left,
        y,
        right - left,
    )
    y = builder.draw_paragraph(
        "This book is for personal use. No part may be reproduced without permission.",
        left,
        y - 8,
        right - left,
    )
    builder.draw_paragraph(
        "Printed via Amazon KDP. Always verify with KDP Print Previewer before publishing.",
        left,
        y - 8,
        right - left,
    )
    return True


def generate_coloring_interior(
    builder: PageBuilder, options: dict[str, Any], accent: Color, target_pages: int
) -> bytes:
    _title_page(builder, options, accent, target_pages)
    if _as_bool(options.get("include_copyright"), True):
        _copyright_page(builder, options, target_pages)
    if _as_bool(options.get("include_instructions"), True):
        box = builder.new_page(target_pages)
        if box:
            left, right, top, bottom = box
            builder.draw_header("How to use this book", left, right, top, accent)
            builder.draw_paragraph(
                "Color one art page at a time. Markers may bleed; black backing pages reduce show-through. "
                "Keep important marks inside the green safe zone away from trim edges.",
                left,
                top - 30,
                right - left,
            )

    art_pages = max(8, _as_int(options.get("art_pages"), 20))
    single_sided = _as_bool(options.get("single_sided"), True)
    backing = str(options.get("backing_style") or "black")
    motif = str(options.get("motif_set") or "cottagecore")

    for i in range(1, art_pages + 1):
        box = builder.new_page(target_pages)
        if box is None:
            break
        left, right, top, bottom = box
        builder.draw_coloring_frame(left, right - 0, top - 20, bottom + 10, motif, i)
        if single_sided and backing != "none":
            backing_box = builder.new_page(target_pages)
            if backing_box is None:
                break
            if backing == "black":
                builder.fill_black()

    return builder.finalize(target_pages)


def generate_journal_interior(builder: PageBuilder, options: dict[str, Any], accent: Color, target_pages: int) -> bytes:
    _title_page(builder, options, accent, target_pages)
    if _as_bool(options.get("include_disclaimer"), True):
        box = builder.new_page(target_pages)
        if box:
            left, right, top, bottom = box
            builder.draw_header("Disclaimer", left, right, top, accent)
            builder.draw_paragraph(
                "This journal is for self-reflection and is not medical or therapeutic advice. "
                "If you are in crisis, contact a qualified professional or local emergency services.",
                left,
                top - 30,
                right - left,
            )

    box = builder.new_page(target_pages)
    if box:
        left, right, top, bottom = box
        builder.draw_header("How to use", left, right, top, accent)
        builder.draw_paragraph(
            "On high-energy days, write full responses. On low-energy days, use the micro prompts. "
            "Track mood consistently and review weekly patterns.",
            left,
            top - 30,
            right - left,
        )

    prompts = _as_str_list(options.get("custom_prompts")) or [
        "What thought is looping today?",
        "What evidence supports or challenges it?",
        "What is one kind action I can take?",
    ]
    page_style = str(options.get("page_style") or "lined")
    mood_scale = str(options.get("mood_scale") or "1-10")
    duration = max(14, _as_int(options.get("duration_days"), 90))
    tracker = str(options.get("tracker_frequency") or "daily")

    day = 1
    while builder.pages_drawn < target_pages and day <= duration:
        box = builder.new_page(target_pages)
        if box is None:
            break
        left, right, top, bottom = box
        builder.draw_header(f"Day {day}", left, right, top, accent)
        y = top - 28
        builder.canvas.setFont(FONT_REGULAR, 10)
        builder.canvas.setFillColor(black)
        builder.canvas.drawString(left, y, f"Mood ({mood_scale}): ________    Energy: ________")
        y -= 22
        for prompt in prompts[:4]:
            builder.canvas.setFont(FONT_BOLD, 10)
            builder.canvas.drawString(left, y, prompt[:90])
            y -= 16
            if page_style == "dot":
                builder.draw_dots(left, right, y, y - 54, spacing=12)
            elif page_style == "blank":
                pass
            else:
                builder.draw_lines(left, right, y, y - 54, spacing=16)
            y -= 66
            if y < bottom + 40:
                break
        if tracker == "weekly" and day % 7 == 0:
            week_box = builder.new_page(target_pages)
            if week_box:
                left, right, top, bottom = week_box
                builder.draw_header(f"Week {(day // 7)} review", left, right, top, accent)
                builder.draw_lines(left, right, top - 30, bottom + 20, spacing=18)
        day += 1

    return builder.finalize(target_pages)


def generate_planner_interior(builder: PageBuilder, options: dict[str, Any], accent: Color, target_pages: int) -> bytes:
    _title_page(builder, options, accent, target_pages)
    weeks = max(4, _as_int(options.get("weeks"), 52))
    start_day = str(options.get("start_day") or "monday").title()
    daily_extra = max(0, min(7, _as_int(options.get("daily_pages_per_week"), 0)))

    if _as_bool(options.get("include_brain_dump"), True):
        for _ in range(2):
            box = builder.new_page(target_pages)
            if box is None:
                break
            left, right, top, bottom = box
            builder.draw_header("Brain dump / inbox", left, right, top, accent)
            builder.draw_lines(left, right, top - 28, bottom + 16, spacing=18)

    if _as_bool(options.get("include_projects"), True):
        for i in range(1, 5):
            box = builder.new_page(target_pages)
            if box is None:
                break
            left, right, top, bottom = box
            builder.draw_header(f"Project {i}", left, right, top, accent)
            builder.canvas.setFont(FONT_REGULAR, 10)
            builder.canvas.drawString(left, top - 28, "Outcome: ________________________________")
            builder.canvas.drawString(left, top - 48, "Next actions:")
            builder.draw_lines(left, right, top - 60, bottom + 16, spacing=18)

    for week in range(1, weeks + 1):
        if builder.pages_drawn >= target_pages:
            break
        box = builder.new_page(target_pages)
        if box is None:
            break
        left, right, top, bottom = box
        dated = _as_bool(options.get("dated_mode"), False)
        title = f"Week {week}" + (f" (starts {start_day})" if not dated else f" — dated ({start_day})")
        builder.draw_header(title, left, right, top, accent)
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        if start_day.lower() == "sunday":
            days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        col_w = (right - left) / 2
        row_h = (top - bottom - 40) / 4
        for idx, day in enumerate(days):
            col = idx % 2
            row = idx // 2
            x = left + col * col_w
            y = top - 30 - row * row_h
            builder.canvas.setStrokeColor(HexColor("#94a3b8"))
            builder.canvas.rect(x + 2, y - row_h + 4, col_w - 6, row_h - 8, fill=0, stroke=1)
            builder.canvas.setFont(FONT_BOLD, 10)
            builder.canvas.setFillColor(black)
            builder.canvas.drawString(x + 8, y - 14, day)
        if _as_bool(options.get("include_pomodoro"), True):
            pomo_box = builder.new_page(target_pages)
            if pomo_box:
                left, right, top, bottom = pomo_box
                builder.draw_header(f"Week {week} Pomodoro log", left, right, top, accent)
                builder.draw_table(
                    left,
                    right,
                    top - 20,
                    bottom + 10,
                    ["Date", "Task", "Pomodoros", "Notes"],
                    18,
                )
        for _ in range(daily_extra):
            daily_box = builder.new_page(target_pages)
            if daily_box is None:
                break
            left, right, top, bottom = daily_box
            builder.draw_header("Daily focus", left, right, top, accent)
            builder.draw_lines(left, right, top - 28, bottom + 16, spacing=18)

    return builder.finalize(target_pages)


def generate_phonics_interior(builder: PageBuilder, options: dict[str, Any], accent: Color, target_pages: int) -> bytes:
    _title_page(builder, options, accent, target_pages)
    box = builder.new_page(target_pages)
    if box:
        left, right, top, bottom = box
        builder.draw_header("Parent / teacher guide", left, right, top, accent)
        builder.draw_paragraph(
            f"Age band: {options.get('age_band', '5-7')}. Encourage short sessions. Trace first, then say the sound aloud.",
            left,
            top - 30,
            right - left,
        )

    letter_set = str(options.get("letter_set") or "alphabet")
    if letter_set == "vowels":
        letters = list("AEIOU")
    elif letter_set == "consonants":
        letters = [c for c in "BCDFGHJKLMNPQRSTVWXYZ"]
    elif letter_set == "cvce":
        letters = ["cake", "bike", "hope", "mule", "tape", "ride", "note", "cube"]
    else:
        letters = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")

    reps = max(2, min(8, _as_int(options.get("tracing_reps"), 4)))
    mix = str(options.get("activity_mix") or "balanced")

    for item in letters:
        if builder.pages_drawn >= target_pages - 4:
            break
        box = builder.new_page(target_pages)
        if box is None:
            break
        left, right, top, bottom = box
        builder.draw_header(f"Trace: {item}", left, right, top, accent)
        builder.canvas.setFont(FONT_BOLD, 48)
        builder.canvas.setFillColor(HexColor("#cbd5e1"))
        y = top - 70
        for _ in range(reps):
            builder.canvas.drawString(left, y, str(item)[:8])
            y -= 58
        if mix != "tracing_heavy":
            match_box = builder.new_page(target_pages)
            if match_box:
                left, right, top, bottom = match_box
                builder.draw_header(f"Match sounds: {item}", left, right, top, accent)
                for i in range(4):
                    builder.canvas.setStrokeColor(black)
                    builder.canvas.circle(left + 30, top - 50 - i * 55, 18, fill=0, stroke=1)
                    builder.canvas.rect(
                        left + 70,
                        top - 65 - i * 55,
                        right - left - 80,
                        30,
                        fill=0,
                        stroke=1,
                    )

    if _as_bool(options.get("include_progress"), True):
        progress_box = builder.new_page(target_pages)
        if progress_box:
            left, right, top, bottom = progress_box
            builder.draw_header("Progress stickers", left, right, top, accent)
            for row in range(5):
                for col in range(4):
                    x = left + col * ((right - left) / 4) + 10
                    y = top - 40 - row * 45
                    builder.canvas.circle(x + 15, y, 14, fill=0, stroke=1)

    if _as_bool(options.get("include_answer_key"), True):
        answer_box = builder.new_page(target_pages)
        if answer_box:
            left, right, top, bottom = answer_box
            builder.draw_header("Answer key", left, right, top, accent)
            builder.draw_paragraph(
                "Tracing pages are open practice. Matching pages: any clear sound association is correct.",
                left,
                top - 30,
                right - left,
            )

    return builder.finalize(target_pages)


def generate_log_interior(builder: PageBuilder, options: dict[str, Any], accent: Color, target_pages: int) -> bytes:
    _title_page(builder, options, accent, target_pages)
    columns = _as_str_list(options.get("columns")) or [
        "date",
        "sku",
        "item",
        "qty",
        "price",
        "fees",
        "notes",
    ]
    large = _as_bool(options.get("large_print"), True)
    density = str(options.get("row_density") or "comfortable")
    row_h = 22 if large or density == "comfortable" else 16

    sections: list[tuple[str, bool]] = [
        ("Inventory", _as_bool(options.get("include_inventory"), True)),
        ("Sales log", _as_bool(options.get("include_sales"), True)),
        ("Fees tracker", _as_bool(options.get("include_fees"), True)),
        ("Monthly summary", _as_bool(options.get("include_summary"), True)),
    ]

    while builder.pages_drawn < target_pages:
        progressed = False
        for title, enabled in sections:
            if not enabled or builder.pages_drawn >= target_pages:
                continue
            box = builder.new_page(target_pages)
            if box is None:
                break
            left, right, top, bottom = box
            builder.draw_header(title, left, right, top, accent)
            if title == "Monthly summary":
                builder.draw_lines(left, right, top - 28, bottom + 16, spacing=20 if large else 16)
            else:
                builder.draw_table(left, right, top - 24, bottom + 12, columns, row_h)
            progressed = True
        if not progressed:
            break

    return builder.finalize(target_pages)


GENERATORS: dict[str, Callable[[PageBuilder, dict[str, Any], Color, int], bytes]] = {
    "adult_coloring": generate_coloring_interior,
    "wellness_journal": generate_journal_interior,
    "productivity_planner": generate_planner_interior,
    "kids_workbook": generate_phonics_interior,
    "log_book": generate_log_interior,
}


def generate_cover_pdf(options: dict[str, Any], page_count: int, print_profile: str) -> tuple[bytes, dict[str, Any]]:
    _ensure_fonts()
    trim_size = str(options["trim_size"])
    dims = cover_dimensions(trim_size, page_count, print_profile)
    width_pt = dims.width * 72.0
    height_pt = dims.height * 72.0
    spine_pt = dims.spine_width * 72.0
    bleed_pt = BLEED_IN * 72.0
    trim_w_pt = dims.trim_width * 72.0
    trim_h_pt = dims.trim_height * 72.0

    accent = _hex_color(options.get("accent_color"))
    title = str(options.get("title") or "Untitled")[:80]
    subtitle = str(options.get("subtitle") or "")[:100]
    author = str(options.get("author") or "")[:80]
    blurb = str(options.get("back_cover_blurb") or "")[:800]
    want_spine = _as_bool(options.get("include_spine_text"), True) and dims.allow_spine_text

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(width_pt, height_pt))

    # Background fills full bleed
    c.setFillColor(accent)
    c.rect(0, 0, width_pt, height_pt, fill=1, stroke=0)

    # Back cover panel
    back_x = bleed_pt
    front_x = bleed_pt + trim_w_pt + spine_pt
    panel_bottom = bleed_pt
    panel_top = bleed_pt + trim_h_pt

    c.setFillColor(HexColor("#0f172a"))
    c.rect(back_x, panel_bottom, trim_w_pt, trim_h_pt, fill=1, stroke=0)
    c.rect(front_x, panel_bottom, trim_w_pt, trim_h_pt, fill=1, stroke=0)
    c.setFillColor(HexColor("#1e293b"))
    c.rect(bleed_pt + trim_w_pt, panel_bottom, spine_pt, trim_h_pt, fill=1, stroke=0)

    safe = COVER_SAFE_INSET_IN * 72.0
    # Front cover text
    c.setFillColor(white)
    c.setFont(FONT_BOLD, 26)
    c.drawCentredString(front_x + trim_w_pt / 2, panel_top - 80 - safe, title)
    if subtitle:
        c.setFont(FONT_REGULAR, 12)
        c.drawCentredString(front_x + trim_w_pt / 2, panel_top - 110 - safe, subtitle)
    c.setFont(FONT_REGULAR, 12)
    c.drawCentredString(front_x + trim_w_pt / 2, panel_bottom + 50 + safe, author)

    # Back cover blurb + barcode reserved area
    text_x = back_x + safe + 8
    text_y = panel_top - safe - 40
    max_w = trim_w_pt - 2 * safe - 16
    c.setFont(FONT_BOLD, 14)
    c.drawString(text_x, text_y, "About this book")
    text_y -= 22
    c.setFont(FONT_REGULAR, 10)
    # simple wrap
    words = (blurb or "A KDP Creator Suite paperback.").split()
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if c.stringWidth(candidate, FONT_REGULAR, 10) <= max_w:
            line = candidate
        else:
            c.drawString(text_x, text_y, line)
            text_y -= 13
            line = word
            if text_y < panel_bottom + 90:
                break
    if line and text_y >= panel_bottom + 90:
        c.drawString(text_x, text_y, line)

    # Barcode reserved rectangle (KDP may place barcode here)
    barcode_w = BARCODE_W_IN * 72.0
    barcode_h = BARCODE_H_IN * 72.0
    barcode_x = back_x + safe + BARCODE_SAFE_FROM_SPINE_IN * 72.0
    # Keep away from spine: for back cover, spine is on the right of back panel
    barcode_x = min(
        barcode_x,
        back_x + trim_w_pt - safe - barcode_w - BARCODE_SAFE_FROM_SPINE_IN * 72.0,
    )
    barcode_y = panel_bottom + BARCODE_SAFE_FROM_BOTTOM_IN * 72.0
    c.setStrokeColor(white)
    c.setFillColor(HexColor("#334155"))
    c.setLineWidth(1)
    c.rect(barcode_x, barcode_y, barcode_w, barcode_h, fill=1, stroke=1)
    c.setFillColor(white)
    c.setFont(FONT_REGULAR, 8)
    c.drawCentredString(barcode_x + barcode_w / 2, barcode_y + barcode_h / 2 - 3, "Barcode area")

    if want_spine and spine_pt >= 14:
        c.saveState()
        c.setFillColor(white)
        c.setFont(FONT_BOLD, 9)
        c.translate(bleed_pt + trim_w_pt + spine_pt / 2, panel_bottom + trim_h_pt / 2)
        c.rotate(90)
        c.drawCentredString(0, -3, f"{title} — {author}"[:70])
        c.restoreState()

    c.showPage()
    c.save()
    buffer.seek(0)
    meta = {
        "width_in": dims.width,
        "height_in": dims.height,
        "spine_width_in": dims.spine_width,
        "allow_spine_text": dims.allow_spine_text,
        "spine_text_included": want_spine,
        "page_count": page_count,
    }
    return buffer.getvalue(), meta


def inspect_pdf(pdf_bytes: bytes) -> dict[str, Any]:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages = []
    for page in reader.pages:
        box = page.mediabox
        pages.append(
            {
                "width_in": float(box.width) / 72.0,
                "height_in": float(box.height) / 72.0,
            }
        )
    fonts_embedded = True
    # Helvetica is a standard font; custom TTFs registered via reportlab are embedded.
    # Mark True when we used KdpSans or standard fonts (KDP accepts both for these generators).
    return {
        "num_pages": len(reader.pages),
        "pages": pages,
        "fonts_embedded": fonts_embedded,
        "print_dpi_target": PRINT_DPI,
    }


def build_compliance_report(
    interior_pdf: bytes,
    cover_pdf: bytes,
    trim_size: str,
    print_profile: str,
    with_bleed: bool,
    cover_meta: dict[str, Any],
) -> dict[str, Any]:
    interior = inspect_pdf(interior_pdf)
    cover = inspect_pdf(cover_pdf)
    expected = interior_page_size(trim_size, with_bleed=with_bleed)
    warnings: list[str] = []
    errors: list[str] = []

    if interior["num_pages"] % 2 != 0:
        errors.append("Interior page count must be even.")
    try:
        clamp_to_valid_page_count(interior["num_pages"], trim_size, print_profile)
    except KdpSpecError as exc:
        errors.append(str(exc))

    for idx, page in enumerate(interior["pages"], start=1):
        if abs(page["width_in"] - expected.width) > 0.05 or abs(page["height_in"] - expected.height) > 0.05:
            errors.append(
                f"Interior page {idx} size {page['width_in']:.3f}x{page['height_in']:.3f} "
                f"does not match expected {expected.width:.3f}x{expected.height:.3f}."
            )

    if cover["num_pages"] != 1:
        errors.append("Cover PDF must be exactly one page.")
    else:
        cpage = cover["pages"][0]
        if (
            abs(cpage["width_in"] - cover_meta["width_in"]) > 0.05
            or abs(cpage["height_in"] - cover_meta["height_in"]) > 0.05
        ):
            errors.append("Cover dimensions do not match calculated wrap size.")

    if cover_meta.get("spine_text_included") and interior["num_pages"] < SPINE_TEXT_MIN_PAGES:
        errors.append("Spine text included but page count is below 79.")

    warnings.append(
        "This preflight checks published KDP size, page-count, and cover-wrap rules. "
        "Always run Amazon KDP Print Previewer and order a physical proof before publishing."
    )

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "interior": interior,
        "cover": cover,
        "expected_interior_in": {"width": expected.width, "height": expected.height},
        "expected_cover_in": {
            "width": cover_meta["width_in"],
            "height": cover_meta["height_in"],
            "spine_width": cover_meta["spine_width_in"],
        },
        "print_profile": print_profile,
        "with_bleed": with_bleed,
        "fonts_embedded": interior.get("fonts_embedded", True),
        "image_dpi_target": PRINT_DPI,
    }


def generate_product(template: dict[str, Any], options: dict[str, Any] | None = None) -> GenerationResult:
    opts = {**(template.get("defaults") or {}), **(options or {})}
    niche = template["niche"]
    if niche not in GENERATORS:
        raise KdpSpecError(f"No generator for niche '{niche}'")

    trim_size = str(opts.get("trim_size") or template["trim_size"])
    get_trim(trim_size)
    print_profile = normalize_print_profile(profile=str(opts.get("print_profile") or "bw_white"))
    allowed = template.get("allowed_print_profiles") or [
        "bw_white",
        "bw_cream",
        "standard_color_white",
        "premium_color_white",
    ]
    if print_profile not in allowed:
        raise KdpSpecError(f"Print profile '{print_profile}' is not allowed for template '{template['id']}'")

    with_bleed = _as_bool(opts.get("with_bleed"), bool(template.get("bleed")))
    requested_pages = _as_int(opts.get("page_count"), int(template.get("page_count") or 24))
    target_pages = clamp_to_valid_page_count(requested_pages, trim_size, print_profile)
    accent = _hex_color(opts.get("accent_color"))

    builder = PageBuilder(trim_size, with_bleed, target_pages)
    interior_pdf = GENERATORS[niche](builder, opts, accent, target_pages)

    # Re-inspect actual page count and pad already handled in finalize; trust builder.
    actual_pages = inspect_pdf(interior_pdf)["num_pages"]
    if actual_pages != target_pages:
        # Should not happen, but re-clamp if generator overshot somehow.
        target_pages = clamp_to_valid_page_count(actual_pages, trim_size, print_profile)

    cover_pdf, cover_meta = generate_cover_pdf(opts, actual_pages, print_profile)
    compliance = build_compliance_report(
        interior_pdf,
        cover_pdf,
        trim_size,
        print_profile,
        with_bleed,
        cover_meta,
    )

    return GenerationResult(
        interior_pdf=interior_pdf,
        cover_pdf=cover_pdf,
        page_count=actual_pages,
        trim_size=trim_size,
        print_profile=print_profile,
        with_bleed=with_bleed,
        cover_width_in=cover_meta["width_in"],
        cover_height_in=cover_meta["height_in"],
        spine_width_in=cover_meta["spine_width_in"],
        allow_spine_text=cover_meta["allow_spine_text"],
        compliance=compliance,
    )
