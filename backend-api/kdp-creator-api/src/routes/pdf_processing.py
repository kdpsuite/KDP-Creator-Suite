import base64
import io
import json
import uuid

from flask import Blueprint, current_app, request
from PIL import Image
from pypdf import PdfReader, PdfWriter, Transformation
from reportlab.lib.colors import grey
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from src.models.user import get_jwt_identity, jwt_required, supabase
from src.routes.subscription import (
    enforce_batch_quota,
    enforce_conversion_quota,
    record_batch_usage,
    record_conversion_usage,
)
from src.services.coloring import ColoringParamError, coloring_bitmap, parse_coloring_form
from src.services.kdp_specs import (
    MIN_PAGE_COUNT,
    PRINT_DPI,
    STANDARD_COLOR_MIN_PAGES,
    KdpSpecError,
    get_trim,
    interior_page_size,
    interior_page_size_pts,
)
from src.storage import upload_file
from src.utils.logger import PerformanceTimer
from src.utils.rate_limit import rate_limit_pdf_processing
from src.utils.responses import error_response, success_response

pdf_bp = Blueprint("pdf", __name__)

PREVIEW_DPI = 72
PREVIEW_QUALITY = 70


def record_pdf_analytics(user_id, event_type, event_data):
    """Best-effort analytics insert; never fail the conversion response."""
    if not supabase:
        return
    try:
        supabase.table("analytics_events").insert(
            {
                "user_id": user_id,
                "event_type": event_type,
                "event_data": event_data,
            }
        ).execute()
    except Exception as analytics_error:
        current_app.logger.warning(f"Failed to record analytics event {event_type}: {analytics_error}")


def get_kdp_dimensions(trim_size, target_format, with_bleed=None):
    """Return interior page size in PDF points using shared KDP specs."""
    wants_print = "print" in (target_format or "")
    if with_bleed is None:
        with_bleed = wants_print
    try:
        return interior_page_size_pts(trim_size, with_bleed=with_bleed)
    except KdpSpecError:
        # Fall back to 6x9 rather than silently jumping to letter
        return interior_page_size_pts("6x9", with_bleed=with_bleed)


def generate_title_page_pdf(title, trim_size, with_bleed=True):
    """Create a simple title page PDF prepended to batch output."""
    target_w, target_h = get_kdp_dimensions(trim_size, "print", with_bleed=with_bleed)
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(target_w, target_h))
    c.setFillColor(grey)
    c.setFont("Helvetica-Bold", min(36, target_w / 12))
    c.drawCentredString(target_w / 2, target_h / 2 + 20, title[:80])
    c.setFont("Helvetica", 14)
    c.drawCentredString(target_w / 2, target_h / 2 - 30, "KDP Creator Suite")
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.getvalue()


def _png_bytes_to_pdf_page(png_bytes, trim_size, with_bleed=True):
    """Place PNG on a correctly sized KDP page without stretching."""
    target_w, target_h = get_kdp_dimensions(trim_size, "print", with_bleed=with_bleed)
    img = Image.open(io.BytesIO(png_bytes))
    img_w_pt = img.width * 72 / PRINT_DPI
    img_h_pt = img.height * 72 / PRINT_DPI
    scale = min(target_w / img_w_pt, target_h / img_h_pt)
    draw_w = img_w_pt * scale
    draw_h = img_h_pt * scale
    x = (target_w - draw_w) / 2
    y = (target_h - draw_h) / 2
    temp_pdf_buffer = io.BytesIO()
    c = canvas.Canvas(temp_pdf_buffer, pagesize=(target_w, target_h))
    c.setFillColorRGB(1, 1, 1)
    c.rect(0, 0, target_w, target_h, fill=1, stroke=0)
    c.drawImage(ImageReader(io.BytesIO(png_bytes)), x, y, width=draw_w, height=draw_h)
    c.showPage()
    c.save()
    temp_pdf_buffer.seek(0)
    return PdfReader(temp_pdf_buffer).pages[0]


def generate_optimized_preview(content_bytes, content_type="pdf"):
    """Generate a low-res preview. Safe if pdf2image/poppler are unavailable."""
    try:
        if content_type == "pdf":
            try:
                from pdf2image import convert_from_bytes

                images = convert_from_bytes(content_bytes, first_page=1, last_page=1, dpi=PREVIEW_DPI)
                if not images:
                    return None
                preview_img = images[0]
            except Exception as preview_error:
                current_app.logger.warning(f"PDF preview unavailable: {preview_error}")
                return None
        else:
            preview_img = Image.open(io.BytesIO(content_bytes))

        preview_img.thumbnail((600, 600), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        preview_img.convert("RGB").save(output, format="JPEG", quality=PREVIEW_QUALITY, optimize=True)
        return base64.b64encode(output.getvalue()).decode("utf-8")
    except Exception as e:
        current_app.logger.error(f"Optimized preview failed: {str(e)}")
        return None


def _fit_page_to_target(page, target_w, target_h):
    """Uniformly scale and center a PDF page onto a target canvas (no stretch)."""
    src_w = float(page.mediabox.width)
    src_h = float(page.mediabox.height)
    if src_w <= 0 or src_h <= 0:
        return page

    scale = min(target_w / src_w, target_h / src_h)
    writer = PdfWriter()
    blank = writer.add_blank_page(width=target_w, height=target_h)
    tx = (target_w - src_w * scale) / 2
    ty = (target_h - src_h * scale) / 2
    blank.merge_transformed_page(
        page,
        Transformation().scale(scale, scale).translate(tx, ty),
    )
    return blank


def _coloring_bitmap(img_bytes, trim_size, with_bleed=True, **coloring_opts):
    """Thin dispatcher — default engine=legacy via coloring_bitmap."""
    return coloring_bitmap(img_bytes, trim_size, with_bleed=with_bleed, **coloring_opts)


@pdf_bp.route("/pdf/convert-coloring", methods=["POST"])
@rate_limit_pdf_processing
@jwt_required()
def convert_to_coloring():
    user_id = get_jwt_identity()
    quota_error = enforce_conversion_quota(user_id)
    if quota_error:
        return quota_error
    if "file" not in request.files:
        return error_response("No file uploaded", "MISSING_FILE", status_code=400)

    file = request.files["file"]
    trim_size = request.form.get("trim_size", "8.5x11")
    with_bleed = request.form.get("with_bleed", "true").lower() in ("1", "true", "yes")

    try:
        get_trim(trim_size)
        coloring_opts = parse_coloring_form(request.form)
    except KdpSpecError as exc:
        return error_response(str(exc), "INVALID_TRIM", status_code=400)
    except ColoringParamError as exc:
        return error_response(str(exc), exc.code, status_code=400)

    with PerformanceTimer("coloring_conversion"):
        try:
            png_bytes = _coloring_bitmap(
                file.read(),
                trim_size,
                with_bleed=with_bleed,
                **coloring_opts,
            )
            preview = generate_optimized_preview(png_bytes, "image")

            # Prefer single-page PDF for KDP interior upload readiness
            as_pdf = request.form.get("output_format", "pdf").lower() != "png"
            if as_pdf:
                writer = PdfWriter()
                writer.add_page(_png_bytes_to_pdf_page(png_bytes, trim_size, with_bleed=with_bleed))
                pdf_buffer = io.BytesIO()
                writer.write(pdf_buffer)
                output_bytes = pdf_buffer.getvalue()
                filename = f"coloring_{uuid.uuid4().hex[:8]}.pdf"
                file_format = "PDF"
            else:
                output_bytes = png_bytes
                filename = f"coloring_{uuid.uuid4().hex[:8]}.png"
                file_format = "PNG"

            storage_info = upload_file(output_bytes, str(user_id), filename, "coloring_page")

            record_pdf_analytics(
                user_id,
                "pdf_coloring_conversion",
                {
                    "status": "success",
                    "file_size_mb": round(len(output_bytes) / (1024 * 1024), 2),
                    "format": file_format,
                    "trim_size": trim_size,
                    "engine": coloring_opts["engine"],
                },
            )
            record_conversion_usage(user_id)
            return success_response(
                {
                    "download_url": storage_info["signed_url"],
                    "preview": preview,
                    "file_size_mb": round(len(output_bytes) / (1024 * 1024), 2),
                    "format": file_format,
                    "with_bleed": with_bleed,
                    "trim_size": trim_size,
                }
            )
        except ColoringParamError as exc:
            return error_response(str(exc), exc.code, status_code=400)
        except Exception as e:
            current_app.logger.error(f"Coloring conversion failed: {str(e)}")
            record_pdf_analytics(
                user_id,
                "pdf_coloring_conversion",
                {"status": "failed", "error": str(e), "trim_size": trim_size},
            )
            return error_response("Conversion failed", "CONVERSION_ERROR", status_code=500)


@pdf_bp.route("/pdf/format-kdp", methods=["POST"])
@rate_limit_pdf_processing
@jwt_required()
def format_kdp():
    user_id = get_jwt_identity()
    quota_error = enforce_conversion_quota(user_id)
    if quota_error:
        return quota_error
    if "file" not in request.files:
        return error_response("No file uploaded", "MISSING_FILE", status_code=400)

    file = request.files["file"]
    trim_size = request.form.get("trim_size", "8.5x11")
    target_format = request.form.get("target_format", "kdp-print")
    with_bleed = "print" in target_format and target_format != "kdp-ebook"

    try:
        get_trim(trim_size)
    except KdpSpecError as exc:
        return error_response(str(exc), "INVALID_TRIM", status_code=400)

    with PerformanceTimer("kdp_formatting"):
        try:
            pdf_bytes = file.read()
            reader = PdfReader(io.BytesIO(pdf_bytes))
            writer = PdfWriter()

            if target_format == "kdp-ebook":
                # Pass through pages without print bleed sizing
                for page in reader.pages:
                    writer.add_page(page)
            else:
                target_w, target_h = get_kdp_dimensions(trim_size, "print", with_bleed=with_bleed)
                for page in reader.pages:
                    writer.add_page(_fit_page_to_target(page, target_w, target_h))

            # Pad to even page count for print interiors
            if with_bleed or target_format == "kdp-print":
                while len(writer.pages) % 2 != 0:
                    target_w, target_h = get_kdp_dimensions(trim_size, "print", with_bleed=with_bleed)
                    writer.add_blank_page(width=target_w, height=target_h)
                if len(writer.pages) < MIN_PAGE_COUNT:
                    target_w, target_h = get_kdp_dimensions(trim_size, "print", with_bleed=with_bleed)
                    while len(writer.pages) < MIN_PAGE_COUNT:
                        writer.add_blank_page(width=target_w, height=target_h)

            output_buffer = io.BytesIO()
            writer.write(output_buffer)
            output_bytes = output_buffer.getvalue()

            filename = f"kdp_{uuid.uuid4().hex[:8]}.pdf"
            storage_info = upload_file(output_bytes, str(user_id), filename, "kdp_formatted_pdf")

            record_pdf_analytics(
                user_id,
                "kdp_formatting",
                {
                    "status": "success",
                    "file_size_mb": round(len(output_bytes) / (1024 * 1024), 2),
                    "format": "PDF",
                    "target_format": target_format,
                },
            )
            record_conversion_usage(user_id)
            return success_response(
                {
                    "download_url": storage_info["signed_url"],
                    "preview": generate_optimized_preview(output_bytes, "pdf"),
                    "file_size_mb": round(len(output_bytes) / (1024 * 1024), 2),
                    "format": "PDF",
                    "page_count": len(writer.pages),
                    "with_bleed": with_bleed,
                    "trim_size": trim_size,
                }
            )
        except Exception as e:
            current_app.logger.error(f"KDP formatting failed: {str(e)}")
            record_pdf_analytics(
                user_id,
                "kdp_formatting",
                {"status": "failed", "error": str(e)},
            )
            return error_response("Formatting failed", "FORMATTING_ERROR", status_code=500)


@pdf_bp.route("/pdf/batch-coloring", methods=["POST"])
@rate_limit_pdf_processing
@jwt_required()
def batch_convert_coloring():
    user_id = get_jwt_identity()
    quota_error = enforce_batch_quota(user_id)
    if quota_error:
        return quota_error
    if not request.files:
        return error_response("No files uploaded", "MISSING_FILES", status_code=400)

    trim_size = request.form.get("trim_size", "8.5x11")
    cover_title = request.form.get("cover_title", "").strip()
    generate_cover = request.form.get("generate_cover", "false").lower() in (
        "1",
        "true",
        "yes",
    )
    with_bleed = request.form.get("with_bleed", "true").lower() in ("1", "true", "yes")

    try:
        get_trim(trim_size)
        coloring_opts = parse_coloring_form(request.form)
    except KdpSpecError as exc:
        return error_response(str(exc), "INVALID_TRIM", status_code=400)
    except ColoringParamError as exc:
        return error_response(str(exc), exc.code, status_code=400)

    file_order_raw = request.form.get("file_order")
    if file_order_raw:
        try:
            file_keys = json.loads(file_order_raw)
        except json.JSONDecodeError:
            return error_response("Invalid file_order JSON", "INVALID_INPUT", status_code=400)
    else:
        file_keys = sorted(request.files.keys())

    output_pngs = []

    with PerformanceTimer("batch_coloring_conversion"):
        try:
            for key in file_keys:
                if key not in request.files:
                    continue
                file = request.files[key]
                output_pngs.append(
                    _coloring_bitmap(
                        file.read(),
                        trim_size,
                        with_bleed=with_bleed,
                        **coloring_opts,
                    )
                )

            pdf_writer = PdfWriter()

            if generate_cover and cover_title:
                cover_bytes = generate_title_page_pdf(cover_title, trim_size, with_bleed=with_bleed)
                cover_reader = PdfReader(io.BytesIO(cover_bytes))
                pdf_writer.add_page(cover_reader.pages[0])

            for png_bytes in output_pngs:
                pdf_writer.add_page(_png_bytes_to_pdf_page(png_bytes, trim_size, with_bleed=with_bleed))

            target_w, target_h = get_kdp_dimensions(trim_size, "print", with_bleed=with_bleed)
            while len(pdf_writer.pages) < MIN_PAGE_COUNT or len(pdf_writer.pages) % 2 != 0:
                pdf_writer.add_blank_page(width=target_w, height=target_h)

            final_pdf_buffer = io.BytesIO()
            pdf_writer.write(final_pdf_buffer)
            final_pdf_bytes = final_pdf_buffer.getvalue()

            filename = f"batch_coloring_{uuid.uuid4().hex[:8]}.pdf"
            storage_info = upload_file(final_pdf_bytes, str(user_id), filename, "batch_coloring_pdf")

            record_pdf_analytics(
                user_id,
                "batch_coloring_conversion",
                {
                    "status": "success",
                    "file_count": len(output_pngs),
                    "has_cover": bool(generate_cover and cover_title),
                    "file_size_mb": round(len(final_pdf_bytes) / (1024 * 1024), 2),
                    "format": "PDF",
                    "trim_size": trim_size,
                    "engine": coloring_opts["engine"],
                },
            )
            record_batch_usage(user_id)
            return success_response(
                {
                    "download_url": storage_info["signed_url"],
                    "preview": (generate_optimized_preview(output_pngs[0], "image") if output_pngs else None),
                    "file_size_mb": round(len(final_pdf_bytes) / (1024 * 1024), 2),
                    "format": "PDF",
                    "page_count": len(pdf_writer.pages),
                    "with_bleed": with_bleed,
                }
            )
        except ColoringParamError as exc:
            return error_response(str(exc), exc.code, status_code=400)
        except Exception as e:
            current_app.logger.error(f"Batch coloring conversion failed: {str(e)}")
            record_pdf_analytics(
                user_id,
                "batch_coloring_conversion",
                {
                    "status": "failed",
                    "error": str(e),
                    "file_count": len(file_keys),
                    "trim_size": trim_size,
                },
            )
            return error_response("Batch conversion failed", "BATCH_CONVERSION_ERROR", status_code=500)


@pdf_bp.route("/pdf/validate-kdp", methods=["POST"])
@rate_limit_pdf_processing
@jwt_required()
def validate_kdp():
    user_id = get_jwt_identity()
    if "file" not in request.files:
        return error_response("No file uploaded", "MISSING_FILE", status_code=400)

    file = request.files["file"]
    trim_size = request.form.get("trim_size", "8.5x11")
    target_format = request.form.get("target_format", "print")
    with_bleed = "print" in target_format
    print_profile = request.form.get("print_profile", "bw_white")

    try:
        get_trim(trim_size)
    except KdpSpecError as exc:
        return error_response(str(exc), "INVALID_TRIM", status_code=400)

    with PerformanceTimer("kdp_validation"):
        try:
            pdf_bytes = file.read()
            reader = PdfReader(io.BytesIO(pdf_bytes))

            num_pages = len(reader.pages)
            if num_pages == 0:
                return error_response("PDF contains no pages", "EMPTY_PDF", status_code=400)

            expected = interior_page_size(trim_size, with_bleed=with_bleed)
            warnings = []
            errors = []

            if num_pages % 2 != 0:
                warnings.append("Page count is odd; KDP rounds up to the next even number.")
            if num_pages < MIN_PAGE_COUNT:
                errors.append(f"Page count {num_pages} is below KDP paperback minimum of {MIN_PAGE_COUNT}.")
            if print_profile == "standard_color_white" and num_pages < STANDARD_COLOR_MIN_PAGES:
                errors.append(f"Standard color requires at least {STANDARD_COLOR_MIN_PAGES} pages (got {num_pages}).")

            mismatched = 0
            for idx, page in enumerate(reader.pages, start=1):
                media_box = page.mediabox
                pdf_width = float(media_box.width) / 72
                pdf_height = float(media_box.height) / 72
                if abs(pdf_width - expected.width) >= 0.05 or abs(pdf_height - expected.height) >= 0.05:
                    mismatched += 1
                    if mismatched <= 5:
                        warnings.append(
                            f"Page {idx} size {pdf_width:.2f}x{pdf_height:.2f} in "
                            f"does not match expected {expected.width:.2f}x{expected.height:.2f} in."
                        )
            if mismatched > 5:
                warnings.append(f"...and {mismatched - 5} additional page size mismatches.")

            # Font / image checks (best-effort)
            try:
                if reader.metadata is None:
                    warnings.append("PDF has no document metadata.")
            except Exception:
                pass

            first_page = reader.pages[0]
            pdf_width = float(first_page.mediabox.width) / 72
            pdf_height = float(first_page.mediabox.height) / 72
            dimension_match = mismatched == 0
            is_valid = dimension_match and not errors

            record_pdf_analytics(
                user_id,
                "kdp_validation",
                {
                    "status": "success",
                    "is_valid": is_valid,
                    "num_pages": num_pages,
                    "pdf_dimensions_inches": f"{pdf_width:.2f}x{pdf_height:.2f}",
                },
            )
            return success_response(
                {
                    "is_valid": is_valid,
                    "num_pages": num_pages,
                    "pdf_dimensions_inches": f"{pdf_width:.2f}x{pdf_height:.2f}",
                    "expected_dimensions_inches": f"{expected.width:.2f}x{expected.height:.2f}",
                    "errors": errors,
                    "warnings": warnings + errors,
                    "with_bleed": with_bleed,
                    "trim_size": trim_size,
                    "message": (
                        "PDF validation complete. Always confirm with Amazon KDP Print Previewer "
                        "and a physical proof before publishing."
                    ),
                }
            )
        except Exception as e:
            current_app.logger.error(f"KDP validation failed: {str(e)}")
            record_pdf_analytics(
                user_id,
                "kdp_validation",
                {"status": "failed", "error": str(e)},
            )
            return error_response("Validation failed", "VALIDATION_ERROR", status_code=500)
