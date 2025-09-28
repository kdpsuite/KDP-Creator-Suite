from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta
import json

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/track-event', methods=['POST'])
def track_event():
    """Track user events for analytics"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        event_name = data.get('event_name')
        event_properties = data.get('properties', {})
        
        if not event_name:
            return jsonify({'error': 'Missing event_name'}), 400
        
        # Create event record
        event_record = {
            'user_id': user_id,
            'event_name': event_name,
            'properties': event_properties,
            'timestamp': datetime.now().isoformat(),
            'session_id': data.get('session_id'),
            'platform': data.get('platform', 'unknown'),
            'app_version': data.get('app_version'),
        }
        
        # In a real implementation, this would save to database
        success = save_analytics_event(event_record)
        
        if success:
            return jsonify({
                'success': True,
                'event_id': generate_event_id(),
                'timestamp': event_record['timestamp'],
            })
        else:
            return jsonify({'error': 'Failed to track event'}), 500
        
    except Exception as e:
        current_app.logger.error(f"Error tracking event: {str(e)}")
        return jsonify({'error': 'Failed to track event'}), 500

@analytics_bp.route('/user-metrics/<user_id>', methods=['GET'])
def get_user_metrics(user_id):
    """Get analytics metrics for a specific user"""
    try:
        # Get query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()
        if not end_date:
            end_date = datetime.now().isoformat()
        
        # Get user metrics
        metrics = get_user_analytics_metrics(user_id, start_date, end_date)
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'date_range': {
                'start': start_date,
                'end': end_date,
            },
            'metrics': metrics,
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting user metrics: {str(e)}")
        return jsonify({'error': 'Failed to get user metrics'}), 500

@analytics_bp.route('/business-metrics', methods=['GET'])
def get_business_metrics():
    """Get business analytics metrics"""
    try:
        # Get query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()
        if not end_date:
            end_date = datetime.now().isoformat()
        
        # Get business metrics
        metrics = get_business_analytics_metrics(start_date, end_date)
        
        return jsonify({
            'success': True,
            'date_range': {
                'start': start_date,
                'end': end_date,
            },
            'metrics': metrics,
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting business metrics: {str(e)}")
        return jsonify({'error': 'Failed to get business metrics'}), 500

@analytics_bp.route('/conversion-funnel', methods=['GET'])
def get_conversion_funnel():
    """Get conversion funnel analytics"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()
        if not end_date:
            end_date = datetime.now().isoformat()
        
        # Get funnel data
        funnel_data = get_conversion_funnel_data(start_date, end_date)
        
        return jsonify({
            'success': True,
            'date_range': {
                'start': start_date,
                'end': end_date,
            },
            'funnel': funnel_data,
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting conversion funnel: {str(e)}")
        return jsonify({'error': 'Failed to get conversion funnel'}), 500

@analytics_bp.route('/feature-usage', methods=['GET'])
def get_feature_usage():
    """Get feature usage analytics"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()
        if not end_date:
            end_date = datetime.now().isoformat()
        
        # Get feature usage data
        feature_data = get_feature_usage_data(start_date, end_date)
        
        return jsonify({
            'success': True,
            'date_range': {
                'start': start_date,
                'end': end_date,
            },
            'feature_usage': feature_data,
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting feature usage: {str(e)}")
        return jsonify({'error': 'Failed to get feature usage'}), 500

@analytics_bp.route('/revenue-metrics', methods=['GET'])
def get_revenue_metrics():
    """Get revenue analytics metrics"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()
        if not end_date:
            end_date = datetime.now().isoformat()
        
        # Get revenue metrics
        revenue_data = get_revenue_analytics_data(start_date, end_date)
        
        return jsonify({
            'success': True,
            'date_range': {
                'start': start_date,
                'end': end_date,
            },
            'revenue': revenue_data,
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting revenue metrics: {str(e)}")
        return jsonify({'error': 'Failed to get revenue metrics'}), 500

# Helper functions

def save_analytics_event(event_record):
    """Save analytics event to database"""
    # In a real implementation, this would save to database
    return True

def generate_event_id():
    """Generate unique event ID"""
    import uuid
    return str(uuid.uuid4())

def get_user_analytics_metrics(user_id, start_date, end_date):
    """Get analytics metrics for a specific user"""
    # In a real implementation, this would query the database
    return {
        'total_sessions': 15,
        'total_conversions': 8,
        'total_batch_operations': 2,
        'avg_session_duration': 420,  # seconds
        'most_used_feature': 'pdf_conversion',
        'subscription_tier': 'pro',
        'last_active': datetime.now().isoformat(),
        'conversion_success_rate': 0.95,
        'favorite_formats': ['kindle_ebook', 'coloring_book_print'],
        'daily_activity': [
            {'date': '2024-01-01', 'sessions': 2, 'conversions': 1},
            {'date': '2024-01-02', 'sessions': 1, 'conversions': 0},
            {'date': '2024-01-03', 'sessions': 3, 'conversions': 2},
        ],
    }

def get_business_analytics_metrics(start_date, end_date):
    """Get business analytics metrics"""
    # In a real implementation, this would query the database
    return {
        'total_users': 1250,
        'active_users': 890,
        'new_users': 45,
        'total_conversions': 3420,
        'total_revenue': 15750.50,
        'conversion_rate': 0.12,  # Free to paid
        'churn_rate': 0.05,
        'avg_revenue_per_user': 17.70,
        'subscription_distribution': {
            'free': 850,
            'pro': 320,
            'studio': 80,
        },
        'growth_metrics': {
            'user_growth_rate': 0.08,
            'revenue_growth_rate': 0.15,
            'retention_rate': 0.85,
        },
        'top_features': [
            {'name': 'pdf_conversion', 'usage_count': 2100},
            {'name': 'image_to_coloring', 'usage_count': 890},
            {'name': 'batch_processing', 'usage_count': 430},
        ],
    }

def get_conversion_funnel_data(start_date, end_date):
    """Get conversion funnel data"""
    # In a real implementation, this would query the database
    return {
        'steps': [
            {
                'name': 'App Download',
                'users': 1000,
                'conversion_rate': 1.0,
            },
            {
                'name': 'Account Creation',
                'users': 850,
                'conversion_rate': 0.85,
            },
            {
                'name': 'First Conversion',
                'users': 680,
                'conversion_rate': 0.80,
            },
            {
                'name': 'Subscription View',
                'users': 340,
                'conversion_rate': 0.50,
            },
            {
                'name': 'Subscription Purchase',
                'users': 120,
                'conversion_rate': 0.35,
            },
        ],
        'overall_conversion_rate': 0.12,
        'drop_off_points': [
            {'step': 'Account Creation', 'drop_off_rate': 0.15},
            {'step': 'Subscription Purchase', 'drop_off_rate': 0.65},
        ],
    }

def get_feature_usage_data(start_date, end_date):
    """Get feature usage data"""
    # In a real implementation, this would query the database
    return {
        'features': [
            {
                'name': 'PDF Conversion',
                'usage_count': 2100,
                'unique_users': 650,
                'avg_uses_per_user': 3.2,
                'success_rate': 0.96,
            },
            {
                'name': 'Image to Coloring Book',
                'usage_count': 890,
                'unique_users': 320,
                'avg_uses_per_user': 2.8,
                'success_rate': 0.94,
            },
            {
                'name': 'Batch Processing',
                'usage_count': 430,
                'unique_users': 180,
                'avg_uses_per_user': 2.4,
                'success_rate': 0.92,
            },
            {
                'name': 'KDP Integration',
                'usage_count': 280,
                'unique_users': 95,
                'avg_uses_per_user': 2.9,
                'success_rate': 0.89,
            },
        ],
        'feature_adoption_rate': {
            'pdf_conversion': 0.85,
            'image_to_coloring': 0.42,
            'batch_processing': 0.23,
            'kdp_integration': 0.12,
        },
        'feature_retention': {
            'pdf_conversion': 0.78,
            'image_to_coloring': 0.65,
            'batch_processing': 0.71,
            'kdp_integration': 0.82,
        },
    }

def get_revenue_analytics_data(start_date, end_date):
    """Get revenue analytics data"""
    # In a real implementation, this would query the database
    return {
        'total_revenue': 15750.50,
        'monthly_recurring_revenue': 8900.00,
        'one_time_revenue': 6850.50,
        'revenue_by_tier': {
            'pro': 12600.00,
            'studio': 3150.50,
        },
        'revenue_growth': {
            'month_over_month': 0.15,
            'year_over_year': 0.85,
        },
        'customer_metrics': {
            'customer_acquisition_cost': 25.50,
            'lifetime_value': 180.00,
            'payback_period': 3.2,  # months
        },
        'churn_analysis': {
            'revenue_churn_rate': 0.04,
            'customer_churn_rate': 0.05,
            'churn_reasons': [
                {'reason': 'Price too high', 'percentage': 0.35},
                {'reason': 'Not enough usage', 'percentage': 0.28},
                {'reason': 'Missing features', 'percentage': 0.20},
                {'reason': 'Technical issues', 'percentage': 0.17},
            ],
        },
        'daily_revenue': [
            {'date': '2024-01-01', 'revenue': 520.00},
            {'date': '2024-01-02', 'revenue': 480.50},
            {'date': '2024-01-03', 'revenue': 650.00},
        ],
    }

