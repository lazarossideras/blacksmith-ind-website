// Telegram notification helper for Vercel serverless functions in this website project.
// Mirrors the architecture of ../../blacksmith-leads-trigger/src/lib/telegram.ts
//
// Architecture: ONE supergroup with topics enabled (Telegram "forum mode").
// Each notification source posts to its own topic. Used by api/calendly-webhook.js
// to fire booking/cancellation alerts inline into the Leads topic.
//
// Every send is logged to the Supabase `notifications` table (audit trail +
// proof-of-delivery via Telegram's returned message_id).
//
// Env vars (set in Vercel project settings):
//   TELEGRAM_BOT_TOKEN          - from @BotFather
//   TELEGRAM_GROUP_ID           - the supergroup chat id (e.g. -1001234567890)
//   TELEGRAM_TOPIC_LEADS        - message_thread_id of the Leads topic
//   TELEGRAM_TOPIC_<NAME>       - more topics by adding more env vars with this prefix
//   DASHBOARD_URL               - e.g. https://admin.blacksmith-ind.com
//   SUPABASE_URL                - for the notifications audit log
//   SUPABASE_SERVICE_ROLE_KEY   - for the notifications audit log
//
// Failures are logged to console.error but never thrown - we never want to
// break the webhook 200 response because Telegram is down.

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID;
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://admin.blacksmith-ind.com';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function escape(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtLondon(iso) {
    if (!iso) return '-';
    try {
        return new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/London' });
    } catch {
        return iso;
    }
}

function resolveTopicId(topic) {
    if (topic === 'general') return undefined;
    const envKey = `TELEGRAM_TOPIC_${topic.toUpperCase()}`;
    const raw = process.env[envKey];
    if (!raw) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
}

// Insert one row into the notifications audit table. Best-effort: never throws.
async function logNotification(row) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('notifications log skipped - Supabase env not set');
        return;
    }
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal'
            },
            body: JSON.stringify(row)
        });
        if (!res.ok) {
            const txt = await res.text().catch(() => '');
            console.error('notifications log insert failed', res.status, txt.slice(0, 200));
        }
    } catch (err) {
        console.error('notifications log insert error', err && err.message ? err.message : err);
    }
}

// opts: { topic, event, deepLink?: { leadId } }
async function sendTelegram(text, opts) {
    const relatedId = opts.deepLink && opts.deepLink.leadId ? opts.deepLink.leadId : null;
    const relatedTable = relatedId ? 'lead_qualifications' : null;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_GROUP_ID) {
        console.error('Telegram not configured', {
            hasToken: !!TELEGRAM_BOT_TOKEN,
            hasGroupId: !!TELEGRAM_GROUP_ID
        });
        await logNotification({
            event_type: opts.event,
            topic: opts.topic,
            related_id: relatedId,
            related_table: relatedTable,
            telegram_message_id: null,
            status: 'failed',
            error: 'telegram_not_configured'
        });
        return;
    }

    const body = {
        chat_id: TELEGRAM_GROUP_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
    };

    const topicId = resolveTopicId(opts.topic);
    if (topicId !== undefined) {
        body.message_thread_id = topicId;
    } else if (opts.topic !== 'general') {
        console.warn(`Topic '${opts.topic}' has no thread id, posting to General`);
    }

    if (relatedId) {
        body.reply_markup = {
            inline_keyboard: [[{
                text: '📋 Open in dashboard',
                url: `${DASHBOARD_URL}/?lead=${encodeURIComponent(relatedId)}`
            }]]
        };
    }

    try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            console.error('Telegram sendMessage failed', res.status, errText.slice(0, 200));
            await logNotification({
                event_type: opts.event,
                topic: opts.topic,
                related_id: relatedId,
                related_table: relatedTable,
                telegram_message_id: null,
                status: 'failed',
                error: `telegram_${res.status}: ${errText.slice(0, 160)}`
            });
            return;
        }
        const data = await res.json().catch(() => ({}));
        const messageId = data && data.result ? data.result.message_id : null;
        await logNotification({
            event_type: opts.event,
            topic: opts.topic,
            related_id: relatedId,
            related_table: relatedTable,
            telegram_message_id: messageId,
            status: 'sent',
            error: null
        });
    } catch (err) {
        console.error('Telegram fetch error', err && err.message ? err.message : err);
        await logNotification({
            event_type: opts.event,
            topic: opts.topic,
            related_id: relatedId,
            related_table: relatedTable,
            telegram_message_id: null,
            status: 'failed',
            error: (err && err.message ? err.message : String(err)).slice(0, 160)
        });
    }
}

// Renders the "booked" Telegram message for an invitee.created webhook event.
function bookedMessage(lead) {
    return [
        `✅ <b>Booked: ${escape(lead.full_name)}</b>`,
        '',
        `<b>Business:</b> ${escape(lead.business_name)}`,
        `<b>Booked for:</b> ${escape(fmtLondon(lead.calendly_booked_at))}`,
        `<b>Email:</b> <a href="mailto:${escape(lead.email)}">${escape(lead.email)}</a>`
    ].join('\n');
}

// Renders the "cancelled" Telegram message for an invitee.cancelled webhook event.
function cancelledMessage(lead) {
    const lines = [
        `❌ <b>Cancelled: ${escape(lead.full_name)}</b>`,
        '',
        `<b>Business:</b> ${escape(lead.business_name)}`,
        `<b>Cancelled at:</b> ${escape(fmtLondon(lead.cancelled_at))}`
    ];
    if (lead.cancellation_reason) {
        lines.push(`<b>Reason:</b> ${escape(lead.cancellation_reason)}`);
    }
    lines.push(`<b>Email:</b> <a href="mailto:${escape(lead.email)}">${escape(lead.email)}</a>`);
    return lines.join('\n');
}

module.exports = { sendTelegram, bookedMessage, cancelledMessage };
