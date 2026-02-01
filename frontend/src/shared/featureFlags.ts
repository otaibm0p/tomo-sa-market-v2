const KEY_OPS_DIGEST = 'ff_ops_digest_enabled'

// Default flag shipped with the build
export const OPS_DIGEST_ENABLED = true

export function getOpsDigestEnabled(): boolean {
  try {
    const raw = localStorage.getItem(KEY_OPS_DIGEST)
    if (raw === '1') return true
    if (raw === '0') return false
  } catch {
    // ignore
  }
  return OPS_DIGEST_ENABLED
}

export function setOpsDigestEnabled(enabled: boolean) {
  try {
    localStorage.setItem(KEY_OPS_DIGEST, enabled ? '1' : '0')
  } catch {
    // ignore
  }
}

