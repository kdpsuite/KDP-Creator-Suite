from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime

db = SQLAlchemy()
bcrypt = Bcrypt()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    
    # Subscription & Usage Fields
    subscription_tier = db.Column(db.String(20), default='free') # free, pro, studio
    conversions_this_month = db.Column(db.Integer, default=0)
    batch_operations_this_month = db.Column(db.Integer, default=0)
    last_usage_reset = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Password Reset Fields
    reset_token = db.Column(db.String(100), unique=True, nullable=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to sessions
    sessions = db.relationship('Session', backref='user', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'subscription_tier': self.subscription_tier,
            'usage': {
                'conversions': self.conversions_this_month,
                'batch_operations': self.batch_operations_this_month,
                'last_reset': self.last_usage_reset.isoformat() if self.last_usage_reset else None
            },
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Session(db.Model):
    __tablename__ = 'sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.String(500), unique=True, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'is_active': self.is_active,
            'last_activity': self.last_activity.isoformat(),
            'expires_at': self.expires_at.isoformat()
        }
