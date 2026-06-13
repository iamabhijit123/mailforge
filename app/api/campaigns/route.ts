import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || ''
  const db = getDb()

  let query = 'SELECT c.*, cs.sent, cs.opens, cs.unique_opens, cs.clicks, cs.unique_clicks, cs.bounces, cs.unsubscribes FROM campaigns c LEFT JOIN campaign_stats cs ON cs.campaign_id = c.id WHERE c.user_id = ?'
  const params: unknown[] = [session.id]
  if (status) { query += ' AND c.status = ?'; params.push(status) }
  query += ' ORDER BY c.created_at DESC'

  return NextResponse.json(db.prepare(query).all(...params))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, subject, preview_text, from_name, from_email, reply_to, list_ids = [], blocks = [], html_body, template_id } = body
  if (!name || !subject) return NextResponse.json({ error: 'Name and subject are required' }, { status: 400 })

  const db = getDb()
  const settings = db.prepare('SELECT sender_name, sender_email FROM settings WHERE user_id = ?').get(session.id) as { sender_name: string; sender_email: string } | undefined
  const id = crypto.randomUUID()

  db.prepare('INSERT INTO campaigns (id, user_id, name, subject, preview_text, from_name, from_email, reply_to, list_ids, blocks, html_body, template_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, session.id, name.trim(), subject.trim(), preview_text || null,
      from_name || settings?.sender_name || '',
      from_email || settings?.sender_email || '',
      reply_to || null,
      JSON.stringify(list_ids), JSON.stringify(blocks), html_body || null, template_id || null)

  db.prepare('INSERT INTO campaign_stats (campaign_id) VALUES (?)').run(id)
  return NextResponse.json(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id), { status: 201 })
}
