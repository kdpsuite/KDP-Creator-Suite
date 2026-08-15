import os
from datetime import datetime

import stripe
from flask import Blueprint, request

from src.models.user import UserProfile, get_jwt_identity, jwt_required, supabase
from src.utils.responses import error_response, success_response

subscription_bp = Blueprint('subscription', __name__)

TIER_RANK = {
    'free': 0,
    'pro': 1,
    'studio': 2,
    'unlimited': 3,
}

SUBSCRIPTION_TIERS = {
    'free': {
        'name': 'Free',
        'monthly_conversions': 5,
        'batch_processing_limit': 1,
        'watermark_free': False,
        'priority_support': False,
        'advanced_features': False,
        'cloud_storage': False,
        'kdp_integration': False,
        'price': 0,
    },
    'pro': {
        'name': 'Pro',
        'monthly_conversions': -1,
        'batch_processing_limit': 10,
        'watermark_free': True,
        'priority_support': True,
        'advanced_features': True,
        'cloud_storage': True,
        'kdp_integration': True,
        'price': 19.99,
    },
    'studio': {
        'name': 'Studio',
        'monthly_conversions': -1,
        'batch_processing_limit': -1,
        'watermark_free': True,
        'priority_support': True,
        'advanced_features': True,
        'cloud_storage': True,
        'kdp_integration': True,
        'price': 49.99,
    },
    'unlimited': {
        'name': 'Admin',
        'monthly_conversions': -1,
        'batch_processing_limit': -1,
        'watermark_free': True,
        'priority_support': True,
        'advanced_features': True,
        'cloud_storage': True,
        'kdp_integration': True,
        'price': 0,
    },
}

PUBLIC_TIERS = ('free', 'pro', 'studio')
PAID_TIERS = ('pro', 'studio')

# One Stripe Product per plan. Lookup keys work in both test and live if the
# catalog is cloned with the same keys (Stripe catalog modeling best practice).
PRICE_LOOKUP_KEYS = {
    'pro': os.environ.get('STRIPE_LOOKUP_PRO', 'kdp_pro_monthly'),
    'studio': os.environ.get('STRIPE_LOOKUP_STUDIO', 'kdp_studio_monthly'),
}


def _stripe_api_key():
    return os.environ.get('STRIPE_API_KEY') or os.environ.get('STRIPE_SECRET_KEY')


def _stripe_configured():
    return bool(_stripe_api_key())


def _get_stripe():
    api_key = _stripe_api_key()
    if not api_key:
        return None
    stripe.api_key = api_key
    return stripe


def _price_id_from_env(tier):
    env_map = {
        'pro': os.environ.get('STRIPE_PRICE_PRO'),
        'studio': os.environ.get('STRIPE_PRICE_STUDIO'),
    }
    return env_map.get(tier) or None


def _price_id_from_lookup(tier):
    stripe_client = _get_stripe()
    lookup = PRICE_LOOKUP_KEYS.get(tier)
    if not stripe_client or not lookup:
        return None
    try:
        result = stripe_client.Price.list(lookup_keys=[lookup], active=True, limit=1)
        data = result.get('data') if isinstance(result, dict) else getattr(result, 'data', None)
        if not data:
            return None
        first = data[0]
        return first.get('id') if isinstance(first, dict) else getattr(first, 'id', None)
    except Exception as exc:
        print(f'[subscription] lookup_key resolve failed for {tier}: {exc}')
        return None


def _price_id_for_tier(tier):
    return _price_id_from_env(tier) or _price_id_from_lookup(tier)


def _usable_customer_id(stripe_client, customer_id):
    """Return customer_id if it exists in the current Stripe mode; else None.

    Profiles can hold a test-mode cus_ after Preview E2E; live keys then fail
    Customer.retrieve / Checkout with that id.
    """
    if not customer_id or not stripe_client:
        return None
    try:
        stripe_client.Customer.retrieve(customer_id)
        return customer_id
    except Exception as exc:
        print(f'[subscription] ignoring unusable stripe customer {customer_id}: {exc}')
        return None


def _tier_for_price_id(price_id):
    if not price_id:
        return None
    mapping = {
        os.environ.get('STRIPE_PRICE_PRO'): 'pro',
        os.environ.get('STRIPE_PRICE_STUDIO'): 'studio',
    }
    mapped = mapping.get(price_id)
    if mapped:
        return mapped
    for tier, lookup in PRICE_LOOKUP_KEYS.items():
        resolved = _price_id_from_env(tier) or _price_id_from_lookup(tier)
        if resolved == price_id:
            return tier
    return None


def _frontend_url():
    return (
        os.environ.get('FRONTEND_URL')
        or os.environ.get('DASHBOARD_URL')
        or 'https://dashboard.kdpsuite.com'
    ).rstrip('/')


def _update_profile(user_id, fields):
    if not supabase or not fields:
        return False
    payload = {**fields, 'updated_at': datetime.utcnow().isoformat()}
    try:
        res = supabase.table('user_profiles').update(payload).eq('id', str(user_id)).execute()
        return bool(res.data)
    except Exception as exc:
        if 'stripe_customer_id' in fields:
            fallback = {k: v for k, v in payload.items() if k != 'stripe_customer_id'}
            try:
                res = supabase.table('user_profiles').update(fallback).eq('id', str(user_id)).execute()
                print(f'[subscription] stripe_customer_id column missing; updated without it: {exc}')
                return bool(res.data)
            except Exception as inner:
                print(f'[subscription] profile update failed: {inner}')
                return False
        print(f'[subscription] profile update failed: {exc}')
        return False


def _set_tier_for_user(user_id, tier, stripe_customer_id=None):
    if tier not in SUBSCRIPTION_TIERS:
        return False
    fields = {'subscription_tier': tier}
    if stripe_customer_id:
        fields['stripe_customer_id'] = stripe_customer_id
    return _update_profile(user_id, fields)


def user_meets_tier(user_tier, required_tier):
    user_rank = TIER_RANK.get(user_tier or 'free', 0)
    required_rank = TIER_RANK.get(required_tier or 'free', 0)
    return user_rank >= required_rank


def enforce_template_tier(user_id, required_tier):
    profile = UserProfile.get_by_id(user_id)
    user_tier = (profile or {}).get('subscription_tier', 'free')
    if user_meets_tier(user_tier, required_tier):
        return None
    return error_response(
        f'This template requires the {required_tier} plan. Upgrade to continue.',
        'TIER_REQUIRED',
        details={'required_tier': required_tier, 'current_tier': user_tier},
        status_code=403,
    )


@subscription_bp.route('/tiers', methods=['GET'])
def get_subscription_tiers():
    public = {key: SUBSCRIPTION_TIERS[key] for key in PUBLIC_TIERS}
    return success_response({'tiers': public})


@subscription_bp.route('/status', methods=['GET'])
@jwt_required()
def get_subscription_status():
    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        tier_limits = SUBSCRIPTION_TIERS['free']
        return success_response({
            'user_id': user_id,
            'tier': 'free',
            'tier_details': tier_limits,
            'current_usage': {'conversions': 0, 'batch_operations': 0},
            'remaining_usage': {
                'conversions': tier_limits['monthly_conversions'],
                'batch_operations': tier_limits['batch_processing_limit'],
            },
            'billing': {'stripe_configured': _stripe_configured(), 'has_customer': False},
        })

    tier = profile.get('subscription_tier', 'free')
    tier_limits = SUBSCRIPTION_TIERS.get(tier, SUBSCRIPTION_TIERS['free'])
    conversions = profile.get('conversions_this_month', 0)
    batch_ops = profile.get('batch_operations_this_month', 0)
    remaining_conversions = (
        -1 if tier_limits['monthly_conversions'] == -1
        else max(0, tier_limits['monthly_conversions'] - conversions)
    )
    remaining_batch_operations = (
        -1 if tier_limits['batch_processing_limit'] == -1
        else max(0, tier_limits['batch_processing_limit'] - batch_ops)
    )
    return success_response({
        'user_id': user_id,
        'tier': tier,
        'tier_details': tier_limits,
        'current_usage': {'conversions': conversions, 'batch_operations': batch_ops},
        'remaining_usage': {
            'conversions': remaining_conversions,
            'batch_operations': remaining_batch_operations,
        },
        'billing': {
            'stripe_configured': _stripe_configured(),
            'has_customer': bool(profile.get('stripe_customer_id')),
        },
    })


def _tier_usage_for_user(user_id):
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return SUBSCRIPTION_TIERS['free'], 0, 0
    tier = profile.get('subscription_tier', 'free')
    limits = SUBSCRIPTION_TIERS.get(tier, SUBSCRIPTION_TIERS['free'])
    conversions = profile.get('conversions_this_month', 0) or 0
    batch_ops = profile.get('batch_operations_this_month', 0) or 0
    return limits, conversions, batch_ops


def enforce_conversion_quota(user_id):
    limits, used, _ = _tier_usage_for_user(user_id)
    limit = limits['monthly_conversions']
    if limit == -1:
        return None
    if used >= limit:
        return error_response(
            'Monthly conversion limit reached. Upgrade your plan to continue.',
            'QUOTA_EXCEEDED',
            details={'kind': 'conversions', 'used': used, 'limit': limit},
            status_code=403,
        )
    return None


def enforce_batch_quota(user_id):
    limits, _, used = _tier_usage_for_user(user_id)
    limit = limits['batch_processing_limit']
    if limit == -1:
        return None
    if used >= limit:
        return error_response(
            'Monthly batch processing limit reached. Upgrade your plan to continue.',
            'QUOTA_EXCEEDED',
            details={'kind': 'batch_operations', 'used': used, 'limit': limit},
            status_code=403,
        )
    return None


def record_conversion_usage(user_id, amount=1):
    if not supabase or amount < 1:
        return
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return
    current = profile.get('conversions_this_month', 0) or 0
    try:
        supabase.table('user_profiles').update({
            'conversions_this_month': current + amount,
            'updated_at': datetime.utcnow().isoformat(),
        }).eq('id', str(user_id)).execute()
    except Exception as usage_error:
        print(f'Failed to record conversion usage for {user_id}: {usage_error}')


def record_batch_usage(user_id, amount=1):
    if not supabase or amount < 1:
        return
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return
    current = profile.get('batch_operations_this_month', 0) or 0
    try:
        supabase.table('user_profiles').update({
            'batch_operations_this_month': current + amount,
            'updated_at': datetime.utcnow().isoformat(),
        }).eq('id', str(user_id)).execute()
    except Exception as usage_error:
        print(f'Failed to record batch usage for {user_id}: {usage_error}')


@subscription_bp.route('/upgrade', methods=['POST'])
@jwt_required()
def upgrade_subscription():
    """Free self-upgrade is disabled. Use Stripe Checkout instead."""
    return error_response(
        'Direct tier upgrades are disabled. Use Stripe Checkout via POST /api/checkout.',
        'UPGRADE_DISABLED',
        details={'use': '/api/checkout', 'paid_tiers': list(PAID_TIERS)},
        status_code=403,
    )


@subscription_bp.route('/checkout', methods=['POST'])
@jwt_required()
def create_checkout_session():
    stripe_client = _get_stripe()
    if not stripe_client:
        return error_response(
            'Billing is not configured. Set STRIPE_API_KEY and price IDs.',
            'BILLING_NOT_CONFIGURED',
            status_code=503,
        )

    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    tier = (data.get('tier') or '').strip().lower()
    if tier not in PAID_TIERS:
        return error_response('Invalid tier. Choose pro or studio.', 'INVALID_TIER', status_code=400)

    price_id = _price_id_for_tier(tier)
    if not price_id:
        return error_response(
            f'Stripe price ID missing for {tier}. Set STRIPE_PRICE_{tier.upper()}.',
            'PRICE_NOT_CONFIGURED',
            status_code=503,
        )

    profile = UserProfile.get_by_id(user_id) or {}
    email = getattr(request, 'user', None) and getattr(request.user, 'email', None)
    email = email or profile.get('email')
    stored_customer_id = profile.get('stripe_customer_id')
    customer_id = _usable_customer_id(stripe_client, stored_customer_id)
    if stored_customer_id and not customer_id:
        _update_profile(user_id, {'stripe_customer_id': None})

    try:
        if not customer_id and email:
            customer = stripe_client.Customer.create(
                email=email,
                metadata={'user_id': str(user_id)},
            )
            customer_id = customer.id
            _update_profile(user_id, {'stripe_customer_id': customer_id})

        session_params = {
            'mode': 'subscription',
            'line_items': [{'price': price_id, 'quantity': 1}],
            'success_url': (
                f'{_frontend_url()}/?checkout=success&tier={tier}'
                '&session_id={CHECKOUT_SESSION_ID}'
            ),
            'cancel_url': f'{_frontend_url()}/?checkout=canceled',
            'client_reference_id': str(user_id),
            'metadata': {'user_id': str(user_id), 'tier': tier},
            'subscription_data': {'metadata': {'user_id': str(user_id), 'tier': tier}},
            'billing_address_collection': 'auto',
        }
        # Stripe forbids combining allow_promotion_codes with discounts[].
        promo_code = (data.get('promotion_code') or '').strip()
        if promo_code:
            promos = stripe_client.PromotionCode.list(
                code=promo_code, active=True, limit=1
            )
            if not promos.data:
                return error_response(
                    'Promotion code is invalid or inactive.',
                    'INVALID_PROMO',
                    status_code=400,
                )
            session_params['discounts'] = [
                {'promotion_code': promos.data[0].id},
            ]
        else:
            session_params['allow_promotion_codes'] = True
        if customer_id:
            session_params['customer'] = customer_id
        elif email:
            session_params['customer_email'] = email

        session = stripe_client.checkout.Session.create(**session_params)
        return success_response({
            'checkout_url': session.url,
            'session_id': session.id,
            'tier': tier,
        })
    except Exception as exc:
        print(f'[subscription] checkout failed: {exc}')
        return error_response('Failed to create checkout session.', 'CHECKOUT_ERROR', status_code=500)


@subscription_bp.route('/billing-portal', methods=['POST'])
@jwt_required()
def create_billing_portal():
    stripe_client = _get_stripe()
    if not stripe_client:
        return error_response('Billing is not configured.', 'BILLING_NOT_CONFIGURED', status_code=503)

    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id) or {}
    stored_customer_id = profile.get('stripe_customer_id')
    customer_id = _usable_customer_id(stripe_client, stored_customer_id)
    if stored_customer_id and not customer_id:
        _update_profile(user_id, {'stripe_customer_id': None})
        return error_response(
            'Saved Stripe customer is invalid for this environment. Start Checkout again.',
            'STALE_CUSTOMER',
            status_code=400,
        )
    if not customer_id:
        return error_response(
            'No Stripe customer on file. Complete a checkout first.',
            'NO_CUSTOMER',
            status_code=400,
        )

    try:
        portal = stripe_client.billing_portal.Session.create(
            customer=customer_id,
            return_url=f'{_frontend_url()}/?tab=settings',
        )
        return success_response({'portal_url': portal.url})
    except Exception as exc:
        print(f'[subscription] billing portal failed: {exc}')
        return error_response('Failed to open billing portal.', 'PORTAL_ERROR', status_code=500)


def _handle_checkout_completed(session):
    session = _as_dict(session)
    user_id = session.get('client_reference_id') or (session.get('metadata') or {}).get('user_id')
    tier = (session.get('metadata') or {}).get('tier')
    customer_id = session.get('customer')

    if not tier and session.get('subscription'):
        stripe_client = _get_stripe()
        if stripe_client:
            try:
                sub = stripe_client.Subscription.retrieve(session['subscription'])
                tier = (sub.get('metadata') or {}).get('tier')
                if not tier:
                    items = (sub.get('items') or {}).get('data') or []
                    if items:
                        price_id = ((items[0].get('price') or {}).get('id'))
                        tier = _tier_for_price_id(price_id)
            except Exception as exc:
                print(f'[subscription] failed to load subscription for checkout: {exc}')

    if not user_id or not tier:
        print(f'[subscription] checkout.session.completed missing user/tier: {session.get("id")}')
        return

    _set_tier_for_user(user_id, tier, stripe_customer_id=customer_id)


def _as_dict(obj):
    if obj is None:
        return {}
    if isinstance(obj, dict):
        return obj
    if hasattr(obj, 'to_dict'):
        return obj.to_dict()
    return dict(obj)


def _handle_invoice_paid(invoice):
    invoice = _as_dict(invoice)
    sub_id = invoice.get('subscription')
    if not sub_id:
        parent = invoice.get('parent') or {}
        sub_details = parent.get('subscription_details') or {}
        sub_id = sub_details.get('subscription')
    if not sub_id:
        return
    stripe_client = _get_stripe()
    if not stripe_client:
        return
    try:
        sub = stripe_client.Subscription.retrieve(sub_id)
        _handle_subscription_updated(_as_dict(sub))
    except Exception as exc:
        print(f'[subscription] invoice.paid subscription retrieve failed: {exc}')


def _handle_subscription_updated(subscription):
    subscription = _as_dict(subscription)
    metadata = subscription.get('metadata') or {}
    user_id = metadata.get('user_id')
    tier = metadata.get('tier')
    customer_id = subscription.get('customer')
    status = subscription.get('status')

    if not tier:
        items = (subscription.get('items') or {}).get('data') or []
        if items:
            price_id = ((items[0].get('price') or {}).get('id'))
            tier = _tier_for_price_id(price_id)

    if not user_id:
        print(f'[subscription] subscription event missing user_id: {subscription.get("id")}')
        return

    if status in ('canceled', 'unpaid', 'incomplete_expired'):
        _set_tier_for_user(user_id, 'free', stripe_customer_id=customer_id)
        return

    if tier and status in ('active', 'trialing', 'past_due'):
        _set_tier_for_user(user_id, tier, stripe_customer_id=customer_id)


@subscription_bp.route('/webhooks/stripe', methods=['POST'])
def stripe_webhook():
    stripe_client = _get_stripe()
    webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')
    if not stripe_client or not webhook_secret:
        return error_response('Stripe webhook not configured', 'WEBHOOK_NOT_CONFIGURED', status_code=503)

    payload = request.get_data(cache=False)
    sig_header = request.headers.get('Stripe-Signature', '')

    signature_error = getattr(stripe.error, 'SignatureVerificationError', Exception)
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError:
        return error_response('Invalid payload', 'INVALID_PAYLOAD', status_code=400)
    except signature_error:
        return error_response('Invalid signature', 'INVALID_SIGNATURE', status_code=400)

    event = _as_dict(event)
    event_type = event.get('type')
    data_object = (event.get('data') or {}).get('object') or {}

    if event_type == 'checkout.session.completed':
        _handle_checkout_completed(data_object)
    elif event_type in ('customer.subscription.updated', 'customer.subscription.created'):
        _handle_subscription_updated(data_object)
    elif event_type == 'customer.subscription.deleted':
        metadata = data_object.get('metadata') or {}
        user_id = metadata.get('user_id')
        if user_id:
            _set_tier_for_user(user_id, 'free', stripe_customer_id=data_object.get('customer'))
    elif event_type == 'invoice.paid':
        _handle_invoice_paid(data_object)
    elif event_type == 'invoice.payment_failed':
        print(f'[subscription] invoice.payment_failed: {data_object.get("id")}')
    else:
        print(f'[subscription] ignored stripe event: {event_type}')

    return success_response({'received': True})
