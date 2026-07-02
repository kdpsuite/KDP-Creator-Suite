from flask import Blueprint, request, jsonify
from src.models.user import supabase, UserProfile, jwt_required, get_jwt_identity
from src.utils.responses import success_response, error_response
from datetime import datetime, timedelta
from src.utils.performance import PerformanceTimer

analytics_bp = Blueprint('analytics', __name__)

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



    # Generate daily activity (mock for now, or query analytics_events table if exists)
    # Using a hash of user_id for deterministic seed
    with PerformanceTimer("fetch_user_analytics"):
        # Fetch real analytics data from the new analytics_events table
        today = datetime.now().date()
        thirty_days_ago = today - timedelta(days=30)

        # Fetch events for the last 30 days
        res = supabase.table('analytics_events').select('event_type, created_at, event_data').eq('user_id', str(user_id)).gte('created_at', thirty_days_ago.isoformat()).order('created_at', desc=False).execute()
        events = res.data

        daily_activity_map = { (today - timedelta(days=i)).strftime('%Y-%m-%d'): {'conversions': 0, 'batch_ops': 0} for i in range(30) }

        for event in events:
            event_date = datetime.fromisoformat(event['created_at']).strftime('%Y-%m-%d')
            if event_date in daily_activity_map:
                if event['event_type'] == 'pdf_conversion':
                    daily_activity_map[event_date]['conversions'] += 1
                elif event['event_type'] == 'batch_process':
                    daily_activity_map[event_date]['batch_ops'] += 1
        
        daily_activity = [{'date': date, 'conversions': data['conversions'], 'batch_ops': data['batch_ops']} for date, data in daily_activity_map.items()]
        daily_activity.sort(key=lambda x: x['date'])

        # Calculate total conversions and batch ops for the month
        conversions = sum(d['conversions'] for d in daily_activity)
        batch_ops = sum(d['batch_ops'] for d in daily_activity)

        # Determine file types and success rates (mock for now, or aggregate from event_data)
    return success_response({
        'user_id': user_id,
        'metrics': {
            'total_conversions': conversions,
            'total_batch_operations': batch_ops,
            'subscription_tier': tier,
            'last_active': profile.get('updated_at', datetime.now().isoformat()),
            'daily_activity': daily_activity,
            'file_types': file_types,
            'usage_quota': {
                'conversions_used': conversions,
                'conversions_limit': max_conversions,
                'batch_used': batch_ops,
                'batch_limit': max_batch
            }
        }
    })

@analytics_bp.route('/business-metrics', methods=['GET'])
@jwt_required()
def get_business_metrics():
    # Admin only check could be added here
    try:
        res = supabase.table('user_profiles').select('subscription_tier').execute()
        profiles = res.data
        
        total_users = len(profiles)
        users_by_tier = {
            'free': sum(1 for p in profiles if p['subscription_tier'] == 'free'),
            'pro': sum(1 for p in profiles if p['subscription_tier'] == 'pro'),
            'studio': sum(1 for p in profiles if p['subscription_tier'] == 'studio'),
        }

        return success_response({
            'metrics': {
                'total_users': total_users,
                'subscription_distribution': users_by_tier,
                'total_revenue': (users_by_tier['pro'] * 19.99) + (users_by_tier['studio'] * 49.99),
            }
        })
    except Exception as e:
        return error_response(f'Failed to fetch business metrics: {str(e)}', 'DATABASE_ERROR', status_code=500)
