#!/usr/bin/env node
/**
 * Test WhatsApp provider (Meta Cloud API).
 * Does NOT run unless WHATSAPP_ACCESS_TOKEN is set.
 * Usage: node tools/dev/test-whatsapp-send.js [--send-to +9665xxxxxxxx]
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../backend/.env') });

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

if (!token || !phoneId) {
  console.log('SKIP: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set. No test run.');
  process.exit(0);
}

const provider = require('../../backend/providers/whatsappProvider');

async function main() {
  console.log('Configured:', provider.isConfigured());
  const healthResult = await provider.health();
  console.log('Health:', JSON.stringify(healthResult, null, 2));
  const sendTo = process.argv.includes('--send-to')
    ? process.argv[process.argv.indexOf('--send-to') + 1]
    : null;
  if (sendTo) {
    try {
      const toE164 = provider.normalizeE164(sendTo);
      const result = await provider.sendTemplate(toE164, 'hello_world', 'en', []);
      console.log('Send result:', result);
    } catch (e) {
      console.error(e.code === 'INVALID_PHONE' ? 'Invalid phone' : 'Send error:', e.message);
      process.exit(1);
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
