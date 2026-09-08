from datetime import datetime, timedelta

from src.routes import subscription


def _stub_update(monkeypatch):
    """Capture the profile update instead of writing to Supabase."""
    calls = []

    def fake_update(user_id, fields):
        calls.append((user_id, fields))
        return True

    monkeypatch.setattr(subscription, "_update_profile", fake_update)
    return calls


def test_counters_reset_when_marker_is_from_a_previous_month(monkeypatch):
    calls = _stub_update(monkeypatch)
    stale = (subscription._current_period_start() - timedelta(days=1)).isoformat()
    profile = {
        "id": "user-1",
        "conversions_this_month": 5,
        "batch_operations_this_month": 3,
        "last_usage_reset": stale,
    }

    updated = subscription.apply_usage_window(profile)

    assert updated["conversions_this_month"] == 0
    assert updated["batch_operations_this_month"] == 0
    assert len(calls) == 1
    assert calls[0][0] == "user-1"


def test_counters_survive_within_the_current_month(monkeypatch):
    calls = _stub_update(monkeypatch)
    profile = {
        "id": "user-1",
        "conversions_this_month": 4,
        "batch_operations_this_month": 1,
        "last_usage_reset": datetime.utcnow().isoformat(),
    }

    updated = subscription.apply_usage_window(profile)

    assert updated["conversions_this_month"] == 4
    assert updated["batch_operations_this_month"] == 1
    assert calls == []


def test_missing_marker_is_treated_as_stale(monkeypatch):
    calls = _stub_update(monkeypatch)
    profile = {"id": "user-1", "conversions_this_month": 9, "last_usage_reset": None}

    updated = subscription.apply_usage_window(profile)

    assert updated["conversions_this_month"] == 0
    assert len(calls) == 1


def test_failed_write_keeps_stored_counters(monkeypatch):
    monkeypatch.setattr(subscription, "_update_profile", lambda user_id, fields: False)
    stale = (subscription._current_period_start() - timedelta(days=1)).isoformat()
    profile = {"id": "user-1", "conversions_this_month": 5, "last_usage_reset": stale}

    updated = subscription.apply_usage_window(profile)

    assert updated["conversions_this_month"] == 5


def test_timestamp_parsing_handles_supabase_formats():
    assert subscription._parse_timestamp("2026-08-10T12:00:00Z") == datetime(2026, 8, 10, 12, 0, 0)
    assert subscription._parse_timestamp("2026-08-10T14:00:00+02:00") == datetime(2026, 8, 10, 12, 0, 0)
    assert subscription._parse_timestamp("2026-08-10T12:00:00") == datetime(2026, 8, 10, 12, 0, 0)
    assert subscription._parse_timestamp("not-a-date") is None
    assert subscription._parse_timestamp(None) is None
