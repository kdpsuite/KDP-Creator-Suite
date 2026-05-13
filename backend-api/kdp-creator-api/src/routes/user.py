from flask import Blueprint, jsonify, request
from src.models.user import supabase, UserProfile, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import secrets

user_bp = Blueprint('user', __name__)

@user_bp.route('/register', methods=['POST'])
def register():
    # Dashboard will now handle registration directly with Supabase
    # This endpoint is kept for compatibility but should redirect or explain
    return jsonify({'error': 'Please register via the dashboard using Supabase auth'}), 400

@user_bp.route('/login', methods=['POST'])
def login():
    # Dashboard will now handle login directly with Supabase
    # This endpoint is kept for compatibility but should redirect or explain
    return jsonify({'error': 'Please login via the dashboard using Supabase auth'}), 400

@user_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return jsonify({'error': 'User profile not found'}), 404
    return jsonify(UserProfile.to_dict(profile))

@user_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    # Supabase handles logout on client side
    return jsonify({'message': 'Logged out successfully'}), 200

@user_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    # Admin only check could be added here
    res = supabase.table('user_profiles').select('*').execute()
    return jsonify([UserProfile.to_dict(u) for u in res.data])

@user_bp.route('/users/<user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    current_user_id = get_jwt_identity()
    if str(user_id) != current_user_id:
        return jsonify({'error': 'Unauthorized to update this user'}), 403
        
    data = request.get_json()
    update_data = {}
    if 'username' in data:
        update_data['username'] = data['username']
    if 'email' in data:
        update_data['email'] = data['email']
    
    if not update_data:
        return jsonify({'error': 'No fields to update'}), 400

    res = supabase.table('user_profiles').update(update_data).eq('id', user_id).execute()
    if not res.data:
        return jsonify({'error': 'User not found'}), 404
        
    return jsonify(UserProfile.to_dict(res.data[0]))

@user_bp.route('/users/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_user_id = get_jwt_identity()
    if str(user_id) != current_user_id:
        return jsonify({'error': 'Unauthorized to delete this user'}), 403

    # Delete from auth.users via admin API if service role is used, 
    # or just delete from user_profiles if RLS allows.
    # Here we just delete the profile.
    supabase.table('user_profiles').delete().eq('id', user_id).execute()
    return '', 204

@user_bp.route('/request-password-reset', methods=['POST'])
def request_password_reset():
    # Handled by Supabase on dashboard
    return jsonify({'error': 'Please use dashboard password reset'}), 400

@user_bp.route('/reset-password', methods=['POST'])
def reset_password():
    # Handled by Supabase on dashboard
    return jsonify({'error': 'Please use dashboard password reset'}), 400
