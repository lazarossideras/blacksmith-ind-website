// Vercel serverless function — receives Calendly webhook events and updates
// the matching lead_qualifications row in Supabase.
//
// Endpoint: POST https://blacksmith-ind.com/api/calendly-webhook
//
// Required env vars (set in Vercel project settings):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   CALENDLY_WEBHOOK_SIGNING_KEY

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { sendTelegram, bookedMessage, cancelledMessage } = require('./_lib/telegram');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// .trim() guards against a stray trailing newline in the env var, which would
// otherwise make the HMAC key differ from what Calendly signs with (→ 403).
const CALENDLY_WEBHOOK_SIGNING_KEY = (process.env.CALENDLY_WEBHOOK_SIGNING_KEY || '').trim();

async function readRawBody(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8');
}

function verifySignature(rawBody, signatureHeader, signingKey) {
    if (!signatureHeader || !signingKey) return false;

    const parts = {};
    for (const item of String(signatureHeader).split(',')) {
        const eq = item.indexOf('=');
        if (eq === -1) continue;
        parts[item.slice(0, eq).trim()] = item.slice(eq + 1).trim();
    }

    const { t: timestamp, v1: signature } = parts;
    if (!timestamp || !signature) return false;

    const ageSec = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
    if (!Number.isFinite(ageSec) || ageSec > 300 || ageSec < -60) return false;

    const expected = crypto
        .createHmac('sha256', signingKey)
        .update(`${timestamp}.${rawBody}`, 'utf8')
        .digest('hex');

    try {
        const sigBuf = Buffer.from(signature, 'hex');
        const expBuf = Buffer.from(expected, 'hex');
        if (sigBuf.length !== expBuf.length) return false;
        return crypto.timingSafeEqual(sigBuf, expBuf);
    } catch {
        return false;
    }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function updateMatchingRow(supabase, utmContent, email, update) {
    // Prefer match by qualification id (passed as utm_content from the form)
    if (utmContent && UUID_RE.test(utmContent)) {
        const { data, error } = await supabase
            .from('lead_qualifications')
            .update(update)
            .eq('id', utmContent)
            .select('id');
        if (!error && data && data.length > 0) return { matched: true, by: 'utm_content', id: data[0].id };
    }

    // Fallback: most recent qualification with this email in the last 24h
    if (email) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: rows, error } = await supabase
            .from('lead_qualifications')
            .select('id')
            .eq('email', email)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(1);
        if (!error && rows && rows.length > 0) {
            const { error: updateErr } = await supabase
                .from('lead_qualifications')
                .update(update)
                .eq('id', rows[0].id);
            if (!updateErr) return { matched: true, by: 'email', id: rows[0].id };
        }
    }

    return { matched: false };
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !CALENDLY_WEBHOOK_SIGNING_KEY) {
        console.error('Webhook misconfigured: missing one or more env vars');
        return res.status(500).json({ error: 'Server misconfigured' });
    }

    let rawBody;
    try {
        rawBody = await readRawBody(req);
    } catch (e) {
        return res.status(400).json({ error: 'Could not read body' });
    }

    const signatureHeader = req.headers['calendly-webhook-signature'];
    if (!verifySignature(rawBody, signatureHeader, CALENDLY_WEBHOOK_SIGNING_KEY)) {
        console.warn('Invalid Calendly signature');
        return res.status(403).json({ error: 'Invalid signature' });
    }

    let event;
    try {
        event = JSON.parse(rawBody);
    } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
    });

    try {
        const eventType = event.event;
        const payload = event.payload || {};
        const utmContent = payload.tracking && payload.tracking.utm_content;
        const inviteeEmail = String(payload.email || '').toLowerCase().trim();
        const inviteeUri = payload.uri;
        const scheduledEvent = payload.scheduled_event || {};

        let result = { matched: false };

        if (eventType === 'invitee.created') {
            result = await updateMatchingRow(supabase, utmContent, inviteeEmail, {
                status: 'booked',
                calendly_invitee_uri: inviteeUri || null,
                calendly_event_uri: scheduledEvent.uri || null,
                calendly_booked_at: scheduledEvent.start_time || null
            });
        } else if (eventType === 'invitee.canceled' || eventType === 'invitee.cancelled') {
            const cancellation = payload.cancellation || {};
            result = await updateMatchingRow(supabase, utmContent, inviteeEmail, {
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancellation_reason: cancellation.reason || null
            });
        } else {
            console.log('Ignoring unhandled Calendly event:', eventType);
            return res.status(200).json({ ok: true, ignored: eventType });
        }

        if (!result.matched) {
            console.warn('No matching qualification row for', eventType, {
                utmContent,
                email: inviteeEmail
            });
            // Still return 200 — the booking is valid; we just don't have a qualification row.
            // Could be a direct Calendly booking that bypassed the funnel.
            return res.status(200).json({ ok: true, matched: false, event: eventType });
        }

        // Fire Telegram alert inline (fire-and-forget - any failure is logged, never blocks the 200).
        try {
            const { data: row } = await supabase
                .from('lead_qualifications')
                .select('id, full_name, email, business_name, calendly_booked_at, cancelled_at, cancellation_reason')
                .eq('id', result.id)
                .single();
            if (row) {
                const isBooked = eventType === 'invitee.created';
                const msg = isBooked ? bookedMessage(row) : cancelledMessage(row);
                await sendTelegram(msg, {
                    topic: 'leads',
                    event: isBooked ? 'booked' : 'cancelled',
                    deepLink: { leadId: row.id }
                });
            }
        } catch (err) {
            console.error('Telegram alert failed (non-fatal)', err && err.message ? err.message : err);
        }

        return res.status(200).json({
            ok: true,
            matched: true,
            matched_by: result.by,
            qualification_id: result.id,
            event: eventType
        });
    } catch (err) {
        console.error('Webhook handler error:', err);
        return res.status(500).json({ error: 'Handler error' });
    }
};

module.exports.config = { api: { bodyParser: false } };
