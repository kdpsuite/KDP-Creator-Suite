from flask import Blueprint, jsonify, request
from src.models.user import supabase, UserProfile, jwt_required, get_jwt_identity
from src.utils.validation import validate_json, log_request, sanitize_email
from src.utils.responses import success_response, error_response
from src.utils.logger import logger, log_info, log_warning, log_error_msg, PerformanceTimer
from src.utils.rate_limit import rate_limit_password_reset
from datetime import datetime, timedelta
import secrets
from marshmallow import Schema, fields

user_bp = Blueprint('user', __name__)

# ============================================================================
# Request Schemas
# ============================================================================

class UpdateUserSchema(Schema):
    username = fields.String(required=False, validate=lambda x: 3 <= len(x) <= 50)
    email = fields.Email(required=False)


class PasswordResetSchema(Schema):
    email = fields.Email(required=True)

@user_bp.route('/register', methods=['POST'])
@log_request
def register():
    # Dashboard will now handle registration directly with Supabase
    # This endpoint is kept for compatibility but should redirect or explain
    log_info('Register endpoint called (deprecated)', endpoint='/register')
    return error_response('Please register via the dashboard using Supabase auth', 'DEPRECATED_ENDPOINT', status_code=400)

@user_bp.route('/login', methods=['POST'])
@log_request
def login():
    # Dashboard will now handle login directly with Supabase
    # This endpoint is kept for compatibility but should redirect or explain
    log_info('Login endpoint called (deprecated)', endpoint='/login')
    return error_response('Please login via the dashboard using Supabase auth', 'DEPRECATED_ENDPOINT', status_code=400)

@user_bp.route('/me', methods=['GET'])
@jwt_required()
@log_request
def get_current_user():
    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return error_response('User profile not found', 'USER_NOT_FOUND', status_code=404)
    return success_response(UserProfile.to_dict(profile), 'User profile retrieved')

@user_bp.route('/logout', methods=['POST'])
@jwt_required()
@log_request
def logout():
    # Supabase handles logout on client side
    return success_response(message='Logged out successfully')

@user_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    # Admin only check could be added here
    try:
        res = supabase.table('user_profiles').select('*').execute()
        return success_response([UserProfile.to_dict(u) for u in res.data])
    except Exception as e:
        return error_response(f'Failed to fetch users: {str(e)}', 'DATABASE_ERROR', status_code=500)

@user_bp.route('/users/<user_id>', methods=['PUT'])
@jwt_required()
@validate_json(UpdateUserSchema())
@log_request
def update_user(user_id):
    current_user_id = get_jwt_identity()
    if str(user_id) != current_user_id:
        log_warning(f'Unauthorized update attempt', user_id=user_id, current_user_id=current_user_id)
        return error_response('Unauthorized to update this user', 'UNAUTHORIZED', status_code=403)
        
    data = request.validated_data
    update_data = {}
    
    if 'username' in data:
        username = data['username'].strip()
        if len(username) < 3:
            return error_response('Username must be at least 3 characters', 'INVALID_INPUT', status_code=400)
        update_data['username'] = username
    
    if 'email' in data:
        try:
            email = sanitize_email(data['email'])
            update_data['email'] = email
        except ValueError as e:
            return error_response(str(e), 'INVALID_EMAIL', status_code=400)
    
    if not update_data:
        return error_response('No fields to update', 'INVALID_INPUT', status_code=400)

    try:
        with PerformanceTimer(f'update_user:{user_id}'):
            res = supabase.table('user_profiles').update(update_data).eq('id', user_id).execute()
            if not res.data:
                return error_response('User not found', 'USER_NOT_FOUND', status_code=404)
            
            log_info(f'User updated', user_id=user_id, fields=list(update_data.keys()))
            return success_response(UserProfile.to_dict(res.data[0]), 'User updated successfully')
    except Exception as e:
        log_error_msg(f'Failed to update user', user_id=user_id, error=str(e))
        return error_response(f'Failed to update user: {str(e)}', 'DATABASE_ERROR', status_code=500)

@user_bp.route('/users/<user_id>', methods=['DELETE'])
@jwt_required()
@log_request
def delete_user(user_id):
    current_user_id = get_jwt_identity()
    if str(user_id) != current_user_id:
        log_warning(f'Unauthorized delete attempt', user_id=user_id, current_user_id=current_user_id)
        return error_response('Unauthorized to delete this user', 'UNAUTHORIZED', status_code=403)

    try:
        with PerformanceTimer(f'delete_user:{user_id}'):
            supabase.table('user_profiles').delete().eq('id', user_id).execute()
            log_info(f'User deleted', user_id=user_id)
            return success_response(message='User deleted successfully')
    except Exception as e:
        log_error_msg(f'Failed to delete user', user_id=user_id, error=str(e))
        return error_response(f'Failed to delete user: {str(e)}', 'DATABASE_ERROR', status_code=500)

@user_bp.route('/request-password-reset', methods=['POST'])
@validate_json(PasswordResetSchema())
@rate_limit_password_reset
@log_request
def request_password_reset():
    # Handled by Supabase on dashboard
    data = request.get_json() or {}
    log_info('Password reset requested (deprecated)', email=data.get('email'))
    return error_response('Please use dashboard password reset', 'DEPRECATED_ENDPOINT', status_code=400)

@user_bp.route('/reset-password', methods=['POST'])
@log_request
def reset_password():
    # Handled by Supabase on dashboard
    log_info('Password reset endpoint called (deprecated)')
    return error_response('Please use dashboard password reset', 'DEPRECATED_ENDPOINT', status_code=400)

@user_bp.route("/user/profile-sync", methods=["POST"])
@jwt_required()
def sync_user_profile():
    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id)

    if not profile:
        # Create a new profile if it doesn't exist
        try:
            # Fetch user email from Supabase auth.users table
            user_data = supabase.auth.admin.get_user_by_id(user_id).data.user
            user_email = user_data.email
            user_username = user_data.user_metadata.get("username", user_email.split("@")[0])

            new_profile_data = {
                "id": user_id,
                "email": user_email,
                "username": user_username,
                "subscription_tier": "free",
                "conversions_this_month": 0,
                "batch_operations_this_month": 0,
                "last_usage_reset": datetime.utcnow().isoformat(),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
            res = supabase.table("user_profiles").insert(new_profile_data).execute()
            if not res.data:
                return error_response("Failed to create user profile", "PROFILE_CREATION_FAILED", status_code=500)
            profile = res.data[0]
        except Exception as e:
            return error_response(f"Error creating user profile: {str(e)}", "PROFILE_CREATION_ERROR", status_code=500)

    return success_response(UserProfile.to_dict(profile), "User profile synced successfully")
