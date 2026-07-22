"""Starter template library data — Phase 1 niches from template_library_action_plan.md."""

STARTER_TEMPLATES = [
    {
        'id': 'tpl-coloring-cottagecore',
        'name': 'Cottagecore Coloring Book',
        'niche': 'adult_coloring',
        'description': (
            'Single-sided adult coloring pages with black-out backing pages to prevent '
            'marker bleed-through. Cottagecore theme with nature and cozy motifs.'
        ),
        'trim_size': '8.5x11',
        'page_count': 50,
        'bleed': True,
        'features': ['single-sided', 'black-out-backing', 'bleed'],
        'tier_required': 'pro',
        'tags': ['coloring', 'cottagecore', 'adult'],
    },
    {
        'id': 'tpl-wellness-cbt-journal',
        'name': 'CBT Wellness Journal',
        'niche': 'wellness_journal',
        'description': (
            'Evidence-based CBT journaling prompts with flexible micro-journaling sections '
            'for varying energy levels. 6x9 trim optimized for daily carry.'
        ),
        'trim_size': '6x9',
        'page_count': 120,
        'bleed': False,
        'features': ['cbt-prompts', 'micro-journaling', 'mood-tracker'],
        'tier_required': 'pro',
        'tags': ['journal', 'wellness', 'mental-health'],
    },
    {
        'id': 'tpl-planner-gtd',
        'name': 'GTD Productivity Planner',
        'niche': 'productivity_planner',
        'description': (
            'Getting Things Done inspired weekly planner with project brain-dump, '
            'next-action lists, and Pomodoro tracking blocks.'
        ),
        'trim_size': '8.5x11',
        'page_count': 180,
        'bleed': False,
        'features': ['gtd-workflow', 'weekly-spread', 'pomodoro-blocks'],
        'tier_required': 'free',
        'tags': ['planner', 'productivity', 'gtd'],
    },
    {
        'id': 'tpl-kids-phonics-workbook',
        'name': 'Phonics Practice Workbook',
        'niche': 'kids_workbook',
        'description': (
            'Ages 5–7 phonics workbook with letter tracing, sound-matching games, '
            'and progress stickers. Large print and high-contrast layouts for young learners.'
        ),
        'trim_size': '8.5x11',
        'page_count': 64,
        'bleed': False,
        'features': ['letter-tracing', 'gamified-rewards', 'large-print'],
        'tier_required': 'pro',
        'tags': ['kids', 'education', 'phonics'],
    },
    {
        'id': 'tpl-log-etsy-seller',
        'name': 'Etsy Seller Inventory Log',
        'niche': 'log_book',
        'description': (
            'Track listings, sales, fees, and restock dates for Etsy sellers. '
            'Industry-specific fields with large-print option for daily desk use.'
        ),
        'trim_size': '6x9',
        'page_count': 100,
        'bleed': False,
        'features': ['inventory-tracking', 'fee-calculator-fields', 'large-print'],
        'tier_required': 'free',
        'tags': ['log-book', 'etsy', 'business'],
    },
]
