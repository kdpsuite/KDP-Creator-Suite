import os
import jwt
from supabase import create_client, Client
from functools import wraps
from flask import request, jsonify

# Initialize Supabase client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

def get_supabase_user(token):
    """Verify Supabase JWT token and return user data"""
    try:
        # We can use supabase.auth.get_user(token) to verify the token
        user_resp = supabase.auth.get_user(token)
        return user_resp.user
    except Exception as e:
        print(f"Token verification failed: {e}")
        return None

def jwt_required():
    """Decorator to require Supabase JWT token"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'error': 'Missing or invalid token'}), 401
            
            token = auth_header.split(" ")[1]
            user = get_supabase_user(token)
            
            if not user:
                return jsonify({'error': 'Invalid or expired token'}), 401
            
            # Attach user to request context
            request.user = user
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def get_jwt_identity():
    """Helper to get user ID from request context"""
    return str(request.user.id) if hasattr(request, 'user') else None

class UserProfile:
    @staticmethod
    def get_by_id(user_id):
        res = supabase.table('user_profiles').select('*').eq('id', user_id).single().execute()
        return res.data if res.data else None

    @staticmethod
    def to_dict(profile):
        if not profile:
            return None
        return {
            'id': profile.get('id'),
            'username': profile.get('username'),
            'email': profile.get('email'),
            'subscription_tier': profile.get('subscription_tier', 'free'),
            'totp_enabled': profile.get('totp_enabled', False),
            'usage': {
                'conversions': profile.get('conversions_this_month', 0),
                'batch_operations': profile.get('batch_operations_this_month', 0),
                'last_reset': profile.get('last_usage_reset')
            },
            'created_at': profile.get('created_at')
        }

class BatchJob:
    @staticmethod
    def to_dict(job):
        if not job:
            return None
        total = job.get('total_files', 0)
        processed = job.get('processed_files', 0)
        return {
            'id': job.get('id'),
            'user_id': job.get('user_id'),
            'status': job.get('status'),
            'total_files': total,
            'processed_files': processed,
            'job_type': job.get('job_type'),
            'progress': round((processed / total * 100) if total > 0 else 0),
            'created_at': job.get('created_at'),
            'completed_at': job.get('completed_at'),
            'error_message': job.get('error_message')
        }
