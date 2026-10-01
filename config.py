import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'the-power-gym-secret-key-2026-production'
    
    # Database Configuration (Persistent SQLite or Cloud Postgres/MySQL via DATABASE_URL)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or f"sqlite:///{os.path.join(BASE_DIR, 'thepowergym.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Uploads & Public Directories
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
    PUBLIC_FOLDER = os.path.join(BASE_DIR, 'public')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
    
    # Gym Brand & Indian UPI Details
    GYM_NAME = "The Power Gym"
    GYM_TAGLINE = "Forge Iron. Unleash Pure Strength."
    UPI_ID = "gopinath71845@oksbi"
    UPI_NAME = "The Power Gym (Gopinath)"
    GYM_PHONE = "+91 98765 43210"
    GYM_EMAIL = "contact@thepowergym.in"
    GYM_ADDRESS = "No. 18, Fitness Boulevard, Neon Arcade, Metro City, India"
    
    # Indian Currency
    CURRENCY_SYMBOL = "₹"
    CURRENCY_CODE = "INR"

    # Staff Master Authorization Key
    # Required for Staff Registration & Staff Login
    STAFF_ACCESS_KEY = os.environ.get('STAFF_ACCESS_KEY') or 'ASDFGF123456*'
