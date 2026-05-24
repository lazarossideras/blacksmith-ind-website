# Calendly webhook — status & setup reference

The booked/cancelled Telegram notifications depend on Calendly POSTing events to
our handler ([api/calendly-webhook.js](../api/calendly-webhook.js)). This documents
the current wiring and the root causes found while getting it working.

## Current state (2026-05-24)

- **Webhook subscription: registered + ACTIVE.** `uri .../webhook_subscriptions/42a48af6-124c-4bbb-b513-04e8f87edfc2`,
  events `invitee.created` + `invitee.canceled`, callback `https://www.blacksmith-ind.com/api/calendly-webhook`, scope `user`.
- **Signing key: matched.** A 64-char hex key was generated, set on the subscription
  AND in Vercel `CALENDLY_WEBHOOK_SIGNING_KEY`. The handler also `.trim()`s the key
  defensively.
- **Handler: deployed and confirmed receiving** (Vercel logs show real POSTs).
- **Remaining: one live exercise.** A real booking must flow through to confirm the
  matched-key signature passes end-to-end. Automated booking is blocked by Calendly's
  reCAPTCHA; the next genuine lead booking will exercise it. Verify via the audit query
  below.

## Root causes found (history)

1. **No working subscription existed.** The only prior subscription pointed at the
   **apex** `https://blacksmith-ind.com/...` (which has an invalid TLS cert) and was
   `disabled`. That's why no booking ever notified (`ever_booked = 0` across all leads).
2. **Signing-key mismatch (403).** After registering on the `www` host, Calendly's
   signature didn't match the handler's key. Fixed by generating one key and setting it
   identically on both the subscription and Vercel, plus `.trim()` in the handler.

## Verify (once a real booking happens)

```sql
select n.event_type, n.status, n.telegram_message_id, n.sent_at, l.full_name, l.status
from public.notifications n
left join public.lead_qualifications l on l.id = n.related_id
where n.event_type in ('booked','cancelled')
order by n.sent_at desc;
```

Expect a `booked` row (status `sent`, a `telegram_message_id`) within seconds of a
booking, the lead row flipping to `status = booked`, and a `✅ Booked` message in the
Telegram Leads topic. Cancelling produces the `cancelled` equivalent.

## Re-registering (if ever needed)

Needs a Calendly Personal Access Token with `webhooks:write` + `users:read`
(Calendly → Integrations & apps → API and webhooks). Then:

```bash
# resolve org + user
curl -s https://api.calendly.com/users/me -H "Authorization: Bearer $PAT"
# create (generate your own signing_key and set the SAME value in Vercel)
curl -s -X POST https://api.calendly.com/webhook_subscriptions \
  -H "Authorization: Bearer $PAT" -H "Content-Type: application/json" \
  -d '{"url":"https://www.blacksmith-ind.com/api/calendly-webhook",
       "events":["invitee.created","invitee.canceled"],
       "organization":"<current_organization>","user":"<uri>","scope":"user",
       "signing_key":"<64-char-hex, also set as Vercel CALENDLY_WEBHOOK_SIGNING_KEY>"}'
```
