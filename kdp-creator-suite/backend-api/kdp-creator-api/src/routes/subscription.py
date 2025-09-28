from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta
import json
from src.models.user import db

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
    """Get available subscription tiers"""
    try:
        return jsonify({
            'success': True,
            'tiers': SUBSCRIPTION_TIERS,
        })
    except Exception as e:
        current_app.logger.error(f"Error getting subscription tiers: {str(e)}")
        return jsonify({'error': 'Failed to get subscription tiers'}), 500

@subscription_bp.route('/status/<user_id>', methods=['GET'])
def get_subscription_status(user_id):
    """Get subscription status for a user"""
    try:
        # In a real implementation, this would query the database
        # For now, we'll simulate the response
        
        # Get current usage from database (simulated)
        current_usage = get_user_usage(user_id)
        user_tier = get_user_tier(user_id)
        
        tier_limits = SUBSCRIPTION_TIERS[user_tier]
        
        # Calculate remaining usage
        remaining_conversions = (
            -1 if tier_limits['monthly_conversions'] == -1 
            else max(0, tier_limits['monthly_conversions'] - current_usage.get('conversions', 0))
        )
        
        remaining_batch_operations = (
            -1 if tier_limits['batch_processing_limit'] == -1 
            else max(0, tier_limits['batch_processing_limit'] - current_usage.get('batch_operations', 0))
        )
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'tier': user_tier,
            'tier_details': tier_limits,
            'current_usage': current_usage,
            'remaining_usage': {
                'conversions': remaining_conversions,
                'batch_operations': remaining_batch_operations,
            },
            'billing_cycle': {
                'start_date': get_billing_cycle_start(user_id),
                'end_date': get_billing_cycle_end(user_id),
            },
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting subscription status: {str(e)}")
        return jsonify({'error': 'Failed to get subscription status'}), 500

@subscription_bp.route('/check-permission', methods=['POST'])
def check_permission():
    """Check if user can perform a specific action"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        action = data.get('action')
        
        if not user_id or not action:
            return jsonify({'error': 'Missing user_id or action'}), 400
        
        can_perform = can_user_perform_action(user_id, action)
        
        return jsonify({
            'success': True,
            'can_perform': can_perform,
            'action': action,
            'user_id': user_id,
        })
        
    except Exception as e:
        current_app.logger.error(f"Error checking permission: {str(e)}")
        return jsonify({'error': 'Failed to check permission'}), 500

@subscription_bp.route('/track-usage', methods=['POST'])
def track_usage():
    """Track usage for a user action"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        action = data.get('action')
        
        if not user_id or not action:
            return jsonify({'error': 'Missing user_id or action'}), 400
        
        # Update usage in database
        success = update_user_usage(user_id, action)
        
        if success:
            # Get updated usage
            updated_usage = get_user_usage(user_id)
            
            return jsonify({
                'success': True,
                'action': action,
                'updated_usage': updated_usage,
            })
        else:
            return jsonify({'error': 'Failed to track usage'}), 500
        
    except Exception as e:
        current_app.logger.error(f"Error tracking usage: {str(e)}")
        return jsonify({'error': 'Failed to track usage'}), 500

@subscription_bp.route('/upgrade', methods=['POST'])
def upgrade_subscription():
    """Upgrade user subscription"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        new_tier = data.get('tier')
        payment_method = data.get('payment_method')
        
        if not user_id or not new_tier:
            return jsonify({'error': 'Missing user_id or tier'}), 400
        
        if new_tier not in SUBSCRIPTION_TIERS:
            return jsonify({'error': 'Invalid subscription tier'}), 400
        
        # In a real implementation, this would:
        # 1. Process payment
        # 2. Update user subscription in database
        # 3. Send confirmation email
        # 4. Update usage limits
        
        success = upgrade_user_subscription(user_id, new_tier, payment_method)
        
        if success:
            return jsonify({
                'success': True,
                'user_id': user_id,
                'new_tier': new_tier,
                'tier_details': SUBSCRIPTION_TIERS[new_tier],
                'effective_date': datetime.now().isoformat(),
            })
        else:
            return jsonify({'error': 'Failed to upgrade subscription'}), 500
        
    except Exception as e:
        current_app.logger.error(f"Error upgrading subscription: {str(e)}")
        return jsonify({'error': 'Failed to upgrade subscription'}), 500

@subscription_bp.route('/cancel', methods=['POST'])
def cancel_subscription():
    """Cancel user subscription"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        reason = data.get('reason', '')
        
        if not user_id:
            return jsonify({'error': 'Missing user_id'}), 400
        
        # In a real implementation, this would:
        # 1. Cancel recurring billing
        # 2. Set subscription to expire at end of current period
        # 3. Send confirmation email
        # 4. Log cancellation reason
        
        success = cancel_user_subscription(user_id, reason)
        
        if success:
            return jsonify({
                'success': True,
                'user_id': user_id,
                'cancellation_date': datetime.now().isoformat(),
                'access_until': get_billing_cycle_end(user_id),
            })
        else:
            return jsonify({'error': 'Failed to cancel subscription'}), 500
        
    except Exception as e:
        current_app.logger.error(f"Error canceling subscription: {str(e)}")
        return jsonify({'error': 'Failed to cancel subscription'}), 500

@subscription_bp.route('/usage-analytics/<user_id>', methods=['GET'])
def get_usage_analytics(user_id):
    """Get usage analytics for a user"""
    try:
        # Get usage history for the last 6 months
        usage_history = get_user_usage_history(user_id, months=6)
        
        # Calculate analytics
        analytics = calculate_usage_analytics(usage_history)
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'usage_history': usage_history,
            'analytics': analytics,
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting usage analytics: {str(e)}")
        return jsonify({'error': 'Failed to get usage analytics'}), 500

# Helper functions

def get_user_usage(user_id):
    """Get current month usage for a user"""
    # In a real implementation, this would query the database
    # For now, return simulated data
    return {
        'conversions': 2,
        'batch_operations': 0,
        'last_updated': datetime.now().isoformat(),
    }

def get_user_tier(user_id):
    """Get user's current subscription tier"""
    # In a real implementation, this would query the database
    # For now, return 'free' as default
    return 'free'

def get_billing_cycle_start(user_id):
    """Get billing cycle start date for user"""
    # For now, return start of current month
    now = datetime.now()
    return datetime(now.year, now.month, 1).isoformat()

def get_billing_cycle_end(user_id):
    """Get billing cycle end date for user"""
    # For now, return end of current month
    now = datetime.now()
    if now.month == 12:
        next_month = datetime(now.year + 1, 1, 1)
    else:
        next_month = datetime(now.year, now.month + 1, 1)
    return (next_month - timedelta(days=1)).isoformat()

def can_user_perform_action(user_id, action):
    """Check if user can perform a specific action based on their tier and usage"""
    user_tier = get_user_tier(user_id)
    tier_limits = SUBSCRIPTION_TIERS[user_tier]
    current_usage = get_user_usage(user_id)
    
    if action in ['pdf_conversion', 'image_to_coloring_conversion']:
        if tier_limits['monthly_conversions'] == -1:
            return True  # Unlimited
        return current_usage.get('conversions', 0) < tier_limits['monthly_conversions']
    
    elif action == 'batch_processing':
        if not tier_limits['advanced_features']:
            return False
        if tier_limits['batch_processing_limit'] == -1:
            return True  # Unlimited
        return current_usage.get('batch_operations', 0) < tier_limits['batch_processing_limit']
    
    elif action == 'watermark_free':
        return tier_limits['watermark_free']
    
    elif action == 'cloud_storage':
        return tier_limits['cloud_storage']
    
    elif action == 'kdp_integration':
        return tier_limits['kdp_integration']
    
    elif action == 'priority_support':
        return tier_limits['priority_support']
    
    return False

def update_user_usage(user_id, action):
    """Update user usage for a specific action"""
    # In a real implementation, this would update the database
    # For now, return True to simulate success
    return True

def upgrade_user_subscription(user_id, new_tier, payment_method):
    """Upgrade user subscription"""
    # In a real implementation, this would:
    # 1. Process payment
    # 2. Update database
    # 3. Send notifications
    return True

def cancel_user_subscription(user_id, reason):
    """Cancel user subscription"""
    # In a real implementation, this would:
    # 1. Cancel billing
    # 2. Update database
    # 3. Send notifications
    return True

def get_user_usage_history(user_id, months=6):
    """Get usage history for a user"""
    # In a real implementation, this would query the database
    # For now, return simulated data
    history = []
    for i in range(months):
        date = datetime.now() - timedelta(days=30 * i)
        history.append({
            'month': date.strftime('%Y-%m'),
            'conversions': max(0, 10 - i * 2),
            'batch_operations': max(0, 3 - i),
        })
    return history

def calculate_usage_analytics(usage_history):
    """Calculate usage analytics from history"""
    if not usage_history:
        return {}
    
    total_conversions = sum(month['conversions'] for month in usage_history)
    total_batch_operations = sum(month['batch_operations'] for month in usage_history)
    avg_conversions = total_conversions / len(usage_history)
    
    return {
        'total_conversions': total_conversions,
        'total_batch_operations': total_batch_operations,
        'average_monthly_conversions': round(avg_conversions, 2),
        'most_active_month': max(usage_history, key=lambda x: x['conversions'])['month'],
        'trend': 'increasing' if usage_history[0]['conversions'] > usage_history[-1]['conversions'] else 'decreasing',
    }

