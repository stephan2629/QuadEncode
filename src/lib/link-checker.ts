// Validates a resource URL before it's saved into a learning path. Broken
// links (404s, dead domains) are the single biggest trust-killer in an
// AI-curated path, so every resource gets checked here rather than trusted
// on the model's word.
const TIMEOUT_MS = 5000
// 403 counts as live: Udemy and other bot-protected hosts answer 403 to a
// server-side fetch with no browser fingerprint, inconsistently, while the
// page itself loads fine for a person. A genuinely dead URL on those same
// hosts still returns 404, which stays rejected. Without this every paid
// (Udemy-only) course step is emptied by its own link check.
const OK_STATUSES = new Set([200, 301, 302, 403])

async function attempt(url: string, method: 'HEAD' | 'GET'): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { method, redirect: 'manual', signal: controller.signal })
    return OK_STATUSES.has(res.status)
  } finally {
    clearTimeout(timeout)
  }
}

export async function checkLinkStatus(url: string): Promise<boolean> {
  try {
    new URL(url)
  } catch {
    return false
  }

  try {
    if (await attempt(url, 'HEAD')) return true
  } catch {
    // ponytail: some servers (Cloudflare-fronted sites, etc.) reject HEAD
    // outright or hang; fall through to a real GET instead of failing them.
  }

  try {
    return await attempt(url, 'GET')
  } catch {
    return false
  }
}
