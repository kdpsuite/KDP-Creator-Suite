from flask import Blueprint, jsonify, request
from src.models.user import supabase, UserProfile, jwt_required, get_jwt_identity
import pyotp

totp_bp = Blueprint('totp', __name__)

@totp_bp.route('/2fa/setup', methods=['POST'])
@jwt_required()
def setup_2fa():
    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return jsonify({'error': 'User not found'}), 404
    if profile.get('totp_enabled'):
        return jsonify({'error': '2FA is already enabled'}), 400

    # Generate a new TOTP secret
    secret = pyotp.random_base32()
    supabase.table('user_profiles').update({'totp_secret': secret}).eq('id', user_id).execute()

    # Generate provisioning URI
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(name=profile.get('email'), issuer_name='KDP Creator Suite')

    return jsonify({
        'secret': secret,
        'provisioning_uri': provisioning_uri,
        'message': 'Scan the QR code with your authenticator app, then verify with a code.'
    }), 200

@totp_bp.route('/2fa/verify', methods=['POST'])
@jwt_required()
def verify_2fa():
    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return jsonify({'error': 'User not found'}), 404
    
    secret = profile.get('totp_secret')
    if not secret:
        return jsonify({'error': '2FA setup not initiated'}), 400

    data = request.get_json()
    code = data.get('code')
    if not code:
        return jsonify({'error': 'Verification code is required'}), 400

    totp = pyotp.TOTP(secret)
    if totp.verify(code, valid_window=1):
        supabase.table('user_profiles').update({'totp_enabled': True}).eq('id', user_id).execute()
        return jsonify({'message': '2FA has been enabled successfully'}), 200
    else:
        return jsonify({'error': 'Invalid verification code'}), 400

@totp_bp.route('/2fa/disable', methods=['POST'])
@jwt_required()
def disable_2fa():
    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    code = data.get('code')
    if not code:
        return jsonify({'error': 'Verification code is required'}), 400

    if not profile.get('totp_enabled') or not profile.get('totp_secret'):
        return jsonify({'error': '2FA is not enabled'}), 400

    totp = pyotp.TOTP(profile.get('totp_secret'))
    if totp.verify(code, valid_window=1):
        supabase.table('user_profiles').update({
            'totp_enabled': False,
            'totp_secret': None
        }).eq('id', user_id).execute()
        return jsonify({'message': '2FA has been disabled'}), 200
    else:
        return jsonify({'error': 'Invalid verification code'}), 400

@totp_bp.route('/2fa/validate', methods=['POST'])
def validate_2fa_login():
    """Validate 2FA code during login (called after password auth succeeds)"""
    data = request.get_json()
    user_id = data.get('user_id')
    code = data.get('code')

    if not user_id or not code:
        return jsonify({'error': 'User ID and code are required'}), 400

    profile = UserProfile.get_by_id(user_id)
    if not profile or not profile.get('totp_enabled'):
        return jsonify({'error': 'Invalid request'}), 400

    totp = pyotp.TOTP(profile.get('totp_secret'))
    if totp.verify(code, valid_window=1):
        return jsonify({'valid': True}), 200
    else:
        return jsonify({'valid': False, 'error': 'Invalid 2FA code'}), 401
