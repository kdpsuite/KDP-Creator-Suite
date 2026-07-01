import io
import os
import uuid
import base64
from datetime import datetime
from flask import Blueprint, request, current_app, send_file
from pypdf import PdfReader, PdfWriter
from PIL import Image
import cv2
import numpy as np
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import grey
from functools import lru_cache

from src.models.user import jwt_required, get_jwt_identity, User
from src.storage import upload_file
from src.utils.responses import success_response, error_response
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
    
    file = request.files['file']
    threshold = int(request.form.get('threshold', 127))
    
    with PerformanceTimer("coloring_conversion"):
        try:
            img_bytes = file.read()
            image = Image.open(io.BytesIO(img_bytes))
            
            # Optimization: Use PNG for coloring pages for lossless quality, potentially smaller file size for line art
            cv_image = cv2.cvtColor(np.array(image.convert('RGB')), cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
            
            # Save optimized output
            output_buffer = io.BytesIO()
            result_image = Image.fromarray(binary)
            result_image.save(output_buffer, format=\'PNG\', optimize=True)
            output_bytes = output_buffer.getvalue()
            
            # Optimization: Upload and return signed URL instead of Base64 blob
            filename = f"coloring_{uuid.uuid4().hex[:8]}.png"
            storage_info = upload_file(output_bytes, str(user_id), filename, 'coloring_page')
            
            return success_response({
                'download_url': storage_info['signed_url'],
                'preview': generate_optimized_preview(output_bytes, 'image'),
                'file_size_mb': round(len(output_bytes) / (1024 * 1024), 2),
                'format': 'PNG'
            })
        except Exception as e:
            current_app.logger.error(f"Coloring conversion failed: {str(e)}")
            return error_response('Conversion failed', 'CONVERSION_ERROR', status_code=500)

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
            
            return success_response({
                'download_url': storage_info['signed_url'],
                'preview': generate_optimized_preview(output_bytes, 'pdf'),
                'file_size_mb': round(len(output_bytes) / (1024 * 1024), 2),
                'format': 'PDF'
            })
        except Exception as e:
            current_app.logger.error(f"KDP formatting failed: {str(e)}")
            return error_response('Formatting failed', 'FORMATTING_ERROR', status_code=500)

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
            return error_response("Validation failed", "VALIDATION_ERROR", status_code=500)
