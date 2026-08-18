import time

import jwt as pyjwt
import pytest

from src.models.user import issue_mfa_token, verify_mfa_token
from src.routes.auth_sync import verify_supabase_token
from src.utils.rate_limit import RateLimiter


def test_unsigned_jwt_path_removed(monkeypatch):
    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)
    token = pyjwt.encode({"sub": "user-1", "aud": "authenticated"}, "forged", algorithm="HS256")
    assert verify_supabase_token(token) is None


def test_supabase_jwt_signature_required(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "correct-secret")
    payload = {
        "sub": "user-1",
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "email": "user@example.com",
    }
    valid = pyjwt.encode(payload, "correct-secret", algorithm="HS256")
    forged = pyjwt.encode(payload, "wrong-secret", algorithm="HS256")
    assert verify_supabase_token(valid)["sub"] == "user-1"
    assert verify_supabase_token(forged) is None


def test_mfa_secret_fail_closed(monkeypatch):
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    monkeypatch.delenv("SECRET_KEY", raising=False)
    with pytest.raises(RuntimeError, match="required"):
        issue_mfa_token("user-1")
    assert verify_mfa_token("user-1", "anything") is False


def test_memory_rate_limiter_still_counts():
    limiter = RateLimiter()
    allowed, remaining, _reset = limiter.is_allowed("k", 2, 60)
    assert allowed is True
    assert remaining == 1
    allowed, remaining, _reset = limiter.is_allowed("k", 2, 60)
    assert allowed is True
    assert remaining == 0
    allowed, remaining, _reset = limiter.is_allowed("k", 2, 60)
    assert allowed is False
    assert remaining == 0
