// Telegram notification helper for Vercel serverless functions in this website project.
// Mirrors the architecture of ../../blacksmith-leads-trigger/src/lib/telegram.ts
//
// Architecture: ONE supergroup with topics enabled (Telegram "forum mode").
// Each notification source posts to its own topic. Used by api/calendly-webhook.js
// to fire booking/cancellation alerts inline into the Leads topic.
//
// Env vars (set in Vercel project settings):
//   TELEGRAM_BOT_TOKEN      - from @BotFather
//   TELEGRAM_GROUP_ID       - the supergroup chat id (e.g. -1001234567890)
//   TELEGRAM_TOPIC_LEADS    - message_thread_id of the Leads topic
//   TELEGRAM_TOPIC_<NAME>   - more topics by adding more env vars with this prefix
//   DASHBOARD_URL           - e.g. https://admin.blacksmith-ind.com
//
// Failures are logged to console.error but never thrown - we never want to
// break the webhook 200 response because Telegram is down.

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID;
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://admin.blacksmith-ind.com';

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

async function sendTelegram(text, opts) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_GROUP_ID) {
        console.error('Telegram not configured', {
            hasToken: !!TELEGRAM_BOT_TOKEN,
            hasGroupId: !!TELEGRAM_GROUP_ID
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

    if (opts.deepLink && opts.deepLink.leadId) {
        body.reply_markup = {
            inline_keyboard: [[{
                text: '📋 Open in dashboard',
                url: `${DASHBOARD_URL}/?lead=${encodeURIComponent(opts.deepLink.leadId)}`
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
        }
    } catch (err) {
        console.error('Telegram fetch error', err && err.message ? err.message : err);
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
