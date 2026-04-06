from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from src.models.user import User, db

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/user-metrics', methods=['GET'])
@jwt_required()
def get_user_metrics():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Return metrics based on real database fields
    return jsonify({
        'success': True,
        'user_id': user.id,
        'metrics': {
            'total_conversions': user.conversions_this_month,
            'total_batch_operations': user.batch_operations_this_month,
            'subscription_tier': user.subscription_tier,
            'last_active': user.updated_at.isoformat() if user.updated_at else datetime.now().isoformat(),
            # These would ideally be tracked in a separate table, but for now, we provide the user stats
            'daily_activity': [
                {'date': datetime.now().strftime('%Y-%m-%d'), 'conversions': user.conversions_this_month}
            ],
        }
    })

@analytics_bp.route('/business-metrics', methods=['GET'])
@jwt_required()
def get_business_metrics():
    # Admin only check could be added here
    total_users = User.query.count()
    users_by_tier = {
        'free': User.query.filter_by(subscription_tier='free').count(),
        'pro': User.query.filter_by(subscription_tier='pro').count(),
        'studio': User.query.filter_by(subscription_tier='studio').count(),
    }
    
    return jsonify({
        'success': True,
        'metrics': {
            'total_users': total_users,
            'subscription_distribution': users_by_tier,
            # Mock revenue for demo
            'total_revenue': (users_by_tier['pro'] * 19.99) + (users_by_tier['studio'] * 49.99),
        }
    })
