from flask import Blueprint, request, jsonify
from src.models.user import supabase, UserProfile, jwt_required, get_jwt_identity
from src.utils.responses import success_response, error_response
from datetime import datetime, timedelta
import random

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

    conversions = profile.get('conversions_this_month', 0)
    batch_ops = profile.get('batch_operations_this_month', 0)

    # Generate daily activity (mock for now, or query analytics_events table if exists)
    # Using a hash of user_id for deterministic seed
    random.seed(hash(user_id))
    daily_activity = []
    for i in range(30):
        d = datetime.now() - timedelta(days=29 - i)
        daily_activity.append({
            'date': d.strftime('%Y-%m-%d'),
            'conversions': random.randint(0, 4),
            'batch_ops': random.randint(0, 2)
        })

    file_types = [
        {'type': 'PDF', 'count': max(1, conversions * 60 // 100), 'success_rate': 94},
        {'type': 'Image', 'count': max(1, conversions * 30 // 100), 'success_rate': 98},
        {'type': 'EPUB', 'count': max(1, conversions * 10 // 100), 'success_rate': 87},
    ]

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
