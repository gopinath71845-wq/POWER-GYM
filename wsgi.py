"""
WSGI Entry point for The Power Gym deployment.
Used for production servers such as Waitress (Windows) or Gunicorn (Linux/Cloud).
"""
import os
from app import create_app

app = create_app()

if __name__ == "__main__":
    from waitress import serve
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting The Power Gym on http://0.0.0.0:{port} via Waitress Production Server...")
    serve(app, host="0.0.0.0", port=port)
