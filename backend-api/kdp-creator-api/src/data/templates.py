"""Starter template library with customization schemas for product generation."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from src.services.kdp_specs import PRINT_PROFILES, list_trim_sizes, specs_summary

SHARED_PRINT_FIELDS = [
    {
        "key": "title",
        "label": "Book title",
        "type": "text",
        "required": True,
        "maxLength": 120,
    },
    {
        "key": "subtitle",
        "label": "Subtitle",
        "type": "text",
        "required": False,
        "maxLength": 160,
    },
    {
        "key": "author",
        "label": "Author / pen name",
        "type": "text",
        "required": True,
        "maxLength": 80,
    },
    {
        "key": "trim_size",
        "label": "Trim size",
        "type": "select",
        "required": True,
        "options": [{"value": t["key"], "label": f"{t['width']:g} × {t['height']:g} in"} for t in list_trim_sizes()],
    },
    {
        "key": "print_profile",
        "label": "Ink & paper",
        "type": "select",
        "required": True,
        "options": [
            {"value": "bw_white", "label": "Black & white / white paper"},
            {"value": "bw_cream", "label": "Black & white / cream paper"},
            {"value": "standard_color_white", "label": "Standard color / white paper"},
            {"value": "premium_color_white", "label": "Premium color / white paper"},
        ],
    },
    {
        "key": "with_bleed",
        "label": "Include bleed",
        "type": "boolean",
        "required": True,
    },
    {
        "key": "page_count",
        "label": "Target page count",
        "type": "number",
        "required": True,
        "min": 24,
        "max": 828,
        "step": 2,
        "help": "Final interior is rounded to an even valid KDP page count for the selected profile.",
    },
    {
        "key": "accent_color",
        "label": "Accent color (hex)",
        "type": "text",
        "required": False,
        "maxLength": 7,
        "placeholder": "#334155",
    },
    {
        "key": "back_cover_blurb",
        "label": "Back cover blurb",
        "type": "textarea",
        "required": False,
        "maxLength": 800,
    },
    {
        "key": "include_spine_text",
        "label": "Spine text (requires 79+ pages)",
        "type": "boolean",
        "required": False,
    },
]

STARTER_TEMPLATES: list[dict[str, Any]] = [
    {
        "id": "tpl-coloring-cottagecore",
        "name": "Cottagecore Coloring Book",
        "niche": "adult_coloring",
        "description": (
            "Single-sided adult coloring pages with black-out backing pages to prevent "
            "marker bleed-through. Cottagecore theme with nature and cozy motifs."
        ),
        "trim_size": "8.5x11",
        "page_count": 50,
        "bleed": True,
        "features": ["single-sided", "black-out-backing", "bleed"],
        "tier_required": "pro",
        "tags": ["coloring", "cottagecore", "adult"],
        "allowed_print_profiles": list(PRINT_PROFILES),
        "defaults": {
            "title": "Cottagecore Coloring Book",
            "subtitle": "Cozy Nature Pages to Color",
            "author": "KDP Creator",
            "trim_size": "8.5x11",
            "print_profile": "bw_white",
            "with_bleed": True,
            "page_count": 50,
            "accent_color": "#4d7c0f",
            "back_cover_blurb": "Slow down and color cottage gardens, woodland paths, and cozy kitchens.",
            "include_spine_text": False,
            "single_sided": True,
            "backing_style": "black",
            "line_threshold": 127,
            "include_instructions": True,
            "include_copyright": True,
            "motif_set": "cottagecore",
            "art_pages": 20,
        },
        "fields": SHARED_PRINT_FIELDS
        + [
            {
                "key": "single_sided",
                "label": "Single-sided printing (art + backing)",
                "type": "boolean",
                "required": True,
            },
            {
                "key": "backing_style",
                "label": "Backing page style",
                "type": "select",
                "required": True,
                "options": [
                    {"value": "black", "label": "Black-out (bleed-through prevention)"},
                    {"value": "blank", "label": "Blank white"},
                    {"value": "none", "label": "No backing (double-sided art)"},
                ],
            },
            {
                "key": "line_threshold",
                "label": "Line-art threshold (0–255)",
                "type": "number",
                "required": False,
                "min": 0,
                "max": 255,
                "step": 1,
            },
            {
                "key": "art_pages",
                "label": "Number of art pages",
                "type": "number",
                "required": True,
                "min": 8,
                "max": 200,
                "step": 1,
            },
            {
                "key": "motif_set",
                "label": "Motif set",
                "type": "select",
                "required": True,
                "options": [
                    {"value": "cottagecore", "label": "Cottagecore"},
                    {"value": "woodland", "label": "Woodland"},
                    {"value": "kitchen", "label": "Cozy kitchen"},
                ],
            },
            {
                "key": "include_instructions",
                "label": "Include how-to-use page",
                "type": "boolean",
                "required": False,
            },
            {
                "key": "include_copyright",
                "label": "Include copyright page",
                "type": "boolean",
                "required": False,
            },
        ],
    },
    {
        "id": "tpl-wellness-cbt-journal",
        "name": "CBT Wellness Journal",
        "niche": "wellness_journal",
        "description": (
            "Evidence-based CBT journaling prompts with flexible micro-journaling sections "
            "for varying energy levels. 6x9 trim optimized for daily carry."
        ),
        "trim_size": "6x9",
        "page_count": 120,
        "bleed": False,
        "features": ["cbt-prompts", "micro-journaling", "mood-tracker"],
        "tier_required": "pro",
        "tags": ["journal", "wellness", "mental-health"],
        "allowed_print_profiles": ["bw_white", "bw_cream", "premium_color_white"],
        "defaults": {
            "title": "CBT Wellness Journal",
            "subtitle": "Daily thoughts, moods, and micro-reflections",
            "author": "KDP Creator",
            "trim_size": "6x9",
            "print_profile": "bw_cream",
            "with_bleed": False,
            "page_count": 120,
            "accent_color": "#0f766e",
            "back_cover_blurb": "A flexible CBT journal with mood tracking and low-energy micro prompts.",
            "include_spine_text": True,
            "duration_days": 90,
            "page_style": "lined",
            "mood_scale": "1-10",
            "tracker_frequency": "daily",
            "include_disclaimer": True,
            "section_order": [
                "title",
                "disclaimer",
                "howto",
                "daily",
                "weekly",
                "notes",
            ],
            "custom_prompts": [
                "What thought is looping today?",
                "What evidence supports or challenges it?",
                "What is one kind action I can take?",
            ],
        },
        "fields": SHARED_PRINT_FIELDS
        + [
            {
                "key": "duration_days",
                "label": "Journal duration (days)",
                "type": "number",
                "required": True,
                "min": 14,
                "max": 365,
            },
            {
                "key": "page_style",
                "label": "Writing page style",
                "type": "select",
                "required": True,
                "options": [
                    {"value": "lined", "label": "Lined"},
                    {"value": "dot", "label": "Dot grid"},
                    {"value": "blank", "label": "Blank"},
                ],
            },
            {
                "key": "mood_scale",
                "label": "Mood scale",
                "type": "select",
                "required": True,
                "options": [
                    {"value": "1-5", "label": "1–5"},
                    {"value": "1-10", "label": "1–10"},
                    {"value": "emoji", "label": "Emoji faces"},
                ],
            },
            {
                "key": "tracker_frequency",
                "label": "Tracker frequency",
                "type": "select",
                "required": True,
                "options": [
                    {"value": "daily", "label": "Daily"},
                    {"value": "weekly", "label": "Weekly"},
                ],
            },
            {
                "key": "include_disclaimer",
                "label": "Include wellness disclaimer",
                "type": "boolean",
                "required": False,
            },
            {
                "key": "custom_prompts",
                "label": "Custom prompts (one per line)",
                "type": "textarea",
                "required": False,
                "maxLength": 2000,
                "help": "Leave blank to use defaults. Separate prompts with newlines.",
            },
        ],
    },
    {
        "id": "tpl-planner-gtd",
        "name": "GTD Productivity Planner",
        "niche": "productivity_planner",
        "description": (
            "Getting Things Done inspired weekly planner with project brain-dump, "
            "next-action lists, and Pomodoro tracking blocks."
        ),
        "trim_size": "8.5x11",
        "page_count": 180,
        "bleed": False,
        "features": ["gtd-workflow", "weekly-spread", "pomodoro-blocks"],
        "tier_required": "free",
        "tags": ["planner", "productivity", "gtd"],
        "allowed_print_profiles": ["bw_white", "bw_cream", "premium_color_white"],
        "defaults": {
            "title": "GTD Productivity Planner",
            "subtitle": "Capture, clarify, organize, reflect",
            "author": "KDP Creator",
            "trim_size": "8.5x11",
            "print_profile": "bw_white",
            "with_bleed": False,
            "page_count": 180,
            "accent_color": "#1d4ed8",
            "back_cover_blurb": "A GTD-inspired planner with weekly spreads, projects, and Pomodoro blocks.",
            "include_spine_text": True,
            "dated_mode": False,
            "start_day": "monday",
            "weeks": 52,
            "include_projects": True,
            "include_brain_dump": True,
            "include_pomodoro": True,
            "daily_pages_per_week": 0,
        },
        "fields": SHARED_PRINT_FIELDS
        + [
            {
                "key": "dated_mode",
                "label": "Dated planner",
                "type": "boolean",
                "required": True,
            },
            {
                "key": "start_day",
                "label": "Week starts on",
                "type": "select",
                "required": True,
                "options": [
                    {"value": "monday", "label": "Monday"},
                    {"value": "sunday", "label": "Sunday"},
                ],
            },
            {
                "key": "weeks",
                "label": "Number of weeks",
                "type": "number",
                "required": True,
                "min": 4,
                "max": 60,
            },
            {
                "key": "include_projects",
                "label": "Include project pages",
                "type": "boolean",
                "required": False,
            },
            {
                "key": "include_brain_dump",
                "label": "Include brain-dump pages",
                "type": "boolean",
                "required": False,
            },
            {
                "key": "include_pomodoro",
                "label": "Include Pomodoro tracking",
                "type": "boolean",
                "required": False,
            },
            {
                "key": "daily_pages_per_week",
                "label": "Extra daily pages per week",
                "type": "number",
                "required": False,
                "min": 0,
                "max": 7,
            },
        ],
    },
    {
        "id": "tpl-kids-phonics-workbook",
        "name": "Phonics Practice Workbook",
        "niche": "kids_workbook",
        "description": (
            "Ages 5–7 phonics workbook with letter tracing, sound-matching games, "
            "and progress stickers. Large print and high-contrast layouts for young learners."
        ),
        "trim_size": "8.5x11",
        "page_count": 64,
        "bleed": False,
        "features": ["letter-tracing", "gamified-rewards", "large-print"],
        "tier_required": "pro",
        "tags": ["kids", "education", "phonics"],
        "allowed_print_profiles": [
            "bw_white",
            "premium_color_white",
            "standard_color_white",
        ],
        "defaults": {
            "title": "Phonics Practice Workbook",
            "subtitle": "Letters, sounds, and tracing fun",
            "author": "KDP Creator",
            "trim_size": "8.5x11",
            "print_profile": "premium_color_white",
            "with_bleed": False,
            "page_count": 64,
            "accent_color": "#db2777",
            "back_cover_blurb": "Large-print phonics practice with tracing, matching, and reward pages.",
            "include_spine_text": False,
            "age_band": "5-7",
            "letter_set": "alphabet",
            "tracing_reps": 4,
            "include_answer_key": True,
            "include_progress": True,
            "activity_mix": "balanced",
        },
        "fields": SHARED_PRINT_FIELDS
        + [
            {
                "key": "age_band",
                "label": "Age band",
                "type": "select",
                "required": True,
                "options": [
                    {"value": "4-5", "label": "Ages 4–5"},
                    {"value": "5-7", "label": "Ages 5–7"},
                    {"value": "6-8", "label": "Ages 6–8"},
                ],
            },
            {
                "key": "letter_set",
                "label": "Letter / word set",
                "type": "select",
                "required": True,
                "options": [
                    {"value": "alphabet", "label": "Full alphabet"},
                    {"value": "vowels", "label": "Vowels focus"},
                    {"value": "consonants", "label": "Consonants focus"},
                    {"value": "cvce", "label": "CVC / silent-e words"},
                ],
            },
            {
                "key": "tracing_reps",
                "label": "Tracing repetitions per letter",
                "type": "number",
                "required": True,
                "min": 2,
                "max": 8,
            },
            {
                "key": "activity_mix",
                "label": "Activity mix",
                "type": "select",
                "required": True,
                "options": [
                    {"value": "balanced", "label": "Balanced"},
                    {"value": "tracing_heavy", "label": "Tracing heavy"},
                    {"value": "games_heavy", "label": "Games heavy"},
                ],
            },
            {
                "key": "include_progress",
                "label": "Include progress / sticker pages",
                "type": "boolean",
                "required": False,
            },
            {
                "key": "include_answer_key",
                "label": "Include answer key",
                "type": "boolean",
                "required": False,
            },
        ],
    },
    {
        "id": "tpl-log-etsy-seller",
        "name": "Etsy Seller Inventory Log",
        "niche": "log_book",
        "description": (
            "Track listings, sales, fees, and restock dates for Etsy sellers. "
            "Industry-specific fields with large-print option for daily desk use."
        ),
        "trim_size": "6x9",
        "page_count": 100,
        "bleed": False,
        "features": ["inventory-tracking", "fee-calculator-fields", "large-print"],
        "tier_required": "free",
        "tags": ["log-book", "etsy", "business"],
        "allowed_print_profiles": ["bw_white", "bw_cream"],
        "defaults": {
            "title": "Etsy Seller Inventory Log",
            "subtitle": "Listings, sales, fees, and restocks",
            "author": "KDP Creator",
            "trim_size": "6x9",
            "print_profile": "bw_white",
            "with_bleed": False,
            "page_count": 100,
            "accent_color": "#b45309",
            "back_cover_blurb": "Keep inventory, fees, and restock dates organized for your Etsy shop.",
            "include_spine_text": True,
            "large_print": True,
            "row_density": "comfortable",
            "include_inventory": True,
            "include_sales": True,
            "include_fees": True,
            "include_summary": True,
            "columns": ["date", "sku", "item", "qty", "price", "fees", "notes"],
        },
        "fields": SHARED_PRINT_FIELDS
        + [
            {
                "key": "large_print",
                "label": "Large print mode",
                "type": "boolean",
                "required": False,
            },
            {
                "key": "row_density",
                "label": "Row density",
                "type": "select",
                "required": True,
                "options": [
                    {"value": "comfortable", "label": "Comfortable"},
                    {"value": "compact", "label": "Compact"},
                ],
            },
            {
                "key": "include_inventory",
                "label": "Inventory section",
                "type": "boolean",
                "required": False,
            },
            {
                "key": "include_sales",
                "label": "Sales log section",
                "type": "boolean",
                "required": False,
            },
            {
                "key": "include_fees",
                "label": "Fees tracker section",
                "type": "boolean",
                "required": False,
            },
            {
                "key": "include_summary",
                "label": "Monthly summary pages",
                "type": "boolean",
                "required": False,
            },
            {
                "key": "columns",
                "label": "Columns (comma-separated)",
                "type": "text",
                "required": False,
                "maxLength": 200,
                "help": "Available: date, sku, item, qty, price, fees, restock, notes",
            },
        ],
    },
]


def get_template(template_id: str) -> dict[str, Any] | None:
    for tpl in STARTER_TEMPLATES:
        if tpl["id"] == template_id:
            return deepcopy(tpl)
    return None


def list_templates(niche: str | None = None) -> list[dict[str, Any]]:
    templates = STARTER_TEMPLATES
    if niche:
        templates = [t for t in templates if t["niche"] == niche]
    return deepcopy(templates)


def catalog_payload(niche: str | None = None) -> dict[str, Any]:
    templates = list_templates(niche)
    return {
        "templates": templates,
        "total": len(templates),
        "kdp_specs": specs_summary(),
    }
