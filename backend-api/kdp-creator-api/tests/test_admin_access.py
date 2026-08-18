from types import SimpleNamespace

from src.models.user import issue_mfa_token, user_is_admin, verify_mfa_token


def test_admin_denied_by_default(monkeypatch):
    monkeypatch.delenv("ADMIN_EMAILS", raising=False)
    user = SimpleNamespace(email="user@example.com", app_metadata={}, user_metadata={})
    assert user_is_admin(user, {"email": "user@example.com", "role": "user"}) is False


def test_admin_email_allowlist(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAILS", "owner@kdpsuite.com, ops@kdpsuite.com")
    user = SimpleNamespace(email="owner@kdpsuite.com", app_metadata={}, user_metadata={})
    assert user_is_admin(user, {"role": "user"}) is True
    other = SimpleNamespace(email="user@example.com", app_metadata={}, user_metadata={})
    assert user_is_admin(other, {"role": "user"}) is False


def test_admin_role_on_profile(monkeypatch):
    monkeypatch.delenv("ADMIN_EMAILS", raising=False)
    user = SimpleNamespace(email="user@example.com", app_metadata={}, user_metadata={})
    assert user_is_admin(user, {"role": "admin"}) is True


def test_admin_role_on_app_metadata(monkeypatch):
    monkeypatch.delenv("ADMIN_EMAILS", raising=False)
    user = SimpleNamespace(
        email="user@example.com",
        app_metadata={"role": "admin"},
        user_metadata={},
    )
    assert user_is_admin(user, {}) is True


def test_mfa_token_roundtrip(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "test-mfa-secret")
    token = issue_mfa_token("user-123")
    assert verify_mfa_token("user-123", token) is True
    assert verify_mfa_token("other-user", token) is False
    assert verify_mfa_token("user-123", "not-a-token") is False
