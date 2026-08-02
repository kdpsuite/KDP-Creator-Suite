from datetime import datetime

from flask import Blueprint, request, jsonify
from src.models.user import supabase, UserProfile, jwt_required, get_jwt_identity
from src.utils.responses import success_response, error_response

subscription_bp = Blueprint('subscription', __name__)

# Subscription tier definitions
SUBSCRIPTION_TIERS = {
    'free': {
        'name': 'Free',
        'monthly_conversions': 5,
        'batch_processing_limit': 1,
        'watermark_free': False,
        'priority_support': False,
        'advanced_features': False,
        'cloud_storage': False,
        'kdp_integration': False,
        'price': 0,
    },
    'pro': {
        'name': 'Pro',
        'monthly_conversions': -1,  # Unlimited
        'batch_processing_limit': 10,
        'watermark_free': True,
        'priority_support': True,
        'advanced_features': True,
        'cloud_storage': True,
        'kdp_integration': True,
        'price': 19.99,
    },
    'studio': {
        'name': 'Studio',
        'monthly_conversions': -1,  # Unlimited
        'batch_processing_limit': -1,  # Unlimited
        'watermark_free': True,
        'priority_support': True,
        'advanced_features': True,
        'cloud_storage': True,
        'kdp_integration': True,
        'price': 49.99,
    },
    # Owner/admin accounts may be stored as "unlimited" in user_profiles
    'unlimited': {
        'name': 'Admin',
        'monthly_conversions': -1,
        'batch_processing_limit': -1,
        'watermark_free': True,
        'priority_support': True,
        'advanced_features': True,
        'cloud_storage': True,
        'kdp_integration': True,
        'price': 0,
    },
}

@subscription_bp.route('/tiers', methods=['GET'])
def get_subscription_tiers():
    return success_response({'tiers': SUBSCRIPTION_TIERS})

@subscription_bp.route('/status', methods=['GET'])
@jwt_required()
def get_subscription_status():
    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        tier_limits = SUBSCRIPTION_TIERS['free']
        return success_response({
            'user_id': user_id,
            'tier': 'free',
            'tier_details': tier_limits,
            'current_usage': {
                'conversions': 0,
                'batch_operations': 0,
            },
            'remaining_usage': {
                'conversions': tier_limits['monthly_conversions'],
                'batch_operations': tier_limits['batch_processing_limit'],
            },
        })
        
    tier = profile.get('subscription_tier', 'free')
    tier_limits = SUBSCRIPTION_TIERS.get(tier, SUBSCRIPTION_TIERS['free'])
    
    conversions = profile.get('conversions_this_month', 0)
    batch_ops = profile.get('batch_operations_this_month', 0)

    # Calculate remaining usage
    remaining_conversions = (
        -1 if tier_limits['monthly_conversions'] == -1 
        else max(0, tier_limits['monthly_conversions'] - conversions)
    )
    
    remaining_batch_operations = (
        -1 if tier_limits['batch_processing_limit'] == -1 
        else max(0, tier_limits['batch_processing_limit'] - batch_ops)
    )
    
    return success_response({
        'user_id': user_id,
        'tier': tier,
        'tier_details': tier_limits,
        'current_usage': {
            'conversions': conversions,
            'batch_operations': batch_ops
        },
        'remaining_usage': {
            'conversions': remaining_conversions,
            'batch_operations': remaining_batch_operations,
        }
    })

def _tier_usage_for_user(user_id):
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return SUBSCRIPTION_TIERS['free'], 0, 0
    tier = profile.get('subscription_tier', 'free')
    limits = SUBSCRIPTION_TIERS.get(tier, SUBSCRIPTION_TIERS['free'])
    conversions = profile.get('conversions_this_month', 0) or 0
    batch_ops = profile.get('batch_operations_this_month', 0) or 0
    return limits, conversions, batch_ops


def enforce_conversion_quota(user_id):
    """Return an error response if the user cannot run another conversion, else None."""
    limits, used, _ = _tier_usage_for_user(user_id)
    limit = limits['monthly_conversions']
    if limit == -1:
        return None
    if used >= limit:
        return error_response(
            'Monthly conversion limit reached. Upgrade your plan to continue.',
            'QUOTA_EXCEEDED',
            details={'kind': 'conversions', 'used': used, 'limit': limit},
            status_code=403,
        )
    return None


def enforce_batch_quota(user_id):
    """Return an error response if the user cannot run another batch op, else None."""
    limits, _, used = _tier_usage_for_user(user_id)
    limit = limits['batch_processing_limit']
    if limit == -1:
        return None
    if used >= limit:
        return error_response(
            'Monthly batch processing limit reached. Upgrade your plan to continue.',
            'QUOTA_EXCEEDED',
            details={'kind': 'batch_operations', 'used': used, 'limit': limit},
            status_code=403,
        )
    return None


def record_conversion_usage(user_id, amount=1):
    if not supabase or amount < 1:
        return
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return
    current = profile.get('conversions_this_month', 0) or 0
    try:
        supabase.table('user_profiles').update({
            'conversions_this_month': current + amount,
            'updated_at': datetime.utcnow().isoformat(),
        }).eq('id', str(user_id)).execute()
    except Exception as usage_error:
        print(f'Failed to record conversion usage for {user_id}: {usage_error}')


def record_batch_usage(user_id, amount=1):
    if not supabase or amount < 1:
        return
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return
    current = profile.get('batch_operations_this_month', 0) or 0
    try:
        supabase.table('user_profiles').update({
            'batch_operations_this_month': current + amount,
            'updated_at': datetime.utcnow().isoformat(),
        }).eq('id', str(user_id)).execute()
    except Exception as usage_error:
        print(f'Failed to record batch usage for {user_id}: {usage_error}')


@subscription_bp.route('/upgrade', methods=['POST'])
@jwt_required()
def upgrade_subscription():
    user_id = get_jwt_identity()
    data = request.get_json()
    new_tier = data.get('tier')
    
    if new_tier not in SUBSCRIPTION_TIERS:
        return error_response('Invalid subscription tier', 'INVALID_TIER', status_code=400)
    
    try:
        res = supabase.table('user_profiles').update({'subscription_tier': new_tier}).eq('id', user_id).execute()
        if not res.data:
            return error_response('User not found', 'USER_NOT_FOUND', status_code=404)
        
        return success_response({
            'user_id': user_id,
            'new_tier': new_tier,
            'tier_details': SUBSCRIPTION_TIERS[new_tier]
        })
    except Exception as e:
        return error_response(f'Upgrade failed: {str(e)}', 'DATABASE_ERROR', status_code=500)
