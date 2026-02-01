#!/usr/bin/env node
/**
 * Generate minimal placeholder PNGs for Expo assets if missing.
 * Run: node scripts/generate-placeholder-assets.js
 */
const fs = require('fs')
const path = require('path')

const ASSETS_DIR = path.join(__dirname, '..', 'assets')

// Minimal 1x1 green PNG (TOMO #047857-ish) as base64
const MINIMAL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const files = ['icon.png', 'splash.png', 'adaptive-icon.png']

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true })
}

const buf = Buffer.from(MINIMAL_PNG_BASE64, 'base64')

for (const file of files) {
  const p = path.join(ASSETS_DIR, file)
  if (!fs.existsSync(p) || fs.statSync(p).size === 0) {
    fs.writeFileSync(p, buf)
    console.log('Created:', p)
  }
}

console.log('Done. Replace with real 1024x1024 PNGs for production.')
