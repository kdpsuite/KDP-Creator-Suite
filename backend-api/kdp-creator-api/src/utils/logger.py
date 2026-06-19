"""
Structured Logging Module

Provides a centralized logging system with:
- Structured JSON output for easy parsing
- Log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- Request/Response tracking
- Performance metrics
- Error context capture
"""

import logging
import json
import os
import sys
import traceback
from datetime import datetime
from functools import wraps
from flask import request, g

# ============================================================================
# Logger Configuration
# ============================================================================

class JSONFormatter(logging.Formatter):
    """Custom formatter that outputs JSON for easy parsing"""
    
    def format(self, record):
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'traceback': traceback.format_exception(*record.exc_info),
            }
        
        # Add extra fields if present
        if hasattr(record, 'extra_fields'):
            log_data.update(record.extra_fields)
        
        return json.dumps(log_data)


def setup_logger(name, level=None):
    """
    Setup a structured logger instance
    
    Args:
        name (str): Logger name (usually __name__)
        level (str): Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    
    Returns:
        logging.Logger: Configured logger instance
    """
    if level is None:
        level = os.environ.get('LOG_LEVEL', 'INFO')
    
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level))
    
    # Remove existing handlers to avoid duplicates
    logger.handlers = []
    
    # Console handler with JSON formatting
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(JSONFormatter())
    logger.addHandler(console_handler)
    
    # File handler (optional)
    log_file = os.environ.get('LOG_FILE')
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(JSONFormatter())
        logger.addHandler(file_handler)
    
    return logger


# ============================================================================
# Global Logger Instance
# ============================================================================

logger = setup_logger(__name__)


# ============================================================================
# Logging Decorators
# ============================================================================

def log_request(f):
    """
    Decorator to log incoming requests with details
    
    Logs:
    - Request method and path
    - Request size
    - Client IP
    - User agent
    - Request ID (for tracing)
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        request_id = request.headers.get('X-Request-ID', 'unknown')
        client_ip = request.remote_addr
        method = request.method
        path = request.path
        content_length = request.content_length or 0
        user_agent = request.user_agent.string if request.user_agent else "Unknown"
        
        # Store request ID in g for use in response logging
        g.request_id = request_id
        
        extra_fields = {
            'request_id': request_id,
            'method': method,
            'path': path,
            'client_ip': client_ip,
            'content_length': content_length,
            'user_agent': user_agent,
        }
        
        # Create a LogRecord with extra fields
        record = logging.LogRecord(
            name=logger.name,
            level=logging.INFO,
            pathname='',
            lineno=0,
            msg=f'{method} {path}',
            args=(),
            exc_info=None,
        )
        record.extra_fields = extra_fields
        logger.handle(record)
        
        return f(*args, **kwargs)
    
    return decorated_function


def log_response(f):
    """
    Decorator to log response details
    
    Logs:
    - Response status code
    - Response size
    - Processing time
    - Request ID
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        import time
        start_time = time.time()
        
        response = f(*args, **kwargs)
        
        elapsed_time = time.time() - start_time
        request_id = getattr(g, 'request_id', 'unknown')
        
        # Extract status code from response
        if isinstance(response, tuple):
            status_code = response[1] if len(response) > 1 else 200
        else:
            status_code = 200
        
        extra_fields = {
            'request_id': request_id,
            'status_code': status_code,
            'elapsed_time_ms': round(elapsed_time * 1000, 2),
            'method': request.method,
            'path': request.path,
        }
        
        record = logging.LogRecord(
            name=logger.name,
            level=logging.INFO,
            pathname='',
            lineno=0,
            msg=f'{request.method} {request.path} -> {status_code}',
            args=(),
            exc_info=None,
        )
        record.extra_fields = extra_fields
        logger.handle(record)
        
        return response
    
    return decorated_function


def log_error(f):
    """
    Decorator to log errors with full context
    
    Logs:
    - Error message
    - Stack trace
    - Request details
    - User context
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            request_id = getattr(g, 'request_id', 'unknown')
            
            extra_fields = {
                'request_id': request_id,
                'error_type': type(e).__name__,
                'error_message': str(e),
                'method': request.method,
                'path': request.path,
                'client_ip': request.remote_addr,
            }
            
            record = logging.LogRecord(
                name=logger.name,
                level=logging.ERROR,
                pathname='',
                lineno=0,
                msg=f'Error in {f.__name__}: {str(e)}',
                args=(),
                exc_info=sys.exc_info(),
            )
            record.extra_fields = extra_fields
            logger.handle(record)
            
            raise
    
    return decorated_function


# ============================================================================
# Logging Functions
# ============================================================================

def log_info(message, **kwargs):
    """Log an info message with optional extra fields"""
    record = logging.LogRecord(
        name=logger.name,
        level=logging.INFO,
        pathname='',
        lineno=0,
        msg=message,
        args=(),
        exc_info=None,
    )
    record.extra_fields = kwargs
    logger.handle(record)


def log_warning(message, **kwargs):
    """Log a warning message with optional extra fields"""
    record = logging.LogRecord(
        name=logger.name,
        level=logging.WARNING,
        pathname='',
        lineno=0,
        msg=message,
        args=(),
        exc_info=None,
    )
    record.extra_fields = kwargs
    logger.handle(record)


def log_error_msg(message, **kwargs):
    """Log an error message with optional extra fields"""
    record = logging.LogRecord(
        name=logger.name,
        level=logging.ERROR,
        pathname='',
        lineno=0,
        msg=message,
        args=(),
        exc_info=None,
    )
    record.extra_fields = kwargs
    logger.handle(record)


def log_debug(message, **kwargs):
    """Log a debug message with optional extra fields"""
    record = logging.LogRecord(
        name=logger.name,
        level=logging.DEBUG,
        pathname='',
        lineno=0,
        msg=message,
        args=(),
        exc_info=None,
    )
    record.extra_fields = kwargs
    logger.handle(record)


# ============================================================================
# Performance Logging
# ============================================================================

class PerformanceTimer:
    """Context manager for logging performance metrics"""
    
    def __init__(self, operation_name):
        self.operation_name = operation_name
        self.start_time = None
    
    def __enter__(self):
        self.start_time = datetime.utcnow()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        elapsed = (datetime.utcnow() - self.start_time).total_seconds()
        
        if exc_type:
            log_error_msg(
                f'Operation failed: {self.operation_name}',
                operation=self.operation_name,
                elapsed_seconds=elapsed,
                error_type=exc_type.__name__,
                error_message=str(exc_val),
            )
        else:
            log_info(
                f'Operation completed: {self.operation_name}',
                operation=self.operation_name,
                elapsed_seconds=round(elapsed, 3),
            )


# ============================================================================
# Database Query Logging
# ============================================================================

def log_database_query(query_type, table, operation, **kwargs):
    """Log database operations"""
    log_debug(
        f'Database {operation}: {table}',
        query_type=query_type,
        table=table,
        operation=operation,
        **kwargs
    )


# ============================================================================
# Authentication Logging
# ============================================================================

def log_auth_attempt(email, success, reason=None):
    """Log authentication attempts"""
    level = 'INFO' if success else 'WARNING'
    message = f'Auth attempt: {email} - {"SUCCESS" if success else "FAILED"}'
    
    extra = {
        'email': email,
        'success': success,
    }
    
    if reason:
        extra['reason'] = reason
    
    if success:
        log_info(message, **extra)
    else:
        log_warning(message, **extra)


def log_auth_error(email, error_type, error_message):
    """Log authentication errors"""
    log_error_msg(
        f'Auth error for {email}',
        email=email,
        error_type=error_type,
        error_message=error_message,
    )


# ============================================================================
# API Call Logging
# ============================================================================

def log_api_call(endpoint, method, status_code, response_time_ms, **kwargs):
    """Log API calls"""
    log_info(
        f'API call: {method} {endpoint} -> {status_code}',
        endpoint=endpoint,
        method=method,
        status_code=status_code,
        response_time_ms=response_time_ms,
        **kwargs
    )
