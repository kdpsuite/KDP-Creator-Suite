import io
import os
import uuid
import base64
import json
from datetime import datetime
from flask import Blueprint, request, current_app, send_file
from pypdf import PdfReader, PdfWriter
from PIL import Image
import cv2
import numpy as np
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import grey
from functools import lru_cache

from src.models.user import jwt_required, get_jwt_identity, User
from src.storage import upload_file
from src.utils.responses import success_response, error_response
from src.models.user import supabase
from src.utils.rate_limit import rate_limit_pdf_processing
from src.utils.logger import PerformanceTimer

pdf_bp = Blueprint('pdf', __name__)

# Constants for optimization
PRINT_DPI = 300
PREVIEW_DPI = 72
PREVIEW_QUALITY = 70
KDP_TRIM_SIZES = {
    '6x9': {'width': 6, 'height': 9},
    '8.5x11': {'width': 8.5, 'height': 11},
    '5x8': {'width': 5, 'height': 8},
}
BLEED_SIZE = 0.125

@lru_cache(maxsize=128)
def get_kdp_dimensions(trim_size, target_format):
    """Cache KDP dimension calculations to save CPU cycles"""
    if trim_size and trim_size in KDP_TRIM_SIZES:
        target_w = KDP_TRIM_SIZES[trim_size]['width'] * 72
        target_h = KDP_TRIM_SIZES[trim_size]['height'] * 72
    else:
        target_w, target_h = 8.5 * 72, 11 * 72 # Default

    if 'print' in target_format:
        target_w += (BLEED_SIZE * 72)
        target_h += (BLEED_SIZE * 2 * 72)
    
    return target_w, target_h

def generate_title_page_pdf(title, trim_size):
    """Create a simple title/cover page PDF prepended to batch output."""
    target_w, target_h = get_kdp_dimensions(trim_size, 'print')
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(target_w, target_h))
    c.setFillColor(grey)
    c.setFont('Helvetica-Bold', min(36, target_w / 12))
    c.drawCentredString(target_w / 2, target_h / 2 + 20, title[:80])
    c.setFont('Helvetica', 14)
    c.drawCentredString(target_w / 2, target_h / 2 - 30, 'KDP Creator Suite')
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.getvalue()


def _png_bytes_to_pdf_page(png_bytes):
    img = Image.open(io.BytesIO(png_bytes))
    img_width_pt = img.width * 72 / PRINT_DPI
    img_height_pt = img.height * 72 / PRINT_DPI
    temp_pdf_buffer = io.BytesIO()
    c = canvas.Canvas(temp_pdf_buffer, pagesize=(img_width_pt, img_height_pt))
    c.drawImage(ImageReader(io.BytesIO(png_bytes)), 0, 0, width=img_width_pt, height=img_height_pt)
    c.showPage()
    c.save()
    temp_pdf_buffer.seek(0)
    return PdfReader(temp_pdf_buffer).pages[0]


def generate_optimized_preview(content_bytes, content_type='pdf'):
    """Generate a low-res preview without double-processing"""
    try:
        if content_type == 'pdf':
            from pdf2image import convert_from_bytes
            images = convert_from_bytes(content_bytes, first_page=1, last_page=1, dpi=PREVIEW_DPI)
            if not images: return None
            preview_img = images[0]
        else:
            preview_img = Image.open(io.BytesIO(content_bytes))
        
        # Resize and compress
        preview_img.thumbnail((600, 600), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        preview_img.convert('RGB').save(output, format='JPEG', quality=PREVIEW_QUALITY, optimize=True)
        return base64.b64encode(output.getvalue()).decode('utf-8')
    except Exception as e:
        current_app.logger.error(f"Optimized preview failed: {str(e)}")
        return None

@pdf_bp.route('/pdf/convert-coloring', methods=['POST'])
@rate_limit_pdf_processing
@jwt_required()
def convert_to_coloring():
    user_id = get_jwt_identity()
    if 'file' not in request.files:
        return error_response('No file uploaded', 'MISSING_FILE', status_code=400)
    
    file = request.files["file"]
    threshold = int(request.form.get("threshold", 127))
    trim_size = request.form.get("trim_size", "8.5x11")
    
    with PerformanceTimer("coloring_conversion"):
        try:
            img_bytes = file.read()
            image = Image.open(io.BytesIO(img_bytes)).convert("RGB")

            # Calculate target dimensions in pixels
            target_width_pt, target_height_pt = get_kdp_dimensions(trim_size, 'print')
            target_width_px = int(target_width_pt / 72 * PRINT_DPI)
            target_height_px = int(target_height_pt / 72 * PRINT_DPI)

            # Resize image to fit within target dimensions, maintaining aspect ratio
            img_width, img_height = image.size
            aspect_ratio = img_width / img_height

            if img_width > target_width_px or img_height > target_height_px:
                if aspect_ratio > (target_width_px / target_height_px):
                    new_width = target_width_px
                    new_height = int(new_width / aspect_ratio)
                else:
                    new_height = target_height_px
                    new_width = int(new_height * aspect_ratio)
                image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Create a new blank image with target dimensions and paste the resized image
            # This adds padding if the image is smaller than the target or has a different aspect ratio
            padded_image = Image.new('RGB', (target_width_px, target_height_px), (255, 255, 255))
            paste_x = (target_width_px - image.width) // 2
            paste_y = (target_height_px - image.height) // 2
            padded_image.paste(image, (paste_x, paste_y))

            # Convert to OpenCV format for coloring effect
            cv_image = cv2.cvtColor(np.array(padded_image), cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)

            # Save optimized output
            output_buffer = io.BytesIO()
            result_image = Image.fromarray(binary)
            result_image.save(output_buffer, format='PNG')
            output_bytes = output_buffer.getvalue()
            
            # Optimization: Upload and return signed URL instead of Base64 blob
            filename = f"coloring_{uuid.uuid4().hex[:8]}.png"
            storage_info = upload_file(output_bytes, str(user_id), filename, 'coloring_page')
            
            supabase.table("analytics_events").insert({
                "user_id": user_id,
                "event_type": "pdf_coloring_conversion",
                "event_data": {"status": "success", "file_size_mb": round(len(output_bytes) / (1024 * 1024), 2), "format": "PNG", "trim_size": trim_size}
            }).execute()
            return success_response({
                'download_url': storage_info['signed_url'],
                'preview': generate_optimized_preview(output_bytes, 'image'),
                'file_size_mb': round(len(output_bytes) / (1024 * 1024), 2),
                'format': 'PNG'
            })
        except Exception as e:
            current_app.logger.error(f"Coloring conversion failed: {str(e)}")
            supabase.table("analytics_events").insert({
                "user_id": user_id,
                "event_type": "pdf_coloring_conversion",
                "event_data": {"status": "failed", "error": str(e), "trim_size": trim_size}
            }).execute()
            return error_response("Conversion failed", "CONVERSION_ERROR", status_code=500)

@pdf_bp.route('/pdf/format-kdp', methods=['POST'])
@rate_limit_pdf_processing
@jwt_required()
def format_kdp():
    user_id = get_jwt_identity()
    if 'file' not in request.files:
        return error_response('No file uploaded', 'MISSING_FILE', status_code=400)
    
    file = request.files['file']
    trim_size = request.form.get('trim_size', '8.5x11')
    
    with PerformanceTimer("kdp_formatting"):
        try:
            pdf_bytes = file.read()
            reader = PdfReader(io.BytesIO(pdf_bytes))
            writer = PdfWriter()
            
            target_w, target_h = get_kdp_dimensions(trim_size, 'print')
            
            for page in reader.pages:
                page.scale_to(target_w, target_h)
                writer.add_page(page)
            
            output_buffer = io.BytesIO()
            writer.write(output_buffer)
            output_bytes = output_buffer.getvalue()
            
            # Optimization: Direct upload, return signed URL
            filename = f"kdp_{uuid.uuid4().hex[:8]}.pdf"
            storage_info = upload_file(output_bytes, str(user_id), filename, 'kdp_formatted_pdf')
            
            supabase.table("analytics_events").insert({
                "user_id": user_id,
                "event_type": "kdp_formatting",
                "event_data": {"status": "success", "file_size_mb": round(len(output_bytes) / (1024 * 1024), 2), "format": "PDF"}
            }).execute()
            return success_response({
                'download_url': storage_info['signed_url'],
                'preview': generate_optimized_preview(output_bytes, 'pdf'),
                'file_size_mb': round(len(output_bytes) / (1024 * 1024), 2),
                'format': 'PDF'
            })
        except Exception as e:
            current_app.logger.error(f"KDP formatting failed: {str(e)}")
            supabase.table("analytics_events").insert({
                "user_id": user_id,
                "event_type": "kdp_formatting",
                "event_data": {"status": "failed", "error": str(e)}
            }).execute()
            return error_response("Formatting failed", "FORMATTING_ERROR", status_code=500)

@pdf_bp.route("/pdf/batch-coloring", methods=["POST"])
@rate_limit_pdf_processing
@jwt_required()
def batch_convert_coloring():
    user_id = get_jwt_identity()
    if not request.files:
        return error_response("No files uploaded", "MISSING_FILES", status_code=400)

    trim_size = request.form.get("trim_size", "8.5x11")
    threshold = int(request.form.get("threshold", 127))
    cover_title = request.form.get("cover_title", "").strip()
    generate_cover = request.form.get("generate_cover", "false").lower() in ("1", "true", "yes")

    file_order_raw = request.form.get("file_order")
    if file_order_raw:
        try:
            file_keys = json.loads(file_order_raw)
        except json.JSONDecodeError:
            return error_response("Invalid file_order JSON", "INVALID_INPUT", status_code=400)
    else:
        file_keys = sorted(request.files.keys())

    output_pdfs = []

    with PerformanceTimer("batch_coloring_conversion"):
        try:
            for key in file_keys:
                if key not in request.files:
                    continue
                file = request.files[key]
                img_bytes = file.read()
                image = Image.open(io.BytesIO(img_bytes)).convert("RGB")

                target_width_pt, target_height_pt = get_kdp_dimensions(trim_size, 'print')
                target_width_px = int(target_width_pt / 72 * PRINT_DPI)
                target_height_px = int(target_height_pt / 72 * PRINT_DPI)

                img_width, img_height = image.size
                aspect_ratio = img_width / img_height

                if img_width > target_width_px or img_height > target_height_px:
                    if aspect_ratio > (target_width_px / target_height_px):
                        new_width = target_width_px
                        new_height = int(new_width / aspect_ratio)
                    else:
                        new_height = target_height_px
                        new_width = int(new_height * aspect_ratio)
                    image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

                padded_image = Image.new('RGB', (target_width_px, target_height_px), (255, 255, 255))
                paste_x = (target_width_px - image.width) // 2
                paste_y = (target_height_px - image.height) // 2
                padded_image.paste(image, (paste_x, paste_y))

                cv_image = cv2.cvtColor(np.array(padded_image), cv2.COLOR_RGB2BGR)
                gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
                _, binary = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)

                output_buffer = io.BytesIO()
                result_image = Image.fromarray(binary)
                result_image.save(output_buffer, format='PNG')
                output_pdfs.append(output_buffer.getvalue())

            pdf_writer = PdfWriter()

            if generate_cover and cover_title:
                cover_bytes = generate_title_page_pdf(cover_title, trim_size)
                cover_reader = PdfReader(io.BytesIO(cover_bytes))
                pdf_writer.add_page(cover_reader.pages[0])

            for png_bytes in output_pdfs:
                pdf_writer.add_page(_png_bytes_to_pdf_page(png_bytes))

            final_pdf_buffer = io.BytesIO()
            pdf_writer.write(final_pdf_buffer)
            final_pdf_bytes = final_pdf_buffer.getvalue()

            filename = f"batch_coloring_{uuid.uuid4().hex[:8]}.pdf"
            storage_info = upload_file(final_pdf_bytes, str(user_id), filename, 'batch_coloring_pdf')

            supabase.table("analytics_events").insert({
                "user_id": user_id,
                "event_type": "batch_coloring_conversion",
                "event_data": {
                    "status": "success",
                    "file_count": len(output_pdfs),
                    "has_cover": bool(generate_cover and cover_title),
                    "file_size_mb": round(len(final_pdf_bytes) / (1024 * 1024), 2),
                    "format": "PDF",
                    "trim_size": trim_size,
                },
            }).execute()
            return success_response({
                'download_url': storage_info['signed_url'],
                'preview': generate_optimized_preview(final_pdf_bytes, 'pdf'),
                'file_size_mb': round(len(final_pdf_bytes) / (1024 * 1024), 2),
                'format': 'PDF',
                'page_count': len(output_pdfs) + (1 if generate_cover and cover_title else 0),
            })
        except Exception as e:
            current_app.logger.error(f"Batch coloring conversion failed: {str(e)}")
            supabase.table("analytics_events").insert({
                "user_id": user_id,
                "event_type": "batch_coloring_conversion",
                "event_data": {"status": "failed", "error": str(e), "file_count": len(file_keys), "trim_size": trim_size},
            }).execute()
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

    with PerformanceTimer("kdp_validation"):
        try:
            pdf_bytes = file.read()
            reader = PdfReader(io.BytesIO(pdf_bytes))
            
            # Basic validation: page count, dimensions
            num_pages = len(reader.pages)
            if num_pages == 0:
                return error_response("PDF contains no pages", "EMPTY_PDF", status_code=400)

            first_page = reader.pages[0]
            media_box = first_page.mediabox
            pdf_width = float(media_box.width) / 72 # Convert points to inches
            pdf_height = float(media_box.height) / 72 # Convert points to inches

            expected_width, expected_height = get_kdp_dimensions(trim_size, target_format)
            expected_width_in = expected_width / 72
            expected_height_in = expected_height / 72

            dimension_match = (
                abs(pdf_width - expected_width_in) < 0.05 and
                abs(pdf_height - expected_height_in) < 0.05
            )

            warnings = []
            if not dimension_match:
                warnings.append(f"Dimensions mismatch. Expected {expected_width_in:.2f}x{expected_height_in:.2f} inches, got {pdf_width:.2f}x{pdf_height:.2f} inches.")
            
            # Add more sophisticated checks here (e.g., font embedding, image resolution)

            supabase.table("analytics_events").insert({
                "user_id": user_id,
                "event_type": "kdp_validation",
                "event_data": {"status": "success", "is_valid": dimension_match and not warnings, "num_pages": num_pages, "pdf_dimensions_inches": f"{pdf_width:.2f}x{pdf_height:.2f}"}
            }).execute()
            return success_response({
                "is_valid": dimension_match and not warnings, # Simplified for now
                "num_pages": num_pages,
                "pdf_dimensions_inches": f"{pdf_width:.2f}x{pdf_height:.2f}",
                "expected_dimensions_inches": f"{expected_width_in:.2f}x{expected_height_in:.2f}",
                "warnings": warnings,
                "message": "PDF validation complete"
            })
        except Exception as e:
            current_app.logger.error(f"KDP validation failed: {str(e)}")
            supabase.table("analytics_events").insert({
                "user_id": user_id,
                "event_type": "kdp_validation",
                "event_data": {"status": "failed", "error": str(e)}
            }).execute()
            return error_response("Validation failed", "VALIDATION_ERROR", status_code=500)
