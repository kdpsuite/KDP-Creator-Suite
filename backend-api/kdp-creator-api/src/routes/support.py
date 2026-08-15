"""Lightweight support ticket intake (no third-party help desk)."""

from flask import Blueprint, request

from src.models.user import supabase, jwt_required, get_jwt_identity
from src.utils.responses import success_response, error_response
from src.utils.rate_limit import rate_limit

support_bp = Blueprint('support', __name__)

ALLOWED_CATEGORIES = frozenset({
    'billing',
    'account',
    'convert',
    'batch',
    'bug',
    'other',
})

MAX_SUBJECT = 120
MAX_BODY = 4000


@support_bp.route('/support/ticket', methods=['POST'])
@jwt_required()
@rate_limit(max_requests=8, window_seconds=3600)
def create_support_ticket():
    user_id = get_jwt_identity()
    payload = request.get_json(silent=True) or {}

    category = str(payload.get('category') or 'other').strip().lower()
    subject = str(payload.get('subject') or '').strip()
    body = str(payload.get('body') or '').strip()

    if category not in ALLOWED_CATEGORIES:
        return error_response(
            'Invalid category',
            'INVALID_CATEGORY',
            status_code=400,
        )
    if not subject or len(subject) > MAX_SUBJECT:
        return error_response(
            f'Subject required (max {MAX_SUBJECT} chars)',
            'INVALID_SUBJECT',
            status_code=400,
        )
    if not body or len(body) > MAX_BODY:
        return error_response(
            f'Message required (max {MAX_BODY} chars)',
            'INVALID_BODY',
            status_code=400,
        )

    event_data = {
        'category': category,
        'subject': subject,
        'body': body,
        'channel': 'in_app',
    }

    try:
        supabase.table('analytics_events').insert({
            'user_id': user_id,
            'event_type': 'support_ticket',
            'event_data': event_data,
        }).execute()
    except Exception as exc:
        return error_response(
            f'Failed to record ticket: {exc}',
            'DATABASE_ERROR',
            status_code=500,
        )

    return success_response(
        {
            'recorded': True,
            'sla': '1–2 business days via email for follow-up',
            'mailto_hint': 'support@kdpsuite.com',
        },
        message='Support ticket recorded',
        status_code=201,
    )
