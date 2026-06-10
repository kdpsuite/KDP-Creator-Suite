import os
import sys
import traceback

# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins="*")

# Health check endpoint - always works
@app.route('/api/health')
def health():
    return jsonify({"status": "ok", "message": "KDP Creator Suite API is running"})

# Try to load the full app with all blueprints
try:
    from dotenv import load_dotenv
    load_dotenv()
    
    from flask_jwt_extended import JWTManager
    from src.models.user import db, bcrypt
    from src.routes.user import user_bp
    from src.routes.pdf_processing import pdf_bp
    from src.routes.subscription import subscription_bp
    from src.routes.analytics import analytics_bp
    from src.routes.totp import totp_bp
    from src.routes.batch import batch_bp
    from src.routes.auth_sync import auth_sync_bp

    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'kdp-creator-suite-secret-key-2024')
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'kdp-jwt-secret-key-2024')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 3600 * 24  # 24 hours

    # Register blueprints
    app.register_blueprint(user_bp, url_prefix='/api')
    app.register_blueprint(pdf_bp, url_prefix='/api')
    app.register_blueprint(subscription_bp, url_prefix='/api')
    app.register_blueprint(analytics_bp, url_prefix='/api')
    app.register_blueprint(totp_bp, url_prefix='/api')
    app.register_blueprint(batch_bp, url_prefix='/api')
    app.register_blueprint(auth_sync_bp, url_prefix='/api')

    # Database configuration
    database_url = os.environ.get('DATABASE_URL')
    if database_url and database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    app.config['SQLALCHEMY_DATABASE_URI'] = database_url or f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    bcrypt.init_app(app)
    jwt = JWTManager(app)
    
    with app.app_context():
        db.create_all()
    
    FULL_APP_LOADED = True
    LOAD_ERROR = None
except Exception as e:
    FULL_APP_LOADED = False
    LOAD_ERROR = traceback.format_exc()

@app.route('/api/status')
def status():
    return jsonify({
        "full_app_loaded": FULL_APP_LOADED,
        "error": LOAD_ERROR,
        "python_version": sys.version,
        "cwd": os.getcwd(),
        "sys_path": sys.path[:5]
    })

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if not FULL_APP_LOADED:
        return jsonify({"error": "App not fully loaded", "details": LOAD_ERROR}), 503
    return jsonify({"message": "KDP Creator Suite API", "version": "1.0.0"})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
