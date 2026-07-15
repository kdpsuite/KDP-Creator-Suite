import os
import jwt
from functools import wraps
from flask import request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()

# Initialize Supabase client (resilient - won't crash if env vars missing)
supabase = None
try:
    from supabase import create_client, Client
    url = os.environ.get("SUPABASE_URL")
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SERVICE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
    )
    if url and key:
        supabase = create_client(url, key)
    else:
        print("Warning: SUPABASE_URL or key not set. Supabase client disabled.")
except Exception as e:
    print(f"Warning: Failed to initialize Supabase client: {e}")


def get_supabase_user(token):
    """Verify Supabase JWT token and return user data"""
    if not supabase:
        return None
    try:
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
        if not supabase:
            return None
        try:
            res = supabase.table('user_profiles').select('*').eq('id', user_id).maybe_single().execute()
            return res.data if res.data else None
        except Exception as profile_error:
            print(f"Failed to fetch user profile {user_id}: {profile_error}")
            return None

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


# Legacy SQLAlchemy User model (kept for migration compatibility)
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    supabase_uuid = db.Column(db.String(36), unique=True, nullable=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=True)
    subscription_tier = db.Column(db.String(20), default='free')
    conversions_this_month = db.Column(db.Integer, default=0)
    batch_operations_this_month = db.Column(db.Integer, default=0)
    last_usage_reset = db.Column(db.DateTime)
    totp_secret = db.Column(db.String(32), nullable=True)
    totp_enabled = db.Column(db.Boolean, default=False)
    reset_token = db.Column(db.String(100), unique=True, nullable=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime)
    updated_at = db.Column(db.DateTime)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'subscription_tier': self.subscription_tier,
            'totp_enabled': self.totp_enabled,
            'usage': {
                'conversions': self.conversions_this_month,
                'batch_operations': self.batch_operations_this_month,
                'last_reset': self.last_usage_reset.isoformat() if self.last_usage_reset else None
            },
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Session(db.Model):
    __tablename__ = 'sessions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.String(500), unique=True, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    last_activity = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime)
