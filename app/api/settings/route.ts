import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(session.id) as Record<string, unknown> | undefined
  const merged = { ...(settings || {}) }
  // Fall back to env vars if not yet saved by user
  if (!merged.postmark_api_key) merged.postmark_api_key = process.env.POSTMARK_API_KEY || ''
  if (!merged.anthropic_api_key) merged.anthropic_api_key = process.env.ANTHROPIC_API_KEY || ''
  return NextResponse.json(merged)
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = getDb()
  const fields = [
    'postmark_api_key', 'postmark_message_stream', 'sender_name', 'sender_email', 'reply_to',
    'company_name', 'company_address', 'website', 'logo_url', 'anthropic_api_key',
    'phone', 'timezone', 'signature_image_url', 'privacy_policy_url',
    'footer_show_update_profile', 'footer_show_unsubscribe_comment', 'footer_fine_print',
  ]
  const updates = fields.filter(f => f in body).map(f => `${f} = ?`).join(', ')
  const values = fields.filter(f => f in body).map(f => body[f])

  // Ensure row exists before updating
  db.prepare(`INSERT OR IGNORE INTO settings (user_id) VALUES (?)`).run(session.id)

  if (updates) {
    db.prepare(`UPDATE settings SET ${updates} WHERE user_id = ?`).run(...values, session.id)
  }

  const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(session.id)
  return NextResponse.json(settings)
}
