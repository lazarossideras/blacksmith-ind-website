# Calendly webhook subscription — one-time setup

The booked/cancelled Telegram notifications depend on Calendly POSTing events to
our webhook handler. The handler ([api/calendly-webhook.js](../api/calendly-webhook.js))
is deployed and verified, but **Calendly will not call it until a webhook
subscription is registered** — and Calendly only exposes that via its API, not the
web UI.

Status (2026-05-24): handler live, signing key set in Vercel, but **no subscription
registered yet** (confirmed: a real test booking fired no webhook; `ever_booked = 0`
across all leads). Until the step below is done, real bookings/cancellations will
NOT notify.

## What you need

A **Calendly Personal Access Token** with the `webhook` scope:
Calendly → Integrations & apps → API and webhooks → Personal access tokens →
Create a token (Webhooks scope). Note: creating a token triggers an email 2FA code.

## Register the subscription

```bash
# 1. Get your organization + user URIs
curl -s https://api.calendly.com/users/me \
  -H "Authorization: Bearer $CALENDLY_PAT" | python -m json.tool
# note resource.current_organization and resource.uri

# 2. Create the subscription pointing at our handler.
#    signing_key must equal the CALENDLY_WEBHOOK_SIGNING_KEY already set in Vercel
#    (api/calendly-webhook.js verifies the HMAC against it).
curl -s -X POST https://api.calendly.com/webhook_subscriptions \
  -H "Authorization: Bearer $CALENDLY_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.blacksmith-ind.com/api/calendly-webhook",
    "events": ["invitee.created", "invitee.canceled"],
    "organization": "<resource.current_organization from step 1>",
    "user": "<resource.uri from step 1>",
    "scope": "user",
    "signing_key": "<value of CALENDLY_WEBHOOK_SIGNING_KEY in Vercel>"
  }'
```

If `signing_key` is omitted, Calendly generates one and returns it — in that case
update the Vercel `CALENDLY_WEBHOOK_SIGNING_KEY` env var to match, then redeploy.

## Verify

1. Book a slot on https://calendly.com/l-sideras-blacksmith-ind/30min using an email
   that matches a recent lead (or any email — the handler matches by `utm_content`
   first, then by email within 24h).
2. Within seconds: a `✅ Booked` message lands in the Telegram **Leads** topic, the
   lead row flips to `status = booked`, and a `booked` row appears in the
   `notifications` audit table.
3. Cancel the booking → `❌ Cancelled` message + `cancelled` row.

Verify the audit log without Telegram:

```sql
select event_type, status, telegram_message_id, sent_at
from public.notifications
where event_type in ('booked','cancelled')
order by sent_at desc;
```

## Notes

- The handler also has a backup: the trigger.dev `lead-submitted` task re-checks
  status 30 min after submit and fires `✅ Booked` if booked by then. The webhook is
  the primary, immediate path.
- Revoke any throwaway PAT after setup if you don't need it for anything else.
