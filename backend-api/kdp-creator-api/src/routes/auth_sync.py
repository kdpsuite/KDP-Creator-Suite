"""
Authentication sync route for bridging Supabase Auth with Flask backend.
This allows users registered via Supabase to be synced into the Flask database.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from src.models.user import User, db
from datetime import datetime, timedelta
import os
import jwt as pyjwt

auth_sync_bp = Blueprint('auth_sync', __name__)

# Get Supabase JWT secret for validation (optional, for offline verification)
SUPABASE_JWT_SECRET = os.environ.get('SUPABASE_JWT_SECRET', None)


def verify_supabase_token(token: str) -> dict:
    """
    Verify a Supabase JWT token and extract user information.
    
    Args:
        token: The JWT token from Supabase
        
    Returns:
        dict with user info (sub, email, etc.) or None if invalid
    """
    try:
        # If we have the secret, verify offline
        if SUPABASE_JWT_SECRET:
            payload = pyjwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=['HS256']
            )
            return payload
        else:
            # Otherwise, just decode without verification (less secure, but works for now)
            # In production, you should verify against Supabase's public key
            payload = pyjwt.decode(token, options={"verify_signature": False})
            return payload
    except Exception as e:
        print(f"Token verification failed: {str(e)}")
        return None


@auth_sync_bp.route('/sync-supabase-user', methods=['POST'])
def sync_supabase_user():
    """
    Sync a Supabase-authenticated user into the Flask database.
    This endpoint is called after a user registers via Supabase on the landing page.
    
    Expected body:
    {
        "supabase_token": "<JWT token from Supabase>",
        "email": "<user email>",
        "username": "<desired username>"
    }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    supabase_token = data.get('supabase_token')
    email = data.get('email')
    username = data.get('username')
    
    if not supabase_token or not email:
        return jsonify({'error': 'supabase_token and email are required'}), 400
    
    # Verify the Supabase token
    token_payload = verify_supabase_token(supabase_token)
    if not token_payload:
        return jsonify({'error': 'Invalid Supabase token'}), 401
    
    supabase_uuid = token_payload.get('sub')
    if not supabase_uuid:
        return jsonify({'error': 'Invalid token payload'}), 401
    
    # Check if user already exists by Supabase UUID
    existing_user = User.query.filter_by(supabase_uuid=supabase_uuid).first()
    if existing_user:
        # User already synced, just return their info
        access_token = create_access_token(identity=str(existing_user.id))
        return jsonify({
            'message': 'User already synced',
            'user': existing_user.to_dict(),
            'access_token': access_token
        }), 200
    
    # Check if email already exists (from a previous registration)
    existing_email = User.query.filter_by(email=email).first()
    if existing_email:
        # Link the Supabase UUID to the existing user
        existing_email.supabase_uuid = supabase_uuid
        db.session.commit()
        access_token = create_access_token(identity=str(existing_email.id))
        return jsonify({
            'message': 'User linked to existing account',
            'user': existing_email.to_dict(),
            'access_token': access_token
        }), 200
    
    # Create a new user
    if not username:
        username = email.split('@')[0]  # Use email prefix as default username
    
    # Ensure username is unique
    base_username = username
    counter = 1
    while User.query.filter_by(username=username).first():
        username = f"{base_username}_{counter}"
        counter += 1
    
    new_user = User(
        supabase_uuid=supabase_uuid,
        username=username,
        email=email,
        password_hash=None  # No password for Supabase-synced users
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    # Create an access token for the dashboard
    access_token = create_access_token(identity=str(new_user.id))
    
    return jsonify({
        'message': 'User synced successfully',
        'user': new_user.to_dict(),
        'access_token': access_token
    }), 201


@auth_sync_bp.route('/validate-supabase-token', methods=['POST'])
def validate_supabase_token():
    """
    Validate a Supabase JWT token and return user info if valid.
    
    Expected body:
    {
        "supabase_token": "<JWT token from Supabase>"
    }
    """
    data = request.get_json()
    
    if not data or not data.get('supabase_token'):
        return jsonify({'error': 'supabase_token is required'}), 400
    
    token_payload = verify_supabase_token(data['supabase_token'])
    if not token_payload:
        return jsonify({'error': 'Invalid token'}), 401
    
    supabase_uuid = token_payload.get('sub')
    email = token_payload.get('email')
    
    # Check if user exists in Flask database
    user = User.query.filter_by(supabase_uuid=supabase_uuid).first()
    
    return jsonify({
        'valid': True,
        'supabase_uuid': supabase_uuid,
        'email': email,
        'synced': user is not None,
        'user': user.to_dict() if user else None
    }), 200
