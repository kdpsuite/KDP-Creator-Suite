import importlib

import pytest

from src import storage


class FakeBucket:
    def __init__(self, upload_error=None):
        self.upload_error = upload_error
        self.uploads = []
        self.signed_urls = []

    def upload(self, path, file_bytes, file_options):
        if self.upload_error:
            raise self.upload_error
        self.uploads.append((path, file_bytes, file_options))

    def create_signed_url(self, path, expiry):
        self.signed_urls.append((path, expiry))
        return {"signedURL": f"https://signed.example/{path}"}


class FakeClient:
    def __init__(self, upload_error=None):
        self.bucket = FakeBucket(upload_error=upload_error)
        self.requested_buckets = []
        self.storage = self

    def from_(self, bucket_name):
        self.requested_buckets.append(bucket_name)
        return self.bucket


def test_storage_client_is_the_service_role_client(monkeypatch):
    sentinel = object()
    monkeypatch.setattr(storage, "supabase", sentinel)

    assert storage._storage_client() is sentinel


def test_upload_uses_service_role_client_and_user_folder_prefix(monkeypatch):
    client = FakeClient()
    monkeypatch.setattr(storage, "supabase", client)

    result = storage.upload_file(b"%PDF-1.7", "user-123", "coloring_abc.pdf", "coloring_page")

    assert client.requested_buckets == [storage.BUCKET_NAME] * 2
    path, file_bytes, file_options = client.bucket.uploads[0]
    # Storage RLS keys the first path segment on auth.uid()
    assert path.startswith("user-123/coloring_page/")
    assert path.endswith("_coloring_abc.pdf")
    assert file_bytes == b"%PDF-1.7"
    assert file_options["content-type"] == "application/pdf"
    assert result["path"] == path
    assert result["signed_url"] == f"https://signed.example/{path}"
    assert result["file_size_bytes"] == len(b"%PDF-1.7")
    assert client.bucket.signed_urls == [(path, storage.SIGNED_URL_EXPIRY)]


def test_upload_without_service_role_client_raises_storage_error(monkeypatch):
    monkeypatch.setattr(storage, "supabase", None)

    with pytest.raises(storage.StorageError, match="SUPABASE_SERVICE_ROLE_KEY"):
        storage.upload_file(b"data", "user-123", "file.pdf", "coloring_page")


def test_upload_wraps_client_failure_in_storage_error(monkeypatch):
    denied = Exception("{'statusCode': 403, 'message': new row violates row-level security policy}")
    monkeypatch.setattr(storage, "supabase", FakeClient(upload_error=denied))

    with pytest.raises(storage.StorageError, match="row-level security"):
        storage.upload_file(b"data", "user-123", "file.pdf", "coloring_page")


def test_service_role_key_has_no_anon_fallback(monkeypatch):
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_KEY", raising=False)
    monkeypatch.setenv("SUPABASE_ANON_KEY", "anon-key-cannot-pass-storage-rls")
    try:
        reloaded = importlib.reload(storage)
        assert reloaded.SUPABASE_SERVICE_KEY is None
        assert reloaded.supabase is None
    finally:
        monkeypatch.undo()
        importlib.reload(storage)


def test_delete_without_service_role_client_is_a_noop(monkeypatch):
    monkeypatch.setattr(storage, "supabase", None)

    assert storage.delete_file("user-123/coloring_page/file.pdf") is False
