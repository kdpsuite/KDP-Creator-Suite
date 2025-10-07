from flask import Blueprint, request, jsonify, current_app
import os
import io
import base64
from PIL import Image, ImageFilter, ImageOps
import cv2
import numpy as np
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch
import tempfile
import uuid
from datetime import datetime

pdf_bp = Blueprint('pdf_processing', __name__)

# KDP compliance constants
KDP_TRIM_SIZES = {
    'paperback_6x9': {'width': 6.0, 'height': 9.0},
    'paperback_5x8': {'width': 5.0, 'height': 8.0},
    'paperback_5.5x8.5': {'width': 5.5, 'height': 8.5},
    'paperback_7x10': {'width': 7.0, 'height': 10.0},
    'paperback_8.5x11': {'width': 8.5, 'height': 11.0},
    'kindle_6x9': {'width': 6.0, 'height': 9.0},
    'kindle_5x8': {'width': 5.0, 'height': 8.0},
}

BLEED_SIZE = 0.125  # 0.125 inches
PRINT_DPI = 300
DIGITAL_DPI = 150

@pdf_bp.route('/convert-image-to-coloring', methods=['POST'])
def convert_image_to_coloring():
    """Convert an image to a coloring book page"""
    try:
        # Get image data from request
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({'error': 'No image file selected'}), 400
        
        # Get processing options
        options = request.form.to_dict()
        threshold = int(options.get('threshold', 127))
        block_size = int(options.get('block_size', 11))
        c_value = float(options.get('c_value', 2.0))
        invert_colors = options.get('invert_colors', 'false').lower() == 'true'
        enhance_lines = options.get('enhance_lines', 'true').lower() == 'true'
        
        # Read and process the image
        image_bytes = image_file.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert PIL image to OpenCV format
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Apply coloring book conversion
        processed_image = apply_coloring_book_filters(
            cv_image, threshold, block_size, c_value, invert_colors, enhance_lines
        )
        
        # Convert back to PIL Image
        processed_pil = Image.fromarray(cv2.cvtColor(processed_image, cv2.COLOR_BGR2RGB))
        
        # Save to bytes
        output_buffer = io.BytesIO()
        processed_pil.save(output_buffer, format='PNG', dpi=(PRINT_DPI, PRINT_DPI))
        output_bytes = output_buffer.getvalue()
        
        # Encode as base64 for response
        encoded_image = base64.b64encode(output_bytes).decode('utf-8')
        
        return jsonify({
            'success': True,
            'image_data': encoded_image,
            'file_size_mb': len(output_bytes) / (1024 * 1024),
            'processing_options': {
                'threshold': threshold,
                'block_size': block_size,
                'c_value': c_value,
                'invert_colors': invert_colors,
                'enhance_lines': enhance_lines,
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"Image to coloring conversion failed: {str(e)}")
        return jsonify({'error': f'Conversion failed: {str(e)}'}), 500

@pdf_bp.route('/validate-kdp-compliance', methods=['POST'])
def validate_kdp_compliance():
    """Validate PDF for KDP compliance"""
    try:
        if 'pdf' not in request.files:
            return jsonify({'error': 'No PDF file provided'}), 400
        
        pdf_file = request.files['pdf']
        target_format = request.form.get('target_format', 'kindle_ebook')
        trim_size = request.form.get('trim_size')
        
        # Read PDF
        pdf_bytes = pdf_file.read()
        pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
        
        issues = []
        warnings = []
        recommendations = []
        compliance_score = 100.0
        
        page_count = len(pdf_reader.pages)
        
        # Calculate dynamic margins based on page count
        required_margins = calculate_dynamic_margins(page_count, target_format)
        
        # Validate trim size if specified
        if trim_size and trim_size in KDP_TRIM_SIZES:
            expected_size = KDP_TRIM_SIZES[trim_size]
            first_page = pdf_reader.pages[0]
            
            # Get page dimensions (in points, 72 points = 1 inch)
            page_width = float(first_page.mediabox.width) / 72
            page_height = float(first_page.mediabox.height) / 72
            
            tolerance = 0.1  # 0.1 inch tolerance
            if (abs(page_width - expected_size['width']) > tolerance or
                abs(page_height - expected_size['height']) > tolerance):
                issues.append(f"Page size mismatch. Expected: {expected_size['width']}\" x {expected_size['height']}\", "
                            f"Got: {page_width:.2f}\" x {page_height:.2f}\"")
                compliance_score -= 20
        
        # Check for bleed requirements
        if 'print' in target_format or 'paperback' in target_format:
            recommendations.append(f"Ensure all background elements extend to the bleed area ({BLEED_SIZE}\" beyond trim)")
        
        # Add margin recommendations
        recommendations.append(f"Ensure text and important elements are within the safe area: "
                             f"Top: {required_margins['top']}\", Bottom: {required_margins['bottom']}\", "
                             f"Left: {required_margins['left']}\", Right: {required_margins['right']}\"")
        
        # Validate for coloring book specific requirements
        if 'coloring_book' in target_format:
            validate_coloring_book_requirements(pdf_reader, issues, warnings, compliance_score)
        
        return jsonify({
            'success': True,
            'compliance_score': compliance_score,
            'is_compliant': len(issues) == 0,
            'issues': issues,
            'warnings': warnings,
            'recommendations': recommendations,
            'required_margins': required_margins,
            'target_format': target_format,
            'page_count': page_count,
        })
        
    except Exception as e:
        current_app.logger.error(f"KDP compliance validation failed: {str(e)}")
        return jsonify({'error': f'Validation failed: {str(e)}'}), 500

@pdf_bp.route('/convert-to-kdp-format', methods=['POST'])
def convert_to_kdp_format():
    """Convert PDF to KDP-compliant format"""
    try:
        if 'pdf' not in request.files:
            return jsonify({'error': 'No PDF file provided'}), 400
        
        pdf_file = request.files['pdf']
        target_format = request.form.get('target_format', 'kindle_ebook')
        trim_size = request.form.get('trim_size')
        user_id = request.form.get('user_id')
        
        # Read PDF
        pdf_bytes = pdf_file.read()
        pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
        
        page_count = len(pdf_reader.pages)
        margins = calculate_dynamic_margins(page_count, target_format)
        
        # Create new PDF with KDP compliance
        output_buffer = io.BytesIO()
        pdf_writer = PdfWriter()
        
        # Process each page
        for page_num, page in enumerate(pdf_reader.pages):
            # Apply KDP-specific formatting
            processed_page = apply_kdp_formatting(page, target_format, margins, trim_size)
            pdf_writer.add_page(processed_page)
        
        # Write to buffer
        pdf_writer.write(output_buffer)
        output_bytes = output_buffer.getvalue()
        
        # Apply watermark if needed (for free tier users)
        final_bytes = apply_watermark_if_needed(output_bytes, user_id)
        
        # Encode as base64 for response
        encoded_pdf = base64.b64encode(final_bytes).decode('utf-8')
        
        return jsonify({
            'success': True,
            'pdf_data': encoded_pdf,
            'file_size_mb': len(final_bytes) / (1024 * 1024),
            'page_count': page_count,
            'target_format': target_format,
            'applied_margins': margins,
        })
        
    except Exception as e:
        current_app.logger.error(f"PDF conversion failed: {str(e)}")
        return jsonify({'error': f'Conversion failed: {str(e)}'}), 500

@pdf_bp.route('/batch-process', methods=['POST'])
def batch_process():
    """Process multiple files in batch"""
    try:
        files = request.files.getlist('files')
        target_format = request.form.get('target_format', 'kindle_ebook')
        user_id = request.form.get('user_id')
        
        if not files:
            return jsonify({'error': 'No files provided'}), 400
        
        results = {}
        total_files = len(files)
        
        for i, file in enumerate(files):
            try:
                file_bytes = file.read()
                
                # Determine file type and process accordingly
                if file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                    # Process as image to coloring book
                    result = process_image_file(file_bytes, target_format)
                else:
                    # Process as PDF
                    result = process_pdf_file(file_bytes, target_format, user_id)
                
                results[f'file_{i}'] = result
                
            except Exception as e:
                results[f'file_{i}'] = {
                    'success': False,
                    'error': str(e),
                    'filename': file.filename,
                }
        
        return jsonify({
            'success': True,
            'results': results,
            'total_files': total_files,
            'completed_at': datetime.now().isoformat(),
        })
        
    except Exception as e:
        current_app.logger.error(f"Batch processing failed: {str(e)}")
        return jsonify({'error': f'Batch processing failed: {str(e)}'}), 500

# Helper functions

def apply_coloring_book_filters(image, threshold, block_size, c_value, invert_colors, enhance_lines):
    """Apply coloring book conversion filters to an image"""
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Apply adaptive threshold for line detection
    adaptive_thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, block_size, c_value
    )
    
    # Apply morphological operations to clean up lines
    if enhance_lines:
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        adaptive_thresh = cv2.morphologyEx(adaptive_thresh, cv2.MORPH_CLOSE, kernel)
    
    # Invert if requested
    if invert_colors:
        adaptive_thresh = cv2.bitwise_not(adaptive_thresh)
    
    # Convert back to 3-channel for consistency
    result = cv2.cvtColor(adaptive_thresh, cv2.COLOR_GRAY2BGR)
    
    return result

def calculate_dynamic_margins(page_count, format_type):
    """Calculate dynamic margins based on page count (KDP requirement)"""
    # Base inside margin
    inside_margin = 0.75
    
    # Adjust based on page count for binding
    if page_count > 24:
        inside_margin = 0.875
    if page_count > 150:
        inside_margin = 1.0
    if page_count > 300:
        inside_margin = 1.125
    if page_count > 500:
        inside_margin = 1.25
    
    return {
        'top': 0.75,
        'bottom': 0.75,
        'left': inside_margin,
        'right': 0.75,
    }

def apply_kdp_formatting(page, target_format, margins, trim_size):
    """Apply KDP-specific formatting to a page"""
    # This would involve complex PDF manipulation
    # For now, return the page as-is
    # In a full implementation, this would:
    # - Adjust page size to trim size
    # - Apply margins
    # - Add bleed if required
    # - Optimize for target format
    return page

def validate_coloring_book_requirements(pdf_reader, issues, warnings, compliance_score):
    """Validate coloring book specific requirements"""
    # Check for appropriate line thickness
    # Check for sufficient white space
    # Validate that images are suitable for coloring
    # These would require advanced PDF content analysis
    pass

def apply_watermark_if_needed(pdf_bytes, user_id):
    """Apply watermark for free tier users"""
    # In a full implementation, this would check user subscription tier
    # and apply watermark if needed
    return pdf_bytes

def process_image_file(image_bytes, target_format):
    """Process an image file for batch processing"""
    try:
        # Convert image to coloring book
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        processed = apply_coloring_book_filters(cv_image, 127, 11, 2.0, False, True)
        
        # Convert back and save
        result_image = Image.fromarray(cv2.cvtColor(processed, cv2.COLOR_BGR2RGB))
        output_buffer = io.BytesIO()
        result_image.save(output_buffer, format='PNG')
        
        return {
            'success': True,
            'data': base64.b64encode(output_buffer.getvalue()).decode('utf-8'),
            'type': 'image',
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
        }

def process_pdf_file(pdf_bytes, target_format, user_id):
    """Process a PDF file for batch processing"""
    try:
        # Basic PDF processing
        pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
        pdf_writer = PdfWriter()
        
        for page in pdf_reader.pages:
            pdf_writer.add_page(page)
        
        output_buffer = io.BytesIO()
        pdf_writer.write(output_buffer)
        
        return {
            'success': True,
            'data': base64.b64encode(output_buffer.getvalue()).decode('utf-8'),
            'type': 'pdf',
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
        }

