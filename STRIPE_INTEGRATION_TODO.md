# Stripe Checkout integration

Hosted Stripe Checkout is already implemented. Checkout Studio parameters were applied to the existing Checkout Session create calls (Scenario A). Use this file as the remaining setup checklist.

## Values to Replace

No `sample_only` placeholders were introduced. `mode`, `success_url`, `cancel_url`, and `line_items` already use real application values and were left unchanged.

**Files containing these session fields:**
- [controller/topup_stripe.go](controller/topup_stripe.go) (`genStripeLink`)
- [controller/subscription_payment_stripe.go](controller/subscription_payment_stripe.go) (`genStripeSubscriptionLink`)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| mode (top-up) | `payment` | Keep `payment` for one-time wallet top-ups. |
| mode (subscription) | `subscription` | Keep `subscription` for recurring plans. |
| success_url (top-up) | `paymentReturnPath("/usage-logs")` (ServerAddress + `/usage-logs`) | Already a real return URL. Change only if you want a different post-payment page. `{CHECKOUT_SESSION_ID}` is not currently appended. |
| cancel_url (top-up) | `paymentReturnPath("/wallet")` | Already a real cancel URL. |
| success_url / cancel_url (subscription) | `paymentReturnPath("/wallet")` | Already real return URLs. |
| line_items[].price (top-up) | `setting.StripePriceId` from admin payment settings | Set a live/test Price ID in **System settings → payment / Stripe Price ID**. |
| line_items[].price (subscription) | `plan.StripePriceId` on the subscription plan | Set each plan’s Stripe Price ID in the admin subscription plan editor. |

`github.com/stripe/stripe-go/v81` (v81.4.0) uses `ui_mode=hosted`, not `hosted_page`. `hosted_page` is the name used by newer Node SDKs (21.0.0+) and current Stripe API docs. Do not send `hosted_page` until this module is upgraded far enough to define `CheckoutSessionUIModeHostedPage`.

`integration_identifier` and `origin_context` are not typed fields on stripe-go v81. They are sent with `params.AddExtra(...)`. Typed fields exist in stripe-go v82.4.0+ (`OriginContext`) and later API versions (`integration_identifier`). If Stripe rejects the extra fields on your account’s API version, upgrade `github.com/stripe/stripe-go` and set them as native struct fields.

## Configured Parameters

These parameters were configured in Checkout Studio and are set on both Checkout Session create calls.

**Files containing these parameters:**
- [controller/topup_stripe.go](controller/topup_stripe.go)
- [controller/subscription_payment_stripe.go](controller/subscription_payment_stripe.go)

| Parameter | Value |
|-----------|-------|
| ui_mode | `hosted` (stripe-go v81 equivalent of hosted page) |
| billing_address_collection | `auto` |
| phone_number_collection.enabled | `false` |
| automatic_tax.enabled | `false` |
| allow_promotion_codes | `false` |
| payment_method_collection | `always` (subscription sessions only) |
| submit_type | `auto` (payment / top-up sessions only) |
| integration_identifier | `hosted_web_0001` |
| origin_context | `web` |

`allow_promotion_codes` is now always `false` from Checkout Studio. The admin flag `StripePromotionCodesEnabled` is no longer passed into Checkout Session creation.

Existing operational fields were kept: `client_reference_id`, `customer` / `customer_email` / `customer_creation`. Removing those would break order matching and customer reuse.

## Setup and next steps

### Environment and keys

This project stores Stripe secrets in the database option map (admin payment settings), not in `.env`:

| Setting | Purpose |
|---------|---------|
| `StripeApiSecret` | Restricted or secret key (`rk_…` / `sk_…`) |
| `StripeWebhookSecret` | Endpoint signing secret (`whsec_…`) |
| `StripePriceId` | Top-up Price ID |
| Server address (`system_setting.ServerAddress`) | Base for success/cancel URLs |

Do not put keys in source. Prefer a [restricted API key](https://docs.stripe.com/keys.md#manage-your-api-keys) over a secret key. Get keys from [Stripe Dashboard API keys](https://dashboard.stripe.com/test/apikeys).

### Project structure

No new routes, handlers, or webhook files. Checkout Session creation already lived in:

- `controller/topup_stripe.go` — one-time top-up Checkout
- `controller/subscription_payment_stripe.go` — subscription Checkout
- `controller/topup_stripe.go` `StripeWebhook` — existing webhook handler
- Routes: `POST /api/user/stripe/pay`, `POST /api/subscription/stripe/pay`, `POST /api/stripe/webhook`

### Flow overview

1. Authenticated user starts top-up or subscription pay.
2. The server creates a Hosted Checkout Session and returns `pay_link`.
3. The browser redirects to Stripe-hosted Checkout (`session.URL`).
4. Stripe sends webhooks. Fulfillment must stay in the webhook handler (`checkout.session.completed` and async payment events), not only the success page.

If you charge US or EU customers later, enable Stripe Tax and add an active tax registration before turning `automatic_tax.enabled` to `true`. Enabling the flag without a registration collects no tax.

### Testing

Use Stripe test mode keys and [test cards](https://docs.stripe.com/testing.md#cards), for example:

- Success: `4242 4242 4242 4242`
- Requires authentication: `4000 0025 0000 3155`
- Decline: `4000 0000 0000 9995`

Use any future expiry, any 3-digit CVC, and any postal code.

### Next steps

1. Confirm `StripeApiSecret`, `StripeWebhookSecret`, and Price IDs in admin settings.
2. Point the webhook endpoint at `/api/stripe/webhook` in [Workbench webhooks](https://dashboard.stripe.com/workbench/webhooks).
3. Keep fulfillment in the webhook path for top-ups and for subscription lifecycle events (`customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`).
4. Optionally upgrade `github.com/stripe/stripe-go` so `ui_mode=hosted_page`, `origin_context`, and `integration_identifier` are first-class fields.
5. Re-enable promotion codes in Checkout Studio (or restore `setting.StripePromotionCodesEnabled`) if you need coupons on hosted Checkout.

### Resources

- https://support.stripe.com
- https://docs.stripe.com/mcp
- https://docs.stripe.com/payments/checkout
- https://docs.stripe.com/billing/subscriptions/webhooks.md
