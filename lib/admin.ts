import { getDb } from './db'
import { SessionUser } from './auth'

export function isAdmin(session: SessionUser): boolean {
  if (process.env.ADMIN_EMAIL && session.email === process.env.ADMIN_EMAIL) return true
  try {
    const user = getDb().prepare('SELECT is_admin FROM users WHERE id = ?').get(session.memberId) as { is_admin?: number } | undefined
    return user?.is_admin === 1
  } catch { return false }
}

export function getAdminSettings() {
  const rows = getDb().prepare('SELECT key, value FROM admin_settings').all() as { key: string; value: string }[]
  const s: Record<string, string> = {}
  for (const r of rows) s[r.key] = r.value
  return {
    postmark_api_key: s.postmark_api_key || process.env.POSTMARK_API_KEY || '',
    // Account API token — needed for domain management (POST/DELETE /domains, verifyDkim)
    // Different from the Server token used for sending; get it from Postmark → My Account → API Tokens
    postmark_account_api_key: s.postmark_account_api_key || process.env.POSTMARK_ACCOUNT_API_KEY || '',
    anthropic_api_key: s.anthropic_api_key || process.env.ANTHROPIC_API_KEY || '',
    postmark_message_stream: s.postmark_message_stream || 'broadcast',
    default_sender_name: s.default_sender_name || '',
    default_sender_email: s.default_sender_email || '',
  }
}

export function setAdminSetting(key: string, value: string) {
  getDb().prepare(
    `INSERT INTO admin_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  ).run(key, value)
}
