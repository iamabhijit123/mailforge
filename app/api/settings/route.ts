import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(session.id) as Record<string, unknown> | undefined
  return NextResponse.json(settings || {})
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = getDb()
  const fields = ['postmark_api_key', 'postmark_message_stream', 'sender_name', 'sender_email', 'reply_to', 'company_name', 'company_address', 'website', 'logo_url', 'anthropic_api_key']
  const updates = fields.filter(f => f in body).map(f => `${f} = ?`).join(', ')
  const values = fields.filter(f => f in body).map(f => body[f])

  if (updates) {
    db.prepare(`UPDATE settings SET ${updates} WHERE user_id = ?`).run(...values, session.id)
  }

  const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(session.id)
  return NextResponse.json(settings)
}
