import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.main import app


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as test_client:
        yield test_client


def assert_success_envelope(payload, expected_status=200):
    assert payload['ok'] is True
    assert payload['status'] == expected_status
    assert 'timestamp' in payload
    assert 'message' in payload or 'data' in payload


def assert_error_envelope(payload, expected_status):
    assert payload['ok'] is False
    assert payload['status'] == expected_status
    assert 'message' in payload
    assert 'error' in payload
    assert 'code' in payload['error'] or 'message' in payload['error']


def test_health_response_format(client):
    response = client.get('/api/health')
    payload = response.get_json()

    assert response.status_code == 200
    assert_success_envelope(payload)
    assert payload['data']['status'] == 'ok'


def test_health_live_response_format(client):
    response = client.get('/api/health/live')
    payload = response.get_json()

    assert response.status_code == 200
    assert_success_envelope(payload)
    assert payload['data']['alive'] is True


def test_health_ready_response_format(client):
    response = client.get('/api/health/ready')
    payload = response.get_json()

    assert payload['ok'] in (True, False)
    assert 'status' in payload
    if payload['ok']:
        assert response.status_code == 200
        assert 'timestamp' in payload
        assert payload['data']['ready'] is True
    else:
        assert response.status_code == 503
        assert_error_envelope(payload, 503)


def test_sync_session_missing_token(client):
    response = client.post('/api/sync-session', json={})
    payload = response.get_json()

    assert response.status_code == 400
    assert_error_envelope(payload, 400)
    assert payload['error']['code'] == 'VALIDATION_ERROR'


def test_validate_session_missing_auth(client):
    response = client.get('/api/validate-session')
    payload = response.get_json()

    assert response.status_code == 401
    assert_error_envelope(payload, 401)
    assert payload['error']['code'] == 'AUTH_MISSING'


def test_deprecated_login_response_format(client):
    response = client.post('/api/login', json={})
    payload = response.get_json()

    assert response.status_code == 400
    assert_error_envelope(payload, 400)
    assert payload['error']['code'] == 'DEPRECATED_ENDPOINT'


def test_subscription_tiers_response_format(client):
    response = client.get('/api/tiers')
    payload = response.get_json()

    assert response.status_code == 200
    assert_success_envelope(payload)
    assert 'tiers' in payload['data']
