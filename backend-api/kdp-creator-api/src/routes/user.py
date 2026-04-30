from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from src.models.user import User, Session, db
from datetime import datetime, timedelta
import secrets

user_bp = Blueprint('user', __name__)

@user_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password') or not data.get('email'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    user = User(username=data['username'], email=data['email'])
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'User registered successfully', 'user': user.to_dict()}), 201

@user_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400
    
    user = User.query.filter_by(username=data['username']).first()
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid username or password'}), 401
    
    access_token = create_access_token(identity=str(user.id))
    
    # Store session in database
    expires_at = datetime.utcnow() + timedelta(hours=24)
    new_session = Session(user_id=user.id, token=access_token, expires_at=expires_at)
    db.session.add(new_session)
    db.session.commit()

    return jsonify({
        'access_token': access_token,
        'user': user.to_dict()
    }), 200

@user_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    token = request.headers.get('Authorization').split(" ")[1]
    
    # Verify session is active in database
    session = Session.query.filter_by(token=token, is_active=True).first()
    if not session or session.expires_at < datetime.utcnow():
        return jsonify({'error': 'Session expired or inactive'}), 401
    
    # Update last activity
    session.last_activity = datetime.utcnow()
    db.session.commit()

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict())

@user_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    token = request.headers.get('Authorization').split(" ")[1]
    session = Session.query.filter_by(token=token).first()
    if session:
        session.is_active = False
        db.session.commit()
    return jsonify({'message': 'Logged out successfully'}), 200

@user_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    # Admin only check could be added here
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@user_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    current_user_id = get_jwt_identity()
    if str(user_id) != current_user_id:
        return jsonify({'error': 'Unauthorized to update this user'}), 403
        
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    user.username = data.get('username', user.username)
    user.email = data.get('email', user.email)
    db.session.commit()
    return jsonify(user.to_dict())

@user_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_user_id = get_jwt_identity()
    if str(user_id) != current_user_id:
        return jsonify({'error': 'Unauthorized to delete this user'}), 403

    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return '', 204

@user_bp.route('/request-password-reset', methods=['POST'])
def request_password_reset():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
        
    user = User.query.filter_by(email=email).first()
    
    # For security, we return the same message even if the user doesn't exist
    # to prevent email enumeration.
    if user:
        # Generate a random token
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.session.commit()
        
        # In a real application, you would send an email here.
        # For now, we'll just log it or return it in development.
        print(f"Password reset token for {email}: {token}")
        
    return jsonify({'message': 'If an account exists with that email, a reset link has been sent.'}), 200

@user_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('new_password')
    
    if not token or not new_password:
        return jsonify({'error': 'Token and new password are required'}), 400
        
    user = User.query.filter_by(reset_token=token).first()
    
    if not user or user.reset_token_expires < datetime.utcnow():
        return jsonify({'error': 'Invalid or expired reset token'}), 400
        
    user.set_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.session.commit()
    
    return jsonify({'message': 'Password has been reset successfully'}), 200
