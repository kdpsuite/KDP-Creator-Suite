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
