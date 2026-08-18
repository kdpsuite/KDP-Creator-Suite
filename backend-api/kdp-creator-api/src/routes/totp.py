import pyotp
from flask import Blueprint, request

from src.models.user import UserProfile, data_client, get_jwt_identity, issue_mfa_token, jwt_required
from src.utils.rate_limit import rate_limit_totp_validate
from src.utils.responses import error_response, success_response

totp_bp = Blueprint("totp", __name__)


@totp_bp.route("/2fa/setup", methods=["POST"])
@jwt_required()
def setup_2fa():
    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return error_response("User not found", "NOT_FOUND", status_code=404)
    if profile.get("totp_enabled"):
        return error_response("2FA is already enabled", "ALREADY_EXISTS", status_code=400)

    secret = pyotp.random_base32()
    data_client().table("user_profiles").update({"totp_secret": secret}).eq("id", user_id).execute()

    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=profile.get("email"),
        issuer_name="KDP Creator Suite",
    )

    return success_response(
        {
            "secret": secret,
            "provisioning_uri": provisioning_uri,
        },
        "Scan the QR code with your authenticator app, then verify with a code.",
    )


@totp_bp.route("/2fa/verify", methods=["POST"])
@jwt_required()
def verify_2fa():
    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return error_response("User not found", "NOT_FOUND", status_code=404)

    secret = profile.get("totp_secret")
    if not secret:
        return error_response("2FA setup not initiated", "VALIDATION_ERROR", status_code=400)

    data = request.get_json() or {}
    code = data.get("code")
    if not code:
        return error_response("Verification code is required", "VALIDATION_ERROR", status_code=400)

    totp = pyotp.TOTP(secret)
    if totp.verify(code, valid_window=1):
        data_client().table("user_profiles").update({"totp_enabled": True}).eq("id", user_id).execute()
        return success_response(
            {"mfa_token": issue_mfa_token(user_id)},
            "2FA has been enabled successfully",
        )

    return error_response("Invalid verification code", "VALIDATION_ERROR", status_code=400)


@totp_bp.route("/2fa/disable", methods=["POST"])
@jwt_required()
def disable_2fa():
    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return error_response("User not found", "NOT_FOUND", status_code=404)

    data = request.get_json() or {}
    code = data.get("code")
    if not code:
        return error_response("Verification code is required", "VALIDATION_ERROR", status_code=400)

    if not profile.get("totp_enabled") or not profile.get("totp_secret"):
        return error_response("2FA is not enabled", "VALIDATION_ERROR", status_code=400)

    totp = pyotp.TOTP(profile.get("totp_secret"))
    if totp.verify(code, valid_window=1):
        data_client().table("user_profiles").update(
            {
                "totp_enabled": False,
                "totp_secret": None,
            }
        ).eq("id", user_id).execute()
        return success_response(message="2FA has been disabled")

    return error_response("Invalid verification code", "VALIDATION_ERROR", status_code=400)


@totp_bp.route("/2fa/validate", methods=["POST"])
@jwt_required()
@rate_limit_totp_validate
def validate_2fa_login():
    """Validate TOTP for the authenticated user after password login."""
    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id)
    if not profile or not profile.get("totp_enabled"):
        return error_response("Invalid request", "VALIDATION_ERROR", status_code=400)

    data = request.get_json() or {}
    code = data.get("code")
    if not code:
        return error_response("Verification code is required", "VALIDATION_ERROR", status_code=400)

    totp = pyotp.TOTP(profile.get("totp_secret"))
    if totp.verify(code, valid_window=1):
        return success_response(
            {
                "valid": True,
                "mfa_token": issue_mfa_token(user_id),
            },
            "2FA code validated",
        )

    return error_response("Invalid 2FA code", "AUTH_INVALID", status_code=401)
