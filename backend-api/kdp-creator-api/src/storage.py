import os
import uuid
from datetime import datetime

# Server-generated files are a trusted backend write, so storage always uses the
# service role. The anon key cannot satisfy the bucket's RLS policies, which key
# INSERT/SELECT on auth.uid(), and a user JWT is not attached to storage requests
# by postgrest.auth(). No anon fallback: it can only ever 403.
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")

supabase = None
try:
    from supabase import create_client

    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    else:
        print(
            "Warning: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY environment "
            "variables not set. File uploads will be disabled."
        )
except Exception as e:
    print(f"Warning: Failed to initialize Supabase client: {str(e)}")
    supabase = None

BUCKET_NAME = "kdp-created-files"
SIGNED_URL_EXPIRY = 3600  # 1 hour in seconds


class StorageError(Exception):
    """Supabase Storage failure: missing configuration, denied write, or transport."""


def _storage_client():
    return supabase


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
    client = _storage_client()
    if client is None:
        raise StorageError(
            "Supabase Storage is not configured. Please set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY environment variables."
        )

    try:
        # Create a unique path: user_id/file_type/timestamp_uuid_filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        file_path = f"{user_id}/{file_type}/{timestamp}_{unique_id}_{filename}"

        # Upload to Supabase Storage (must use "content-type" — wrong key defaults to text/plain)
        client.storage.from_(BUCKET_NAME).upload(
            file_path,
            file_bytes,
            {
                "content-type": get_content_type(filename),
                "upsert": "false",
            },
        )

        # Generate signed URL (valid for 1 hour)
        signed_url = client.storage.from_(BUCKET_NAME).create_signed_url(file_path, SIGNED_URL_EXPIRY)

        return {
            "path": file_path,
            "url": f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{file_path}",
            "signed_url": ((signed_url.get("signedURL") or signed_url.get("signedUrl")) if signed_url else None),
            "file_size_bytes": len(file_bytes),
        }
    except Exception as e:
        raise StorageError(f"Failed to upload file to Supabase: {str(e)}") from e


def delete_file(file_path: str) -> bool:
    """
    Delete a file from Supabase Storage.

    Args:
        file_path: The full path of the file to delete

    Returns:
        True if successful, False otherwise
    """
    client = _storage_client()
    if client is None:
        return False

    try:
        client.storage.from_(BUCKET_NAME).remove([file_path])
        return True
    except Exception as e:
        print(f"Failed to delete file {file_path}: {str(e)}")
        return False


def get_content_type(filename: str) -> str:
    """Get content type based on file extension"""
    ext = filename.lower().split(".")[-1] if "." in filename else ""
    content_types = {
        "pdf": "application/pdf",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "webp": "image/webp",
    }
    return content_types.get(ext, "application/octet-stream")
