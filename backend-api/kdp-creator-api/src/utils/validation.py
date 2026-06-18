"""
Validation utilities for request handling and error responses.

Provides decorators and helper functions for:
- Request JSON validation
- Consistent error response formatting
- Input sanitization
"""

import os
import logging
from functools import wraps
from flask import request, jsonify
from marshmallow import Schema, ValidationError

logger = logging.getLogger(__name__)

# ============================================================================
# Error Response Helper
# ============================================================================

def error_response(message, code=400, details=None):
    """
    Return a consistent error response.
    
    Args:
        message (str): Error message
        code (int): HTTP status code
        details (dict): Additional error details
    
    Returns:
        tuple: (response dict, HTTP status code)
    """
    response = {
        "ok": False,
        "error": {
            "code": code,
            "message": message,
        }
    }
    
    if details:
        response["error"]["details"] = details
    
    logger.warning(f"[ERROR_RESPONSE] {code}: {message}", extra={"details": details})
    
    return jsonify(response), code


def success_response(data=None, message="Success"):
    """
    Return a consistent success response.
    
    Args:
        data (dict): Response data
        message (str): Success message
    
    Returns:
        tuple: (response dict, HTTP status code)
    """
    response = {
        "ok": True,
        "message": message,
    }
    
    if data:
        response["data"] = data
    
    return jsonify(response), 200


# ============================================================================
# Request Validation Decorator
# ============================================================================

def validate_json(schema=None):
    """
    Decorator to validate request JSON against a Marshmallow schema.
    
    Args:
        schema (Schema): Marshmallow schema for validation
    
    Returns:
        function: Decorated function
    
    Example:
        class LoginSchema(Schema):
            email = fields.Email(required=True)
            password = fields.String(required=True, validate=lambda x: len(x) >= 6)
        
        @app.route('/login', methods=['POST'])
        @validate_json(LoginSchema())
        def login():
            data = request.get_json()
            # data is already validated
            return success_response({"token": "..."})
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check if request has JSON content type
            if not request.is_json:
                return error_response(
                    "Request must be JSON",
                    code=400,
                    details={"content_type": request.content_type}
                )
            
            try:
                data = request.get_json()
            except Exception as e:
                return error_response(
                    "Invalid JSON",
                    code=400,
                    details={"error": str(e)}
                )
            
            # Validate against schema if provided
            if schema:
                try:
                    validated_data = schema.load(data)
                    # Store validated data in request context
                    request.validated_data = validated_data
                except ValidationError as e:
                    return error_response(
                        "Validation failed",
                        code=400,
                        details=e.messages
                    )
            
            return f(*args, **kwargs)
        
        return decorated_function
    
    return decorator


# ============================================================================
# File Upload Validation
# ============================================================================

def validate_file_upload(max_size=None, allowed_types=None):
    """
    Decorator to validate file uploads.
    
    Args:
        max_size (int): Maximum file size in bytes
        allowed_types (list): List of allowed file extensions (without dots)
    
    Returns:
        function: Decorated function
    
    Example:
        @app.route('/upload', methods=['POST'])
        @validate_file_upload(max_size=52428800, allowed_types=['pdf', 'jpg', 'png'])
        def upload_file():
            file = request.files['file']
            # file is already validated
            return success_response({"file_id": "..."})
    """
    # Get defaults from environment if not provided
    if max_size is None:
        max_size = int(os.environ.get('MAX_FILE_SIZE', 52428800))
    
    if allowed_types is None:
        allowed_types_str = os.environ.get('ALLOWED_FILE_TYPES', 'pdf,jpg,jpeg,png,gif')
        allowed_types = [t.strip() for t in allowed_types_str.split(',')]
    
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check if file is in request
            if 'file' not in request.files:
                return error_response(
                    "No file provided",
                    code=400,
                    details={"field": "file"}
                )
            
            file = request.files['file']
            
            # Check if file is empty
            if file.filename == '':
                return error_response(
                    "File name is empty",
                    code=400,
                    details={"field": "file"}
                )
            
            # Get file extension
            filename = file.filename
            if '.' not in filename:
                return error_response(
                    "File must have an extension",
                    code=400,
                    details={"filename": filename}
                )
            
            file_ext = filename.rsplit('.', 1)[1].lower()
            
            # Validate file type
            if file_ext not in allowed_types:
                return error_response(
                    f"File type not allowed. Allowed types: {', '.join(allowed_types)}",
                    code=400,
                    details={"file_type": file_ext, "allowed_types": allowed_types}
                )
            
            # Check file size
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)
            
            if file_size > max_size:
                return error_response(
                    f"File too large. Maximum size: {max_size / 1024 / 1024:.1f} MB",
                    code=413,
                    details={"file_size": file_size, "max_size": max_size}
                )
            
            logger.info(f"[FILE_UPLOAD] Validated: {filename} ({file_size} bytes)")
            
            return f(*args, **kwargs)
        
        return decorated_function
    
    return decorator


# ============================================================================
# Input Sanitization
# ============================================================================

def sanitize_string(value, max_length=None):
    """
    Sanitize a string input.
    
    Args:
        value (str): String to sanitize
        max_length (int): Maximum length
    
    Returns:
        str: Sanitized string
    """
    if not isinstance(value, str):
        return value
    
    # Strip whitespace
    value = value.strip()
    
    # Truncate if max_length specified
    if max_length and len(value) > max_length:
        value = value[:max_length]
    
    return value


def sanitize_email(value):
    """
    Sanitize and validate email address.
    
    Args:
        value (str): Email address
    
    Returns:
        str: Sanitized email
    
    Raises:
        ValueError: If email is invalid
    """
    value = sanitize_string(value).lower()
    
    # Basic email validation
    if '@' not in value or '.' not in value:
        raise ValueError("Invalid email address")
    
    return value


# ============================================================================
# Request Logging
# ============================================================================

def log_request(f):
    """
    Decorator to log incoming requests.
    
    Logs:
    - Request method and path
    - Request size
    - Client IP
    - User agent
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        client_ip = request.remote_addr
        method = request.method
        path = request.path
        content_length = request.content_length or 0
        user_agent = request.user_agent.string if request.user_agent else "Unknown"
        
        logger.info(
            f"[REQUEST] {method} {path} from {client_ip}",
            extra={
                "method": method,
                "path": path,
                "client_ip": client_ip,
                "content_length": content_length,
                "user_agent": user_agent,
            }
        )
        
        return f(*args, **kwargs)
    
    return decorated_function
