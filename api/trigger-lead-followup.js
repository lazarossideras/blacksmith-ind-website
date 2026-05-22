// Vercel serverless function - schedules the trigger.dev `lead-submitted` task
// after the qualify form successfully writes a row to Supabase.
//
// The qualify page POSTs here with { qualification_id }. We re-validate the row
// exists in Supabase (cheap defense against spam) and then fire the task.
//
// We do NOT use the trigger.dev SDK here because pulling it adds ~3 MB to the
// function bundle just to make one HTTPS call. The Trigger.dev v3 HTTP API is
// straightforward enough to call directly with fetch.

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TRIGGER_SECRET_KEY = process.env.TRIGGER_SECRET_KEY;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readJson(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString('utf8');
    return text ? JSON.parse(text) : {};
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', 'https://blacksmith-ind.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TRIGGER_SECRET_KEY) {
        console.error('trigger-lead-followup misconfigured: missing env vars');
        return res.status(500).json({ error: 'Server misconfigured' });
    }

    let body;
    try {
        body = await readJson(req);
    } catch {
        return res.status(400).json({ error: 'Invalid JSON' });
    }

    const qualificationId = body && typeof body.qualification_id === 'string'
        ? body.qualification_id.trim()
        : '';
    if (!UUID_RE.test(qualificationId)) {
        return res.status(400).json({ error: 'Missing or invalid qualification_id' });
    }

    // Cheap spam defense: confirm the row actually exists in Supabase before firing the task
    try {
        const supabaseRes = await fetch(
            `${SUPABASE_URL}/rest/v1/lead_qualifications?id=eq.${encodeURIComponent(qualificationId)}&select=id`,
            {
                headers: {
                    'apikey': SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                }
            }
        );
        if (!supabaseRes.ok) {
            const txt = await supabaseRes.text().catch(() => '');
            console.error('Supabase lookup failed', supabaseRes.status, txt);
            return res.status(502).json({ error: 'Could not verify qualification' });
        }
        const rows = await supabaseRes.json();
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(404).json({ error: 'Qualification not found' });
        }
    } catch (err) {
        console.error('Supabase verify error', err);
        return res.status(502).json({ error: 'Supabase unreachable' });
    }

    // Fire the trigger.dev task via the v3 HTTP API
    try {
        const idempotencyKey = `lead-submitted-${qualificationId}`;
        const triggerRes = await fetch('https://api.trigger.dev/api/v1/tasks/lead-submitted/trigger', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TRIGGER_SECRET_KEY}`,
                'Content-Type': 'application/json',
                'Idempotency-Key': idempotencyKey
            },
            body: JSON.stringify({
                payload: { qualification_id: qualificationId }
            })
        });

        if (!triggerRes.ok) {
            const txt = await triggerRes.text().catch(() => '');
            console.error('trigger.dev API rejected', triggerRes.status, txt);
            return res.status(502).json({ error: 'Could not schedule follow-up' });
        }

        const data = await triggerRes.json().catch(() => ({}));
        console.log('lead-submitted scheduled', {
            qualification_id: qualificationId,
            run_id: data.id || data.runId || null
        });
        return res.status(202).json({ ok: true, run_id: data.id || data.runId || null });
    } catch (err) {
        console.error('trigger.dev call error', err);
        return res.status(502).json({ error: 'trigger.dev unreachable' });
    }
};

module.exports.config = { api: { bodyParser: false } };
