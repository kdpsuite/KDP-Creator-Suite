from flask import jsonify
from datetime import datetime

def success_response(data=None, message=None, status_code=200):
    """Return a standardized success response"""
    response = {
        'ok': True,
        'status': status_code,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
    }
    if data is not None:
        response['data'] = data
    if message:
        response['message'] = message
    return jsonify(response), status_code


def error_response(message, error_code=None, details=None, status_code=400):
    """Return a standardized error response"""
    response = {
        'ok': False,
        'status': status_code,
        'message': message,
        'error': {
            'message': message,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
        },
    }
    if error_code:
        response['error']['code'] = error_code
    if details:
        response['error']['details'] = details
    return jsonify(response), status_code
