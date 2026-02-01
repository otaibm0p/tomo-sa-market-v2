/**
 * WhatsApp provider – Meta Cloud API.
 * Reads env ONLY: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_WABA_ID (optional),
 * WHATSAPP_API_VERSION (default v20.0), WHATSAPP_WEBHOOK_VERIFY_TOKEN.
 * No messages sent until ACCESS_TOKEN and PHONE_NUMBER_ID are set.
 */

const https = require('https');

const NOT_CONFIGURED = 'NOT_CONFIGURED';
const INVALID_PHONE = 'INVALID_PHONE';

function getVersion() {
  const v = process.env.WHATSAPP_API_VERSION;
  return (typeof v === 'string' && v.trim()) ? v.trim() : 'v20.0';
}

function getPhoneNumberId() {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

function isConfigured() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = getPhoneNumberId();
  return typeof token === 'string' && token.trim().length > 0 && phoneId;
}

/**
 * Normalize to E.164. Accepts KSA local (05xxxxxxxx) -> +9665xxxxxxxx.
 * Strips spaces/dashes; ensures leading + and digits only.
 * @param {string} input - Raw phone input
 * @returns {string} E.164 (e.g. +9665xxxxxxxx)
 * @throws {Error} INVALID_PHONE if invalid
 */
function normalizeE164(input) {
  if (input == null || typeof input !== 'string') {
    const err = new Error('Invalid phone: missing or not a string');
    err.code = INVALID_PHONE;
    throw err;
  }
  let s = input.trim().replace(/\s+/g, '').replace(/-/g, '');
  if (!s) {
    const err = new Error('Invalid phone: empty');
    err.code = INVALID_PHONE;
    throw err;
  }
  if (s.startsWith('+')) {
    s = s.slice(1);
  } else if (s.startsWith('00')) {
    s = s.slice(2);
  } else if (s.startsWith('0') && s.length >= 10) {
    // KSA local 05xxxxxxxx -> 9665xxxxxxxx
    s = '966' + s.slice(1);
  } else if (s.length >= 9 && s.length <= 10 && /^[0-9]+$/.test(s)) {
    // Assume KSA 5xxxxxxxx or 9 digits
    if (s.startsWith('5')) s = '966' + s;
    else if (!s.startsWith('966')) s = '966' + s;
  }
  if (!/^[0-9]{10,15}$/.test(s)) {
    const err = new Error('Invalid phone: must be E.164 (digits only, 10–15 chars after +)');
    err.code = INVALID_PHONE;
    throw err;
  }
  if (!s.startsWith('966')) {
    const err = new Error('Invalid phone: only Saudi (+966) supported for now');
    err.code = INVALID_PHONE;
    throw err;
  }
  return '+' + s;
}

/**
 * POST to Meta Graph API.
 */
function graphRequest(method, path, body) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    const err = new Error('WhatsApp not configured: WHATSAPP_ACCESS_TOKEN missing');
    err.code = NOT_CONFIGURED;
    throw err;
  }
  const version = getVersion();
  const url = `https://graph.facebook.com/${version}${path}`;
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (ch) => { data += ch; });
      res.on('end', () => {
        let json;
        try { json = data ? JSON.parse(data) : {}; } catch (e) { json = {}; }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(json);
        } else {
          const err = new Error(json.error?.message || data || `HTTP ${res.statusCode}`);
          err.code = json.error?.code || 'API_ERROR';
          err.statusCode = res.statusCode;
          reject(err);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Send template message via Meta Cloud API.
 * @param {string} toE164 - E.164 (use normalizeE164 first)
 * @param {string} templateName - Template name in Meta
 * @param {string} [languageCode] - e.g. "ar", "en"
 * @param {Array} [components] - Template components (buttons, body params, etc.)
 * @returns {Promise<{ provider_message_id: string }>}
 */
async function sendTemplate(toE164, templateName, languageCode = 'ar', components = []) {
  if (!isConfigured()) {
    const err = new Error('WhatsApp not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.');
    err.code = NOT_CONFIGURED;
    throw err;
  }
  const normalized = normalizeE164(toE164);
  const phoneId = getPhoneNumberId();
  const body = {
    messaging_product: 'whatsapp',
    to: normalized.replace(/^\+/, ''),
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: components && components.length ? components : [],
    },
  };
  const res = await graphRequest('POST', `/${phoneId}/messages`, body);
  const messageId = res.messages && res.messages[0] && res.messages[0].id;
  return { provider_message_id: messageId || null };
}

/**
 * Health check. GET phone number info.
 * @returns {Promise<{ ok: boolean, configured: boolean, verified_name?: string, display_phone_number?: string }>}
 */
async function health() {
  const configured = isConfigured();
  if (!configured) {
    return { ok: true, configured: false };
  }
  try {
    const phoneId = getPhoneNumberId();
    const res = await graphRequest('GET', `/${phoneId}?fields=verified_name,display_phone_number`, null);
    return {
      ok: true,
      configured: true,
      verified_name: res.verified_name || null,
      display_phone_number: res.display_phone_number || null,
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      error: err.message || 'Health check failed',
    };
  }
}

function getWebhookVerifyToken() {
  const t = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  return typeof t === 'string' && t.trim() ? t.trim() : null;
}

module.exports = {
  isConfigured,
  normalizeE164,
  sendTemplate,
  health,
  getVersion,
  getPhoneNumberId,
  getWebhookVerifyToken,
  NOT_CONFIGURED,
  INVALID_PHONE,
};
