import os
import sys

# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

# ============================================================================
# Environment Variable Validation
# ============================================================================
# Check for required environment variables at startup
REQUIRED_ENV_VARS = [
    'SUPABASE_URL',
    'JWT_SECRET_KEY',
]

missing_vars = [var for var in REQUIRED_ENV_VARS if not os.environ.get(var)]
if missing_vars:
    print(f"[WARNING] Missing required environment variables: {', '.join(missing_vars)}")
    print(f"[WARNING] Please check your Vercel environment settings.")

# Log startup information
print(f"[STARTUP] Environment: {os.environ.get('ENVIRONMENT', 'development')}")
print(f"[STARTUP] Debug mode: {os.environ.get('DEBUG', 'False')}")
print(f"[STARTUP] Supabase URL: {os.environ.get('SUPABASE_URL', 'NOT SET')}")

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from src.models.user import db, bcrypt
from src.routes.user import user_bp
from src.routes.subscription import subscription_bp
from src.routes.analytics import analytics_bp
from src.routes.totp import totp_bp
from src.routes.batch import batch_bp
from src.routes.auth_sync import auth_sync_bp
from src.utils.responses import success_response

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'kdp-creator-suite-secret-key-2024')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'kdp-jwt-secret-key-2024')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 3600 * 24  # 24 hours

# Enable CORS for all routes
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Register blueprints
app.register_blueprint(user_bp, url_prefix='/api')
try:
    from src.routes.pdf_processing import pdf_bp
    app.register_blueprint(pdf_bp, url_prefix='/api')
except ImportError as pdf_import_error:
    print(f"[WARNING] PDF processing routes disabled: {pdf_import_error}")
app.register_blueprint(subscription_bp, url_prefix='/api')
app.register_blueprint(analytics_bp, url_prefix='/api')
app.register_blueprint(totp_bp, url_prefix='/api')
app.register_blueprint(batch_bp, url_prefix='/api')
app.register_blueprint(auth_sync_bp, url_prefix='/api')

# Database configuration
database_url = os.environ.get('DATABASE_URL')
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

if not database_url:
    sqlite_dir = os.environ.get('VERCEL') and '/tmp' or os.path.join(os.path.dirname(__file__), 'database')
    os.makedirs(sqlite_dir, exist_ok=True)
    database_url = f"sqlite:///{os.path.join(sqlite_dir, 'app.db')}"

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
bcrypt.init_app(app)
jwt = JWTManager(app)

with app.app_context():
    try:
        db.create_all()
    except Exception as db_error:
        print(f"[WARNING] Database initialization skipped: {db_error}")


@app.route('/api/health')
def health():
    return success_response(
        data={'status': 'ok'},
        message='KDP Creator Suite API is running',
        status_code=200
    )


@app.route('/')
def root():
    return success_response(
        data={'version': '1.0.0'},
        message='KDP Creator Suite API',
        status_code=200
    )


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
