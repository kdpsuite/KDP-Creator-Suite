import json

from src.routes import subscription


def _paid_session(**overrides):
    session = {
        "id": "cs_test_123",
        "payment_status": "paid",
        "customer": "cus_123",
        "customer_details": {"email": "Buyer@Example.com"},
        "amount_total": 24900,
        "currency": "usd",
        "metadata": {},
    }
    session.update(overrides)
    return session


def test_plan_resolves_from_payment_link_metadata():
    session = _paid_session(metadata={"plan": "professional_founding"})
    assert subscription._lifetime_plan_for_session(session) == ("professional_founding", "studio")


def test_plan_resolves_from_price_map(monkeypatch):
    monkeypatch.setenv("STRIPE_LIFETIME_PRICE_MAP", json.dumps({"price_abc": "starter_founding"}))
    monkeypatch.setattr(subscription, "_session_price_ids", lambda session: ["price_abc"])
    assert subscription._lifetime_plan_for_session(_paid_session()) == ("starter_founding", "pro")


def test_unmapped_purchase_resolves_to_nothing(monkeypatch):
    monkeypatch.delenv("STRIPE_LIFETIME_PRICE_MAP", raising=False)
    monkeypatch.setattr(subscription, "_session_price_ids", lambda session: ["price_unknown"])
    assert subscription._lifetime_plan_for_session(_paid_session()) == (None, None)


def test_never_grants_above_studio():
    assert set(subscription.LIFETIME_PLANS.values()) <= {"pro", "studio"}


def test_existing_account_is_granted_directly(monkeypatch):
    grants = []
    parked = []
    monkeypatch.setattr(subscription, "_profile_by_email", lambda email: {"id": "user-9", "email": email})
    monkeypatch.setattr(
        subscription, "_grant_lifetime", lambda *args, **kwargs: grants.append(args) or True
    )
    monkeypatch.setattr(subscription, "_store_pending_entitlement", lambda *a, **k: parked.append(a) or True)

    subscription._handle_lifetime_checkout(
        _paid_session(metadata={"plan": "starter_founding"}), None, "cus_123"
    )

    assert grants == [("user-9", "starter_founding", "pro", "cus_123")]
    assert parked == []


def test_purchase_without_account_is_parked_by_email(monkeypatch):
    parked = []
    monkeypatch.setattr(subscription, "_profile_by_email", lambda email: None)
    monkeypatch.setattr(subscription, "_grant_lifetime", lambda *a, **k: _should_not_run())
    monkeypatch.setattr(
        subscription,
        "_store_pending_entitlement",
        lambda session, email, plan_id, tier, customer=None: parked.append((email, plan_id, tier)) or True,
    )

    subscription._handle_lifetime_checkout(
        _paid_session(metadata={"plan": "founders_circle"}), None, "cus_123"
    )

    assert parked == [("buyer@example.com", "founders_circle", "studio")]


def test_unpaid_session_grants_nothing(monkeypatch):
    monkeypatch.setattr(subscription, "_grant_lifetime", lambda *a, **k: _should_not_run())
    monkeypatch.setattr(subscription, "_store_pending_entitlement", lambda *a, **k: _should_not_run())

    subscription._handle_lifetime_checkout(
        _paid_session(payment_status="unpaid", metadata={"plan": "starter_founding"}), None, "cus_123"
    )


def test_subscription_checkout_still_uses_the_subscription_path(monkeypatch):
    lifetime_calls = []
    monkeypatch.setattr(
        subscription, "_handle_lifetime_checkout", lambda *a: lifetime_calls.append(a)
    )
    monkeypatch.setattr(subscription, "_set_tier_for_user", lambda *a, **k: True)

    subscription._handle_checkout_completed(
        {
            "id": "cs_sub",
            "subscription": "sub_123",
            "client_reference_id": "user-1",
            "metadata": {"tier": "pro"},
            "customer": "cus_1",
        }
    )

    assert lifetime_calls == []


def test_one_time_checkout_is_routed_to_the_lifetime_path(monkeypatch):
    lifetime_calls = []
    monkeypatch.setattr(
        subscription, "_handle_lifetime_checkout", lambda *a: lifetime_calls.append(a)
    )

    subscription._handle_checkout_completed(_paid_session(metadata={"plan": "starter_founding"}))

    assert len(lifetime_calls) == 1


def _should_not_run():
    raise AssertionError("should not have been called")
