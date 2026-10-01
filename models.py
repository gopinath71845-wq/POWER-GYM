from datetime import datetime, date
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20), nullable=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='customer')  # 'customer' or 'staff'
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    profile = db.relationship('MemberProfile', backref='user', uselist=False, cascade='all, delete-orphan')
    memberships = db.relationship('Membership', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    payments = db.relationship('Payment', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
        
    def is_staff(self):
        return self.role == 'staff'
        
    def get_active_membership(self):
        return self.memberships.filter_by(status='active').order_by(Membership.id.desc()).first()


class MemberProfile(db.Model):
    __tablename__ = 'member_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    full_name = db.Column(db.String(120), nullable=False)
    avatar = db.Column(db.String(255), default='default_avatar.png')
    age = db.Column(db.Integer, nullable=True)
    gender = db.Column(db.String(20), nullable=True)
    height_cm = db.Column(db.Float, nullable=True)
    weight_kg = db.Column(db.Float, nullable=True)
    fitness_goal = db.Column(db.String(120), default='Muscle Building & Fitness')
    blood_group = db.Column(db.String(10), nullable=True)
    emergency_contact = db.Column(db.String(50), nullable=True)
    address = db.Column(db.Text, nullable=True)
    joined_date = db.Column(db.Date, default=date.today)
    
    def calculate_bmi(self):
        if self.height_cm and self.weight_kg and self.height_cm > 0:
            height_m = self.height_cm / 100.0
            return round(self.weight_kg / (height_m * height_m), 1)
        return None


class Trainer(db.Model):
    __tablename__ = 'trainers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    specialty = db.Column(db.String(150), nullable=False)
    experience_years = db.Column(db.Integer, default=3)
    bio = db.Column(db.Text, nullable=True)
    photo = db.Column(db.String(255), default='trainer_alex.jpg')
    rating = db.Column(db.Float, default=4.9)
    phone = db.Column(db.String(20), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    fee_per_month = db.Column(db.Float, default=1500.0)
    is_available = db.Column(db.Boolean, default=True)
    
    memberships = db.relationship('Membership', backref='trainer', lazy='dynamic')


class Plan(db.Model):
    __tablename__ = 'plans'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    duration_months = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)  # in INR ₹
    features_list = db.Column(db.Text, nullable=False)  # pipe '|' or newline separated
    is_popular = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    
    memberships = db.relationship('Membership', backref='plan', lazy='dynamic')
    
    def get_features(self):
        if not self.features_list:
            return []
        return [f.strip() for f in self.features_list.split('\n') if f.strip()]


class Membership(db.Model):
    __tablename__ = 'memberships'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('plans.id'), nullable=False)
    trainer_id = db.Column(db.Integer, db.ForeignKey('trainers.id'), nullable=True)
    start_date = db.Column(db.Date, default=date.today)
    end_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default='active')  # 'active', 'expired', 'pending_approval'


class Payment(db.Model):
    __tablename__ = 'payments'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    membership_id = db.Column(db.Integer, db.ForeignKey('memberships.id', ondelete='SET NULL'), nullable=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('plans.id', ondelete='SET NULL'), nullable=True)
    amount = db.Column(db.Float, nullable=False)
    payment_method = db.Column(db.String(50), default='UPI_QR')
    upi_id = db.Column(db.String(100), default='gopinath71845@oksbi')
    utr_number = db.Column(db.String(100), nullable=True)  # Bank UTR / Transaction ID
    receipt_image = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), default='Pending')  # 'Pending', 'Approved', 'Rejected'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    approved_at = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    
    plan = db.relationship('Plan', backref='payments')


class ContactMessage(db.Model):
    __tablename__ = 'contact_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
