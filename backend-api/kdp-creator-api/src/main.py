import os
import sys

# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv

load_dotenv()

_ENVIRONMENT = os.environ.get("ENVIRONMENT", "development").strip().lower()
_IS_PRODUCTION = _ENVIRONMENT == "production"

_sentry_dsn = os.environ.get("SENTRY_DSN")
if _sentry_dsn:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.flask import FlaskIntegration

        _sentry_kwargs = {
            "dsn": _sentry_dsn,
            "integrations": [FlaskIntegration(transaction_style="url")],
            "traces_sample_rate": float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
            "environment": os.environ.get("ENVIRONMENT", "development"),
            "send_default_pii": False,
            "enable_logs": True,
        }
        try:
            sentry_sdk.init(**_sentry_kwargs)
        except TypeError:
            _sentry_kwargs.pop("enable_logs", None)
            sentry_sdk.init(**_sentry_kwargs)
        print("[STARTUP] Sentry enabled")
    except Exception as sentry_error:
        print(f"[WARNING] Sentry init failed: {sentry_error}")

# ============================================================================
# Environment Variable Validation
# ============================================================================
REQUIRED_ENV_VARS = [
    "SUPABASE_URL",
    "JWT_SECRET_KEY",
]

missing_vars = [var for var in REQUIRED_ENV_VARS if not os.environ.get(var)]
if missing_vars:
    msg = f"Missing required environment variables: {', '.join(missing_vars)}"
    if _IS_PRODUCTION:
        raise RuntimeError(msg)
    print(f"[WARNING] {msg}")
    print("[WARNING] Please check your Vercel environment settings.")

# Log startup information
print(f"[STARTUP] Environment: {os.environ.get('ENVIRONMENT', 'development')}")
print(f"[STARTUP] Debug mode: {os.environ.get('DEBUG', 'False')}")
print(f"[STARTUP] Supabase URL: {os.environ.get('SUPABASE_URL', 'NOT SET')}")

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from sqlalchemy import text

from src.models.user import bcrypt, db, supabase
from src.routes.analytics import analytics_bp
from src.routes.auth_sync import auth_sync_bp
from src.routes.batch import batch_bp
from src.routes.subscription import subscription_bp
from src.routes.support import support_bp
from src.routes.templates import templates_bp
from src.routes.totp import totp_bp
from src.routes.user import user_bp
from src.utils.responses import error_response, success_response

_DEFAULT_PROD_ORIGINS = (
    "https://dashboard.kdpsuite.com,"
    "https://www.dashboard.kdpsuite.com,"
    "https://kdpsuite.com,"
    "https://www.kdpsuite.com"
)
_DEFAULT_DEV_ORIGINS = (
    "http://localhost:3000," "http://localhost:5173," "http://127.0.0.1:3000," "http://127.0.0.1:5173"
)


def _parse_cors_origins():
    raw = os.environ.get("CORS_ORIGINS", "").strip()
    if not raw:
        raw = _DEFAULT_PROD_ORIGINS if _IS_PRODUCTION else _DEFAULT_DEV_ORIGINS
    # flask-cors forbids origins='*' with supports_credentials=True
    if raw == "*":
        if _IS_PRODUCTION:
            raise RuntimeError("CORS_ORIGINS=* is not allowed when ENVIRONMENT=production")
        raw = _DEFAULT_DEV_ORIGINS
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    if not origins:
        raise RuntimeError("CORS_ORIGINS resolved empty; set comma-separated frontend origins")
    return origins


_CORS_ORIGINS = _parse_cors_origins()

app = Flask(__name__)

_secret_key = os.environ.get("SECRET_KEY")
_jwt_secret = os.environ.get("JWT_SECRET_KEY")
if _IS_PRODUCTION:
    if not _secret_key:
        raise RuntimeError("SECRET_KEY is required when ENVIRONMENT=production")
    if not _jwt_secret:
        raise RuntimeError("JWT_SECRET_KEY is required when ENVIRONMENT=production")
else:
    _secret_key = _secret_key or "kdp-creator-suite-dev-secret"
    _jwt_secret = _jwt_secret or "kdp-jwt-dev-secret"

app.config["SECRET_KEY"] = _secret_key
app.config["JWT_SECRET_KEY"] = _jwt_secret
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 3600 * 24  # 24 hours

CORS(
    app,
    resources={r"/api/*": {"origins": _CORS_ORIGINS}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "PUT", "POST", "PATCH", "DELETE", "OPTIONS"],
)
print(f"[STARTUP] CORS origins: {_CORS_ORIGINS}")


@app.after_request
def security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response


# Register blueprints
app.register_blueprint(user_bp, url_prefix="/api")
try:
    from src.routes.pdf_processing import pdf_bp

    app.register_blueprint(pdf_bp, url_prefix="/api")
except ImportError as pdf_import_error:
    print(f"[WARNING] PDF processing routes disabled: {pdf_import_error}")
app.register_blueprint(subscription_bp, url_prefix="/api")
app.register_blueprint(analytics_bp, url_prefix="/api")
app.register_blueprint(totp_bp, url_prefix="/api")
app.register_blueprint(batch_bp, url_prefix="/api")
app.register_blueprint(auth_sync_bp, url_prefix="/api")
app.register_blueprint(templates_bp, url_prefix="/api")
app.register_blueprint(support_bp, url_prefix="/api")

# Database configuration
database_url = os.environ.get("DATABASE_URL")
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

if not database_url:
    sqlite_dir = os.environ.get("VERCEL") and "/tmp" or os.path.join(os.path.dirname(__file__), "database")
    os.makedirs(sqlite_dir, exist_ok=True)
    database_url = f"sqlite:///{os.path.join(sqlite_dir, 'app.db')}"

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)
bcrypt.init_app(app)
jwt = JWTManager(app)

with app.app_context():
    try:
        db.create_all()
    except Exception as db_error:
        print(f"[WARNING] Database initialization skipped: {db_error}")


@app.route("/api/health")
def health():
    return success_response(
        data={
            "status": "ok",
            "sentry_configured": bool(os.environ.get("SENTRY_DSN")),
        },
        message="KDP Creator Suite API is running",
        status_code=200,
    )


@app.route("/api/debug-sentry")
def debug_sentry():
    """Captures a test event then 500s. Enabled only when ALLOW_SENTRY_DEBUG=1."""
    if os.environ.get("ALLOW_SENTRY_DEBUG") != "1":
        return error_response("Not found", "NOT_FOUND", status_code=404)
    try:
        import sentry_sdk

        sentry_sdk.capture_message("kdp-sentry-verify-backend", level="error")
        sentry_sdk.flush(timeout=2.0)
    except Exception as sentry_probe_error:
        print(f"[WARNING] Sentry probe flush failed: {sentry_probe_error}")
    raise RuntimeError("kdp-sentry-verify-backend")


@app.route("/api/health/live")
def health_live():
    return success_response(
        data={"alive": True},
        message="Service is alive",
        status_code=200,
    )


@app.route("/api/health/ready")
def health_ready():
    checks = {
        "database": False,
        "supabase": supabase is not None,
    }

    try:
        db.session.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception as db_error:
        print(f"[HEALTH] Database check failed: {db_error}")

    ready = checks["database"] and checks["supabase"]
    if ready:
        return success_response(
            data={"ready": True, "checks": checks},
            message="Service is ready",
            status_code=200,
        )

    return error_response(
        "Service not ready",
        "SERVICE_UNAVAILABLE",
        details=checks,
        status_code=503,
    )


@app.route("/")
def root():
    return success_response(data={"version": "1.0.0"}, message="KDP Creator Suite API", status_code=200)


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=os.environ.get("DEBUG", "False").lower() in ("1", "true", "yes"),
    )
