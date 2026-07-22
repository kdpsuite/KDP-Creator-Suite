from flask import Blueprint, request
from src.models.user import supabase, UserProfile, jwt_required, get_jwt_identity
from src.utils.responses import success_response, error_response
import pyotp

totp_bp = Blueprint('totp', __name__)

@totp_bp.route('/2fa/setup', methods=['POST'])
@jwt_required()
def setup_2fa():
    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return error_response('User not found', 'NOT_FOUND', status_code=404)
    if profile.get('totp_enabled'):
        return error_response('2FA is already enabled', 'ALREADY_EXISTS', status_code=400)

    secret = pyotp.random_base32()
    supabase.table('user_profiles').update({'totp_secret': secret}).eq('id', user_id).execute()

    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=profile.get('email'),
        issuer_name='KDP Creator Suite',
    )

    return success_response(
        {
            'secret': secret,
            'provisioning_uri': provisioning_uri,
        },
        'Scan the QR code with your authenticator app, then verify with a code.',
    )

@totp_bp.route('/2fa/verify', methods=['POST'])
@jwt_required()
def verify_2fa():
    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return error_response('User not found', 'NOT_FOUND', status_code=404)

    secret = profile.get('totp_secret')
    if not secret:
        return error_response('2FA setup not initiated', 'VALIDATION_ERROR', status_code=400)

    data = request.get_json() or {}
    code = data.get('code')
    if not code:
        return error_response('Verification code is required', 'VALIDATION_ERROR', status_code=400)

    totp = pyotp.TOTP(secret)
    if totp.verify(code, valid_window=1):
        supabase.table('user_profiles').update({'totp_enabled': True}).eq('id', user_id).execute()
        return success_response(message='2FA has been enabled successfully')

    return error_response('Invalid verification code', 'VALIDATION_ERROR', status_code=400)

@totp_bp.route('/2fa/disable', methods=['POST'])
@jwt_required()
def disable_2fa():
    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return error_response('User not found', 'NOT_FOUND', status_code=404)

    data = request.get_json() or {}
    code = data.get('code')
    if not code:
        return error_response('Verification code is required', 'VALIDATION_ERROR', status_code=400)

    if not profile.get('totp_enabled') or not profile.get('totp_secret'):
        return error_response('2FA is not enabled', 'VALIDATION_ERROR', status_code=400)

    totp = pyotp.TOTP(profile.get('totp_secret'))
    if totp.verify(code, valid_window=1):
        supabase.table('user_profiles').update({
            'totp_enabled': False,
            'totp_secret': None,
        }).eq('id', user_id).execute()
        return success_response(message='2FA has been disabled')

    return error_response('Invalid verification code', 'VALIDATION_ERROR', status_code=400)

@totp_bp.route('/2fa/validate', methods=['POST'])
def validate_2fa_login():
    """Validate 2FA code during login (called after password auth succeeds)."""
    data = request.get_json() or {}
    user_id = data.get('user_id')
    code = data.get('code')

    if not user_id or not code:
        return error_response('User ID and code are required', 'VALIDATION_ERROR', status_code=400)

    profile = UserProfile.get_by_id(user_id)
    if not profile or not profile.get('totp_enabled'):
        return error_response('Invalid request', 'VALIDATION_ERROR', status_code=400)

    totp = pyotp.TOTP(profile.get('totp_secret'))
    if totp.verify(code, valid_window=1):
        return success_response({'valid': True}, '2FA code validated')

    return error_response('Invalid 2FA code', 'AUTH_INVALID', status_code=401)
