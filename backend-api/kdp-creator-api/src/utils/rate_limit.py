"""
Rate Limiting Module

Provides rate limiting for sensitive API endpoints:
- Login attempts
- Password reset requests
- File uploads
- Batch processing

Uses in-memory storage (suitable for single-instance deployments).
For multi-instance deployments, use Redis.
"""

import os
import time
from functools import wraps
from flask import request
from collections import defaultdict
from src.utils.validation import error_response
from src.utils.logger import log_warning

# ============================================================================
# Rate Limiter Configuration
# ============================================================================

class RateLimiter:
    """In-memory rate limiter for single-instance deployments"""
    
    def __init__(self):
        self.requests = defaultdict(list)
        self.cleanup_interval = 300  # Clean up old entries every 5 minutes
        self.last_cleanup = time.time()
    
    def _cleanup(self):
        """Remove old entries to prevent memory bloat"""
        current_time = time.time()
        
        if current_time - self.last_cleanup < self.cleanup_interval:
            return
        
        # Remove entries older than 1 hour
        cutoff_time = current_time - 3600
        
        for key in list(self.requests.keys()):
            self.requests[key] = [
                timestamp for timestamp in self.requests[key]
                if timestamp > cutoff_time
            ]
            
            if not self.requests[key]:
                del self.requests[key]
        
        self.last_cleanup = current_time
    
    def is_allowed(self, key, max_requests, window_seconds):
        """
        Check if a request is allowed under rate limit
        
        Args:
            key (str): Unique identifier (e.g., IP address, user ID)
            max_requests (int): Maximum requests allowed
            window_seconds (int): Time window in seconds
        
        Returns:
            tuple: (allowed, remaining_requests, reset_time)
        """
        self._cleanup()
        
        current_time = time.time()
        cutoff_time = current_time - window_seconds
        
        # Remove old requests outside the window
        self.requests[key] = [
            timestamp for timestamp in self.requests[key]
            if timestamp > cutoff_time
        ]
        
        # Check if limit exceeded
        request_count = len(self.requests[key])
        
        if request_count >= max_requests:
            # Calculate reset time (when oldest request expires)
            reset_time = self.requests[key][0] + window_seconds
            return False, 0, reset_time
        
        # Add current request
        self.requests[key].append(current_time)
        
        remaining = max_requests - len(self.requests[key])
        reset_time = current_time + window_seconds
        
        return True, remaining, reset_time


# Global rate limiter instance
_rate_limiter = RateLimiter()


# ============================================================================
# Rate Limit Decorators
# ============================================================================

def rate_limit(max_requests, window_seconds, key_func=None):
    """
    Decorator to rate limit API endpoints
    
    Args:
        max_requests (int): Maximum requests allowed
        window_seconds (int): Time window in seconds
        key_func (callable): Function to generate rate limit key
                            Default: client IP address
    
    Example:
        @app.route('/login', methods=['POST'])
        @rate_limit(max_requests=5, window_seconds=300)  # 5 requests per 5 minutes
        def login():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Generate rate limit key
            if key_func:
                key = key_func()
            else:
                key = request.remote_addr
            
            # Check rate limit
            allowed, remaining, reset_time = _rate_limiter.is_allowed(
                key, max_requests, window_seconds
            )
            
            if not allowed:
                reset_seconds = int(reset_time - time.time())
                
                log_warning(
                    f'Rate limit exceeded for {key}',
                    endpoint=request.path,
                    method=request.method,
                    reset_in_seconds=reset_seconds,
                )
                
                return error_response(
                    f'Rate limit exceeded. Try again in {reset_seconds} seconds.',
                    code=429,
                    details={
                        'retry_after': reset_seconds,
                        'reset_time': reset_time,
                    }
                )
            
            # Add rate limit headers to response
            response = f(*args, **kwargs)
            
            if isinstance(response, tuple):
                response_data, status_code = response[0], response[1]
                headers = response[2] if len(response) > 2 else {}
            else:
                response_data = response
                status_code = 200
                headers = {}
            
            # Add rate limit headers
            headers['X-RateLimit-Limit'] = str(max_requests)
            headers['X-RateLimit-Remaining'] = str(remaining)
            headers['X-RateLimit-Reset'] = str(int(reset_time))
            
            return response_data, status_code, headers
        
        return decorated_function
    
    return decorator


# ============================================================================
# Pre-configured Rate Limits
# ============================================================================

# Login attempts: 5 per 5 minutes per IP
LOGIN_LIMIT = (5, 300)

# Password reset: 3 per hour per email
PASSWORD_RESET_LIMIT = (3, 3600)

# File upload: 10 per hour per user
FILE_UPLOAD_LIMIT = (10, 3600)

# Batch processing: 5 per day per user
BATCH_PROCESSING_LIMIT = (5, 86400)

# API requests: 100 per hour per IP (general limit)
API_GENERAL_LIMIT = (100, 3600)


# ============================================================================
# Rate Limit Decorators for Common Endpoints
# ============================================================================

def rate_limit_login(f):
    """Rate limit login attempts"""
    @wraps(f)
    @rate_limit(max_requests=LOGIN_LIMIT[0], window_seconds=LOGIN_LIMIT[1])
    def decorated_function(*args, **kwargs):
        return f(*args, **kwargs)
    return decorated_function


def rate_limit_password_reset(f):
    """Rate limit password reset requests"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Use email as key for password reset
        data = request.get_json() or {}
        email = data.get('email', request.remote_addr)
        
        allowed, remaining, reset_time = _rate_limiter.is_allowed(
            f'password_reset:{email}',
            PASSWORD_RESET_LIMIT[0],
            PASSWORD_RESET_LIMIT[1]
        )
        
        if not allowed:
            reset_seconds = int(reset_time - time.time())
            return error_response(
                f'Too many password reset requests. Try again in {reset_seconds} seconds.',
                code=429,
                details={'retry_after': reset_seconds}
            )
        
        return f(*args, **kwargs)
    
    return decorated_function


def rate_limit_file_upload(f):
    """Rate limit file uploads"""
    @wraps(f)
    @rate_limit(max_requests=FILE_UPLOAD_LIMIT[0], window_seconds=FILE_UPLOAD_LIMIT[1])
    def decorated_function(*args, **kwargs):
        return f(*args, **kwargs)
    return decorated_function


def rate_limit_pdf_processing(f):
    """Rate limit PDF processing endpoints"""
    return rate_limit_file_upload(f)


def rate_limit_batch_processing(f):
    """Rate limit batch processing"""
    @wraps(f)
    @rate_limit(max_requests=BATCH_PROCESSING_LIMIT[0], window_seconds=BATCH_PROCESSING_LIMIT[1])
    def decorated_function(*args, **kwargs):
        return f(*args, **kwargs)
    return decorated_function


# ============================================================================
# Utility Functions
# ============================================================================

def get_rate_limit_status(key, max_requests, window_seconds):
    """Get current rate limit status for a key"""
    allowed, remaining, reset_time = _rate_limiter.is_allowed(
        key, max_requests, window_seconds
    )
    
    return {
        'allowed': allowed,
        'remaining': remaining,
        'reset_time': reset_time,
        'reset_in_seconds': int(reset_time - time.time()),
    }


def reset_rate_limit(key):
    """Reset rate limit for a specific key (admin only)"""
    if key in _rate_limiter.requests:
        del _rate_limiter.requests[key]
        return True
    return False
