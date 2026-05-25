import os
import sys

# Add the backend source directory to the Python path
# This allows us to import from src.main
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend-api', 'kdp-creator-api'))

from src.main import app

# Vercel expects the Flask instance to be named 'app'
# which it already is in src.main
