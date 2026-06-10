import os
import sys

# Ensure the project root is in the Python path so 'src' can be imported
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.main import app

# This is the entry point for Vercel serverless functions
# The 'app' variable is what Vercel looks for (WSGI application)
if __name__ == "__main__":
    app.run()
