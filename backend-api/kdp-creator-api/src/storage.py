import os
import io
import uuid
from datetime import datetime, timedelta
from supabase import create_client, Client

# Initialize Supabase client
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

BUCKET_NAME = 'kdp-created-files'
SIGNED_URL_EXPIRY = 3600  # 1 hour in seconds


def upload_file(file_bytes: bytes, user_id: str, filename: str, file_type: str) -> dict:
    """
    Upload a file to Supabase Storage.
    
    Args:
        file_bytes: The file content as bytes
        user_id: The user ID (for organizing files)
        filename: The filename to save as
        file_type: Type of file (e.g., 'coloring_page', 'kdp_formatted_pdf')
    
    Returns:
        dict with 'path', 'url', and 'signed_url' keys
    """
    try:
        # Create a unique path: user_id/file_type/timestamp_uuid_filename
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        file_path = f"{user_id}/{file_type}/{timestamp}_{unique_id}_{filename}"
        
        # Upload to Supabase Storage
        response = supabase.storage.from_(BUCKET_NAME).upload(
            file_path,
            file_bytes,
            {
                "contentType": get_content_type(filename),
                "upsert": False
            }
        )
        
        # Generate signed URL (valid for 1 hour)
        signed_url = supabase.storage.from_(BUCKET_NAME).create_signed_url(
            file_path,
            SIGNED_URL_EXPIRY
        )
        
        return {
            'path': file_path,
            'url': f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{file_path}",
            'signed_url': signed_url.get('signedURL') if signed_url else None,
            'file_size_bytes': len(file_bytes)
        }
    except Exception as e:
        raise Exception(f"Failed to upload file to Supabase: {str(e)}")


def delete_file(file_path: str) -> bool:
    """
    Delete a file from Supabase Storage.
    
    Args:
        file_path: The full path of the file to delete
    
    Returns:
        True if successful, False otherwise
    """
    try:
        supabase.storage.from_(BUCKET_NAME).remove([file_path])
        return True
    except Exception as e:
        print(f"Failed to delete file from Supabase: {str(e)}")
        return False


def get_content_type(filename: str) -> str:
    """Determine content type based on file extension."""
    ext = filename.lower().split('.')[-1]
    content_types = {
        'pdf': 'application/pdf',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp',
        'gif': 'image/gif'
    }
    return content_types.get(ext, 'application/octet-stream')
