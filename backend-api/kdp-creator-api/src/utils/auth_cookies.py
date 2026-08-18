"""HttpOnly refresh-token cookies. JS must not read these values."""

import os

from flask import make_response, request

REFRESH_COOKIE = "kdp_refresh"
REFRESH_MAX_AGE = 60 * 60 * 24 * 30


def _cookie_secure():
    proto = (request.headers.get("X-Forwarded-Proto") or "").split(",")[0].strip().lower()
    if request.is_secure or proto == "https":
        return True
    env = (os.environ.get("ENVIRONMENT") or "").strip().lower()
    return env in ("production", "prod", "staging")


def _cookie_domain():
    host = (request.host or "").split(":")[0].lower()
    if host == "kdpsuite.com" or host.endswith(".kdpsuite.com"):
        return ".kdpsuite.com"
    return None


def _cookie_kwargs():
    secure = _cookie_secure()
    kwargs = {
        "httponly": True,
        "secure": secure,
        "samesite": "None" if secure else "Lax",
        "path": "/",
        "max_age": REFRESH_MAX_AGE,
    }
    domain = _cookie_domain()
    if domain:
        kwargs["domain"] = domain
    return kwargs


def set_refresh_cookie(response, refresh_token):
    if not refresh_token:
        return response
    response.set_cookie(REFRESH_COOKIE, refresh_token, **_cookie_kwargs())
    return response


def clear_refresh_cookie(response):
    kwargs = _cookie_kwargs()
    kwargs["max_age"] = 0
    response.set_cookie(REFRESH_COOKIE, "", **kwargs)
    return response


def read_refresh_cookie():
    return request.cookies.get(REFRESH_COOKIE)


def with_refresh_cookie(payload_tuple, refresh_token):
    body, status = payload_tuple[0], payload_tuple[1]
    response = make_response(body, status)
    if refresh_token:
        set_refresh_cookie(response, refresh_token)
    else:
        clear_refresh_cookie(response)
    return response


def with_cleared_refresh_cookie(payload_tuple):
    body, status = payload_tuple[0], payload_tuple[1]
    response = make_response(body, status)
    clear_refresh_cookie(response)
    return response
