import uuid

from flask import Blueprint, request

from src.data.templates import catalog_payload, get_template
from src.models.user import get_jwt_identity, jwt_required
from src.services.kdp_specs import KdpSpecError
from src.utils.rate_limit import rate_limit_pdf_processing
from src.utils.responses import error_response, success_response

templates_bp = Blueprint("templates", __name__)


@templates_bp.route("/templates", methods=["GET"])
def list_templates():
    niche = request.args.get("niche")
    return success_response(catalog_payload(niche))


@templates_bp.route("/templates/<template_id>", methods=["GET"])
def get_template_detail(template_id):
    template = get_template(template_id)
    if not template:
        return error_response("Template not found", "NOT_FOUND", status_code=404)
    return success_response({"template": template})


@templates_bp.route("/templates/<template_id>/generate", methods=["POST"])
@rate_limit_pdf_processing
@jwt_required()
def generate_template_product(template_id):
    from src.routes.subscription import enforce_conversion_quota, enforce_template_tier, record_conversion_usage
    from src.services.template_generator import generate_product
    from src.storage import upload_file

    user_id = get_jwt_identity()
    quota_error = enforce_conversion_quota(user_id)
    if quota_error:
        return quota_error

    template = get_template(template_id)
    if not template:
        return error_response("Template not found", "NOT_FOUND", status_code=404)

    tier_error = enforce_template_tier(user_id, template.get("tier_required", "free"))
    if tier_error:
        return tier_error

    payload = request.get_json(silent=True) or {}
    options = payload.get("options") if isinstance(payload.get("options"), dict) else payload

    try:
        result = generate_product(template, options)
    except KdpSpecError as exc:
        return error_response(str(exc), "KDP_SPEC_ERROR", status_code=400)
    except Exception:
        return error_response("Generation failed", "GENERATION_ERROR", status_code=500)

    try:
        interior_name = f"interior_{template_id}_{uuid.uuid4().hex[:8]}.pdf"
        cover_name = f"cover_{template_id}_{uuid.uuid4().hex[:8]}.pdf"
        interior_info = upload_file(result.interior_pdf, str(user_id), interior_name, "template_interior")
        cover_info = upload_file(result.cover_pdf, str(user_id), cover_name, "template_cover")
    except Exception:
        return error_response("Upload failed", "UPLOAD_ERROR", status_code=500)

    preview_b64 = None
    try:
        from src.routes.pdf_processing import generate_optimized_preview

        preview_b64 = generate_optimized_preview(result.interior_pdf, "pdf")
    except Exception:
        preview_b64 = None

    record_conversion_usage(user_id)
    return success_response(
        {
            "template_id": template_id,
            "page_count": result.page_count,
            "trim_size": result.trim_size,
            "print_profile": result.print_profile,
            "with_bleed": result.with_bleed,
            "interior_download_url": interior_info.get("signed_url"),
            "cover_download_url": cover_info.get("signed_url"),
            "cover": {
                "width_in": result.cover_width_in,
                "height_in": result.cover_height_in,
                "spine_width_in": result.spine_width_in,
                "allow_spine_text": result.allow_spine_text,
            },
            "compliance": result.compliance,
            "preview": preview_b64,
            "message": (
                "Generated print-ready interior and paperback cover. "
                "Run Amazon KDP Print Previewer and order a proof before publishing."
            ),
        }
    )
