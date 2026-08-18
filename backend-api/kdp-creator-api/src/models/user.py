import os
import urllib.error
import urllib.request
from functools import wraps

from flask import g, has_request_context, request
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from src.utils.responses import error_response

db = SQLAlchemy()
bcrypt = Bcrypt()

MFA_HEADER = "X-MFA-Token"
MFA_SALT = "kdp-mfa-session"
_MFA_EXEMPT_PATHS = frozenset(
    {
        "/api/2fa/validate",
        "/api/2fa/setup",
        "/api/2fa/verify",
        "/api/2fa/disable",
        "/api/me",
        "/api/user/profile-sync",
        "/api/logout",
        "/api/validate-session",
        "/api/session/restore",
    }
)

# Initialize Supabase client (resilient - won't crash if env vars missing)
supabase = None
_create_supabase_client = None
try:
    from supabase import create_client as _create_supabase_client

    url = os.environ.get("SUPABASE_URL")
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SERVICE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
    )
    if url and key:
        supabase = _create_supabase_client(url, key)
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


def bearer_token():
    if not has_request_context():
        return None
    auth_header = request.headers.get("Authorization") or ""
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        return token or None
    return None


def user_scoped_client(token=None):
    """Anon-key PostgREST/storage client authenticated as the caller so RLS applies."""
    access_token = token or bearer_token()
    if not access_token:
        return None
    cacheable = has_request_context() and token is None
    if cacheable:
        cached = getattr(g, "_user_scoped_supabase", None)
        if cached is not None:
            return cached
    url = os.environ.get("SUPABASE_URL")
    anon = os.environ.get("SUPABASE_ANON_KEY")
    if not url or not anon or _create_supabase_client is None:
        return None
    try:
        client = _create_supabase_client(url, anon)
        client.postgrest.auth(access_token)
        try:
            client.storage._client.session.headers["Authorization"] = f"Bearer {access_token}"
        except Exception:
            try:
                client.storage._client.headers["Authorization"] = f"Bearer {access_token}"
            except Exception:
                pass
        if cacheable:
            g._user_scoped_supabase = client
        return client
    except Exception as client_error:
        print(f"Warning: Failed to create user-scoped Supabase client: {client_error}")
        return None


def data_client():
    """User JWT when present so RLS is a control; service role only off-request."""
    scoped = user_scoped_client()
    if scoped is not None:
        return scoped
    return supabase


def revoke_supabase_session(access_token, scope="global"):
    """Revoke refresh tokens. Prefer GoTrue admin, else the user logout endpoint."""
    if not access_token:
        raise RuntimeError("Missing access token")
    if supabase is not None:
        admin = getattr(supabase.auth, "admin", None)
        sign_out = getattr(admin, "sign_out", None) if admin is not None else None
        if callable(sign_out):
            try:
                return sign_out(access_token, scope)
            except TypeError:
                return sign_out(access_token, scope=scope)
    url = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    api_key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SERVICE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or ""
    )
    if not url or not api_key:
        raise RuntimeError("Supabase is not configured")

    req = urllib.request.Request(
        f"{url}/auth/v1/logout?scope={scope}",
        data=b"",
        method="POST",
    )
    req.add_header("Authorization", f"Bearer {access_token}")
    req.add_header("apikey", api_key)
    req.add_header("Content-Type", "application/json")
    try:
        urllib.request.urlopen(req, timeout=10)
    except urllib.error.HTTPError as http_error:
        if http_error.code in (401, 404):
            return None
        raise


def _mfa_max_age():
    try:
        return int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES", "86400"))
    except ValueError:
        return 86400


def _mfa_serializer():
    secret = os.environ.get("JWT_SECRET_KEY") or os.environ.get("SECRET_KEY")
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY or SECRET_KEY is required to sign MFA tokens")
    return URLSafeTimedSerializer(str(secret), salt=MFA_SALT)


def issue_mfa_token(user_id):
    return _mfa_serializer().dumps({"uid": str(user_id)})


def verify_mfa_token(user_id, token):
    if not token or not user_id:
        return False
    try:
        data = _mfa_serializer().loads(token, max_age=_mfa_max_age())
        return str(data.get("uid")) == str(user_id)
    except (BadSignature, SignatureExpired, TypeError, ValueError, RuntimeError):
        return False


def _request_path():
    return (request.path or "").rstrip("/") or "/"


def _mfa_header_token():
    return request.headers.get(MFA_HEADER) or request.headers.get("X-Mfa-Token")


def _enforce_mfa_if_required(user):
    if _request_path() in _MFA_EXEMPT_PATHS:
        return None
    profile = UserProfile.get_by_id(str(user.id))
    if not profile or not profile.get("totp_enabled"):
        return None
    if verify_mfa_token(str(user.id), _mfa_header_token()):
        return None
    return error_response(
        "Multi-factor authentication required",
        "MFA_REQUIRED",
        status_code=403,
    )


def admin_emails():
    raw = os.environ.get("ADMIN_EMAILS", "")
    return {item.strip().lower() for item in raw.split(",") if item.strip()}


def user_is_admin(user, profile=None):
    """Deny by default. Allow only ADMIN_EMAILS or an explicit admin role."""
    user_email = ""
    if user is not None:
        user_email = (getattr(user, "email", None) or "").strip().lower()
    if not user_email and profile:
        user_email = (profile.get("email") or "").strip().lower()
    if user_email and user_email in admin_emails():
        return True

    role = None
    if profile:
        role = profile.get("role")
    if user is not None:
        app_metadata = getattr(user, "app_metadata", None) or {}
        user_metadata = getattr(user, "user_metadata", None) or {}
        role = role or app_metadata.get("role") or user_metadata.get("role")
    return isinstance(role, str) and role.strip().lower() == "admin"


def jwt_required():
    """Decorator to require Supabase JWT token"""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return error_response("Missing or invalid token", "AUTH_MISSING", status_code=401)
            token = auth_header.split(" ")[1]
            user = get_supabase_user(token)
            if not user:
                return error_response("Invalid or expired token", "AUTH_INVALID", status_code=401)
            request.user = user
            mfa_error = _enforce_mfa_if_required(user)
            if mfa_error is not None:
                return mfa_error
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def admin_required(f):
    """Fail closed: authenticated is not enough. Must be an admin."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        profile = UserProfile.get_by_id(user_id) if user_id else None
        if not user_is_admin(getattr(request, "user", None), profile):
            return error_response("Forbidden", "FORBIDDEN", status_code=403)
        return f(*args, **kwargs)

    return decorated_function


def get_jwt_identity():
    """Helper to get user ID from request context"""
    return str(request.user.id) if hasattr(request, "user") else None


class UserProfile:
    @staticmethod
    def get_by_id(user_id):
        client = data_client()
        if not client:
            return None
        try:
            res = client.table("user_profiles").select("*").eq("id", user_id).maybe_single().execute()
            return res.data if res.data else None
        except Exception as profile_error:
            print(f"Failed to fetch user profile {user_id}: {profile_error}")
            return None

    @staticmethod
    def to_dict(profile):
        if not profile:
            return None
        return {
            "id": profile.get("id"),
            "username": profile.get("username"),
            "email": profile.get("email"),
            "role": profile.get("role") or "user",
            "subscription_tier": profile.get("subscription_tier", "free"),
            "totp_enabled": profile.get("totp_enabled", False),
            "usage": {
                "conversions": profile.get("conversions_this_month", 0),
                "batch_operations": profile.get("batch_operations_this_month", 0),
                "last_reset": profile.get("last_usage_reset"),
            },
            "created_at": profile.get("created_at"),
        }


class BatchJob:
    @staticmethod
    def to_dict(job):
        if not job:
            return None
        total = job.get("total_files", 0)
        processed = job.get("processed_files", 0)
        return {
            "id": job.get("id"),
            "user_id": job.get("user_id"),
            "status": job.get("status"),
            "total_files": total,
            "processed_files": processed,
            "job_type": job.get("job_type"),
            "progress": round((processed / total * 100) if total > 0 else 0),
            "created_at": job.get("created_at"),
            "completed_at": job.get("completed_at"),
            "error_message": job.get("error_message"),
        }


# Legacy SQLAlchemy User model (kept for migration compatibility)
class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    supabase_uuid = db.Column(db.String(36), unique=True, nullable=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=True)
    subscription_tier = db.Column(db.String(20), default="free")
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
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "subscription_tier": self.subscription_tier,
            "totp_enabled": self.totp_enabled,
            "usage": {
                "conversions": self.conversions_this_month,
                "batch_operations": self.batch_operations_this_month,
                "last_reset": (self.last_usage_reset.isoformat() if self.last_usage_reset else None),
            },
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Session(db.Model):
    __tablename__ = "sessions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    token = db.Column(db.String(500), unique=True, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    last_activity = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime)
