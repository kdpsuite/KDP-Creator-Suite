from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from src.models.user import User, db

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
    return jsonify({
        'success': True,
        'tiers': SUBSCRIPTION_TIERS,
    })

@subscription_bp.route('/status', methods=['GET'])
@jwt_required()
def get_subscription_status():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    tier_limits = SUBSCRIPTION_TIERS.get(user.subscription_tier, SUBSCRIPTION_TIERS['free'])
    
    # Calculate remaining usage
    remaining_conversions = (
        -1 if tier_limits['monthly_conversions'] == -1 
        else max(0, tier_limits['monthly_conversions'] - user.conversions_this_month)
    )
    
    remaining_batch_operations = (
        -1 if tier_limits['batch_processing_limit'] == -1 
        else max(0, tier_limits['batch_processing_limit'] - user.batch_operations_this_month)
    )
    
    return jsonify({
        'success': True,
        'user_id': user.id,
        'tier': user.subscription_tier,
        'tier_details': tier_limits,
        'current_usage': {
            'conversions': user.conversions_this_month,
            'batch_operations': user.batch_operations_this_month
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
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    data = request.get_json()
    new_tier = data.get('tier')
    
    if new_tier not in SUBSCRIPTION_TIERS:
        return jsonify({'error': 'Invalid subscription tier'}), 400
    
    # In a real implementation, you would process payment here
    user.subscription_tier = new_tier
    db.session.commit()
    
    return jsonify({
        'success': True,
        'user_id': user.id,
        'new_tier': new_tier,
        'tier_details': SUBSCRIPTION_TIERS[new_tier]
    })
