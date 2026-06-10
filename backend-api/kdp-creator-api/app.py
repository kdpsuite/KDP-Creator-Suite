import os
import sys

# Ensure the project root is in the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.main import app

# Vercel looks for 'app' variable as the WSGI application
if __name__ == "__main__":
    app.run()
