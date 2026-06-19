from flask import Blueprint, jsonify, request
from src.models.user import supabase, UserProfile, jwt_required, get_jwt_identity
from src.utils.validation import validate_json, error_response, success_response, log_request, sanitize_email
from src.utils.logger import logger, log_info, log_warning, log_error_msg, PerformanceTimer
from src.utils.rate_limit import rate_limit_password_reset
from datetime import datetime, timedelta
import secrets
from marshmallow import Schema, fields
from flask import Blueprint, jsonify, request

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
    return error_response('Please register via the dashboard using Supabase auth', code=400)

@user_bp.route('/login', methods=['POST'])
@log_request
def login():
    # Dashboard will now handle login directly with Supabase
    # This endpoint is kept for compatibility but should redirect or explain
    log_info('Login endpoint called (deprecated)', endpoint='/login')
    return error_response('Please login via the dashboard using Supabase auth', code=400)

@user_bp.route('/me', methods=['GET'])
@jwt_required()
@log_request
def get_current_user():
    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return error_response('User profile not found', code=404)
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
    res = supabase.table('user_profiles').select('*').execute()
    return jsonify([UserProfile.to_dict(u) for u in res.data])

@user_bp.route('/users/<user_id>', methods=['PUT'])
@jwt_required()
@validate_json(UpdateUserSchema())
@log_request
def update_user(user_id):
    current_user_id = get_jwt_identity()
    if str(user_id) != current_user_id:
        log_warning(f'Unauthorized update attempt', user_id=user_id, current_user_id=current_user_id)
        return error_response('Unauthorized to update this user', code=403)
        
    data = request.validated_data
    update_data = {}
    
    if 'username' in data:
        username = data['username'].strip()
        if len(username) < 3:
            return error_response('Username must be at least 3 characters', code=400)
        update_data['username'] = username
    
    if 'email' in data:
        try:
            email = sanitize_email(data['email'])
            update_data['email'] = email
        except ValueError as e:
            return error_response(str(e), code=400)
    
    if not update_data:
        return error_response('No fields to update', code=400)

    try:
        with PerformanceTimer(f'update_user:{user_id}'):
            res = supabase.table('user_profiles').update(update_data).eq('id', user_id).execute()
            if not res.data:
                return error_response('User not found', code=404)
            
            log_info(f'User updated', user_id=user_id, fields=list(update_data.keys()))
            return success_response(UserProfile.to_dict(res.data[0]), 'User updated successfully')
    except Exception as e:
        log_error_msg(f'Failed to update user', user_id=user_id, error=str(e))
        return error_response(f'Failed to update user: {str(e)}', code=500)

@user_bp.route('/users/<user_id>', methods=['DELETE'])
@jwt_required()
@log_request
def delete_user(user_id):
    current_user_id = get_jwt_identity()
    if str(user_id) != current_user_id:
        log_warning(f'Unauthorized delete attempt', user_id=user_id, current_user_id=current_user_id)
        return error_response('Unauthorized to delete this user', code=403)

    try:
        with PerformanceTimer(f'delete_user:{user_id}'):
            supabase.table('user_profiles').delete().eq('id', user_id).execute()
            log_info(f'User deleted', user_id=user_id)
            return success_response(message='User deleted successfully')
    except Exception as e:
        log_error_msg(f'Failed to delete user', user_id=user_id, error=str(e))
        return error_response(f'Failed to delete user: {str(e)}', code=500)

@user_bp.route('/request-password-reset', methods=['POST'])
@validate_json(PasswordResetSchema())
@rate_limit_password_reset
@log_request
def request_password_reset():
    # Handled by Supabase on dashboard
    data = request.get_json() or {}
    log_info('Password reset requested (deprecated)', email=data.get('email'))
    return error_response('Please use dashboard password reset', code=400)

@user_bp.route('/reset-password', methods=['POST'])
@log_request
def reset_password():
    # Handled by Supabase on dashboard
    log_info('Password reset endpoint called (deprecated)')
    return error_response('Please use dashboard password reset', code=400)
