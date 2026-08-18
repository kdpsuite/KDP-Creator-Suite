"""
Authentication sync route for bridging Supabase Auth with Flask backend.
"""

import os
from datetime import datetime

import jwt as pyjwt
from flask import Blueprint, request
from flask_jwt_extended import create_access_token

from src.models.user import (
    User,
    UserProfile,
    db,
    get_jwt_identity,
    get_supabase_user,
    jwt_required,
    supabase,
    user_scoped_client,
)
from src.utils.auth_cookies import read_refresh_cookie, with_refresh_cookie
from src.utils.responses import error_response, success_response

auth_sync_bp = Blueprint("auth_sync", __name__)


def verify_supabase_token(token: str) -> dict:
    """Verify a Supabase JWT. Signatures are always required."""
    secret = os.environ.get("SUPABASE_JWT_SECRET")
    if not secret:
        print("Token verification failed: SUPABASE_JWT_SECRET is required")
        return None
    try:
        return pyjwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except Exception as token_error:
        print(f"Token verification failed: {token_error}")
        return None


def _upsert_user_profile(user, access_token=None) -> dict:
    """Ensure a Supabase user has a user_profiles row."""
    user_id = str(user.id)
    profile = UserProfile.get_by_id(user_id)
    if profile:
        return profile

    email = user.email or ""
    metadata = getattr(user, "user_metadata", None) or {}
    username = metadata.get("username", email.split("@")[0] if email else "user")

    new_profile = {
        "id": user_id,
        "email": email,
        "username": username,
        "subscription_tier": "free",
        "conversions_this_month": 0,
        "batch_operations_this_month": 0,
        "last_usage_reset": datetime.utcnow().isoformat(),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

    client = user_scoped_client(access_token) if access_token else None
    if client is None:
        client = supabase
    if not client:
        return new_profile

    res = client.table("user_profiles").insert(new_profile).execute()
    return res.data[0] if res.data else new_profile


@auth_sync_bp.route("/sync-session", methods=["POST"])
def sync_session():
    """Sync a Supabase session across domains after frontend login."""
    data = request.get_json() or {}
    supabase_token = data.get("supabase_token")
    refresh_token = data.get("refresh_token")

    if not supabase_token:
        return error_response("Missing supabase_token", "VALIDATION_ERROR", status_code=400)

    user = get_supabase_user(supabase_token)
    if not user:
        return error_response("Invalid token", "AUTH_INVALID", status_code=401)

    try:
        profile = _upsert_user_profile(user, supabase_token)
        payload = success_response(
            {
                "user_id": str(user.id),
                "email": user.email,
                "valid": True,
                "profile": UserProfile.to_dict(profile),
            },
            "Session synced successfully",
        )
        if refresh_token:
            return with_refresh_cookie(payload, refresh_token)
        return payload
    except Exception:
        return error_response(
            "Session sync failed",
            "INTERNAL_ERROR",
            status_code=500,
        )


@auth_sync_bp.route("/session/restore", methods=["POST"])
def restore_session():
    """Restore a session from the HttpOnly refresh cookie."""
    refresh_token = read_refresh_cookie()
    if not refresh_token:
        return error_response("No session", "AUTH_MISSING", status_code=401)

    if not supabase:
        return error_response("Auth unavailable", "AUTH_UNAVAILABLE", status_code=503)

    try:
        result = supabase.auth.refresh_session(refresh_token)
    except Exception:
        return error_response("Invalid session", "AUTH_INVALID", status_code=401)

    session = getattr(result, "session", None)
    if not session or not getattr(session, "access_token", None):
        return error_response("Invalid session", "AUTH_INVALID", status_code=401)

    user = getattr(session, "user", None) or get_supabase_user(session.access_token)
    if not user:
        return error_response("Invalid session", "AUTH_INVALID", status_code=401)

    try:
        profile = _upsert_user_profile(user, session.access_token)
    except Exception:
        return error_response("Session restore failed", "INTERNAL_ERROR", status_code=500)

    return with_refresh_cookie(
        success_response(
            {
                "user_id": str(user.id),
                "email": getattr(user, "email", None),
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
                "valid": True,
                "profile": UserProfile.to_dict(profile),
            },
            "Session restored",
        ),
        session.refresh_token,
    )


@auth_sync_bp.route("/validate-session", methods=["GET"])
@jwt_required()
def validate_session():
    """Validate the current Supabase-backed session."""
    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id)

    if not profile:
        return error_response("User not found", "NOT_FOUND", status_code=404)

    return success_response(
        {
            "user_id": user_id,
            "valid": True,
            "email": profile.get("email"),
        },
        "Session is valid",
    )


@auth_sync_bp.route("/sync-supabase-user", methods=["POST"])
def sync_supabase_user():
    """Sync a Supabase-authenticated user into the legacy Flask database."""
    data = request.get_json()

    if not data:
        return error_response("Request body is required", "VALIDATION_ERROR", status_code=400)

    supabase_token = data.get("supabase_token")
    email = data.get("email")
    username = data.get("username")

    if not supabase_token or not email:
        return error_response(
            "supabase_token and email are required",
            "VALIDATION_ERROR",
            status_code=400,
        )

    token_payload = verify_supabase_token(supabase_token)
    if not token_payload:
        return error_response("Invalid Supabase token", "AUTH_INVALID", status_code=401)

    supabase_uuid = token_payload.get("sub")
    if not supabase_uuid:
        return error_response("Invalid token payload", "AUTH_INVALID", status_code=401)

    existing_user = User.query.filter_by(supabase_uuid=supabase_uuid).first()
    if existing_user:
        access_token = create_access_token(identity=str(existing_user.id))
        return success_response(
            {
                "user": existing_user.to_dict(),
                "access_token": access_token,
            },
            "User already synced",
        )

    existing_email = User.query.filter_by(email=email).first()
    if existing_email:
        existing_email.supabase_uuid = supabase_uuid
        db.session.commit()
        access_token = create_access_token(identity=str(existing_email.id))
        return success_response(
            {
                "user": existing_email.to_dict(),
                "access_token": access_token,
            },
            "User linked to existing account",
        )

    if not username:
        username = email.split("@")[0]

    base_username = username
    counter = 1
    while User.query.filter_by(username=username).first():
        username = f"{base_username}_{counter}"
        counter += 1

    new_user = User(
        supabase_uuid=supabase_uuid,
        username=username,
        email=email,
        password_hash=None,
    )

    db.session.add(new_user)
    db.session.commit()

    access_token = create_access_token(identity=str(new_user.id))
    return success_response(
        {
            "user": new_user.to_dict(),
            "access_token": access_token,
        },
        "User synced successfully",
        status_code=201,
    )


@auth_sync_bp.route("/validate-supabase-token", methods=["POST"])
def validate_supabase_token():
    """Validate a Supabase JWT token and return user info if valid."""
    data = request.get_json()

    if not data or not data.get("supabase_token"):
        return error_response("supabase_token is required", "VALIDATION_ERROR", status_code=400)

    token_payload = verify_supabase_token(data["supabase_token"])
    if not token_payload:
        return error_response("Invalid token", "AUTH_INVALID", status_code=401)

    supabase_uuid = token_payload.get("sub")
    email = token_payload.get("email")
    user = User.query.filter_by(supabase_uuid=supabase_uuid).first()

    return success_response(
        {
            "valid": True,
            "supabase_uuid": supabase_uuid,
            "email": email,
            "synced": user is not None,
            "user": user.to_dict() if user else None,
        },
        "Token validated",
    )
