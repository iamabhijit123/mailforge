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

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { ids, delete_all, status_filter } = body
  const db = getDb()

  // "Delete all" path — uses subquery so no SQL variable limit
  if (delete_all) {
    const params: unknown[] = [session.id]
    let extra = ''
    if (status_filter) { extra = ' AND status = ?'; params.push(status_filter) }
    db.prepare(`DELETE FROM campaign_stats WHERE campaign_id IN (SELECT id FROM campaigns WHERE user_id = ?${extra})`).run(...params)
    const r = db.prepare(`DELETE FROM campaigns WHERE user_id = ?${extra}`).run(...params)
    return NextResponse.json({ ok: true, deleted: r.changes })
  }

  // Specific IDs path — batch in groups of 500 to stay under SQLite's 999-variable limit
  if (ids && Array.isArray(ids) && ids.length > 0) {
    const BATCH = 500
    let deleted = 0
    const tx = db.transaction(() => {
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = (ids as string[]).slice(i, i + BATCH)
        const ph = batch.map(() => '?').join(',')
        db.prepare(`DELETE FROM campaign_stats WHERE campaign_id IN (${ph})`).run(...batch)
        const r = db.prepare(`DELETE FROM campaigns WHERE id IN (${ph}) AND user_id = ?`).run(...batch, session.id)
        deleted += r.changes
      }
    })
    tx()
    return NextResponse.json({ ok: true, deleted })
  }

  return NextResponse.json({ error: 'Provide ids or delete_all=true' }, { status: 400 })
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
