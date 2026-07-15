from flask import Blueprint
from src.models.user import supabase, UserProfile, jwt_required, get_jwt_identity
from src.utils.responses import success_response, error_response
from datetime import datetime, timedelta
from src.utils.logger import PerformanceTimer

analytics_bp = Blueprint('analytics', __name__)

CONVERSION_EVENT_TYPES = {
    'pdf_conversion',
    'pdf_coloring_conversion',
    'kdp_formatting',
    'kdp_validation',
}
BATCH_EVENT_TYPES = {
    'batch_process',
    'batch_coloring_conversion',
    'batch_coloring',
}


@analytics_bp.route('/user-metrics', methods=['GET'])
@jwt_required()
def get_user_metrics():
    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return error_response('User not found', 'USER_NOT_FOUND', status_code=404)

    from src.routes.subscription import SUBSCRIPTION_TIERS
    tier = profile.get('subscription_tier', 'free')
    tier_info = SUBSCRIPTION_TIERS.get(tier, SUBSCRIPTION_TIERS['free'])
    max_conversions = tier_info['monthly_conversions']
    max_batch = tier_info['batch_processing_limit']

    with PerformanceTimer("fetch_user_analytics"):
        today = datetime.now().date()
        thirty_days_ago = today - timedelta(days=30)

        res = supabase.table('analytics_events').select(
            'event_type, created_at, event_data'
        ).eq('user_id', str(user_id)).gte(
            'created_at', thirty_days_ago.isoformat()
        ).order('created_at', desc=False).execute()
        events = res.data or []

        daily_activity_map = {
            (today - timedelta(days=i)).strftime('%Y-%m-%d'): {
                'conversions': 0,
                'batch_ops': 0,
            }
            for i in range(30)
        }

        file_types = {}
        for event in events:
            created_at = event.get('created_at')
            if not created_at:
                continue
            try:
                event_date = datetime.fromisoformat(
                    created_at.replace('Z', '+00:00')
                ).strftime('%Y-%m-%d')
            except ValueError:
                continue

            event_type = event.get('event_type') or ''
            if event_date in daily_activity_map:
                if event_type in CONVERSION_EVENT_TYPES:
                    daily_activity_map[event_date]['conversions'] += 1
                elif event_type in BATCH_EVENT_TYPES:
                    daily_activity_map[event_date]['batch_ops'] += 1

            event_data = event.get('event_data') or {}
            fmt = event_data.get('format')
            if fmt:
                file_types[fmt] = file_types.get(fmt, 0) + 1

        daily_activity = [
            {'date': date, 'conversions': data['conversions'], 'batch_ops': data['batch_ops']}
            for date, data in daily_activity_map.items()
        ]
        daily_activity.sort(key=lambda x: x['date'])

        conversions = sum(d['conversions'] for d in daily_activity)
        batch_ops = sum(d['batch_ops'] for d in daily_activity)

        profile_conversions = profile.get('conversions_this_month', conversions)
        profile_batch = profile.get('batch_operations_this_month', batch_ops)

    return success_response({
        'user_id': user_id,
        'metrics': {
            'total_conversions': max(conversions, profile_conversions or 0),
            'total_batch_operations': max(batch_ops, profile_batch or 0),
            'subscription_tier': tier,
            'storage_used_mb': profile.get('storage_used_mb', 0) or 0,
            'last_active': profile.get('updated_at', datetime.now().isoformat()),
            'daily_activity': daily_activity,
            'file_types': file_types,
            'usage_quota': {
                'conversions_used': max(conversions, profile_conversions or 0),
                'conversions_limit': max_conversions,
                'batch_used': max(batch_ops, profile_batch or 0),
                'batch_limit': max_batch,
            },
        },
    })


@analytics_bp.route('/business-metrics', methods=['GET'])
@jwt_required()
def get_business_metrics():
    try:
        res = supabase.table('user_profiles').select('subscription_tier').execute()
        profiles = res.data or []

        total_users = len(profiles)
        users_by_tier = {
            'free': sum(1 for p in profiles if p.get('subscription_tier') == 'free'),
            'pro': sum(1 for p in profiles if p.get('subscription_tier') == 'pro'),
            'studio': sum(1 for p in profiles if p.get('subscription_tier') == 'studio'),
        }

        return success_response({
            'metrics': {
                'total_users': total_users,
                'subscription_distribution': users_by_tier,
                'total_revenue': (users_by_tier['pro'] * 19.99) + (users_by_tier['studio'] * 49.99),
            }
        })
    except Exception as e:
        return error_response(
            f'Failed to fetch business metrics: {str(e)}',
            'DATABASE_ERROR',
            status_code=500,
        )
