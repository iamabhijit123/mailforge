import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const campaign = db.prepare(`
    SELECT rc.*, tf.name as folder_name
    FROM recurring_campaigns rc
    LEFT JOIN template_folders tf ON tf.id = rc.template_folder_id
    WHERE rc.id = ? AND rc.user_id = ?
  `).get(id, session.id)
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const sends = db.prepare(`
    SELECT rs.*, t.name as template_name
    FROM recurring_sends rs
    LEFT JOIN templates t ON t.id = rs.template_id
    WHERE rs.recurring_campaign_id = ?
    ORDER BY rs.scheduled_at ASC
  `).all(id)

  // Count unique subscribed contacts across the campaign's lists (dynamic — reflects current list state)
  const rc = campaign as Record<string, unknown>
  let contactCount = 0
  let listNames: string[] = []
  try {
    const listIds: string[] = JSON.parse(rc.list_ids as string || '[]')
    if (listIds.length > 0) {
      const ph = listIds.map(() => '?').join(',')
      const r = db.prepare(`SELECT COUNT(DISTINCT c.id) as n FROM contacts c JOIN contact_lists cl ON cl.contact_id = c.id WHERE cl.list_id IN (${ph}) AND c.status = 'subscribed' AND c.user_id = ?`).get(...listIds, session.id) as { n: number }
      contactCount = r.n
      const lists = db.prepare(`SELECT name FROM lists WHERE id IN (${ph})`).all(...listIds) as Array<{ name: string }>
      listNames = lists.map(l => l.name)
    }
  } catch { /* ignore */ }

  return NextResponse.json({ campaign, sends, contactCount, listNames })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const rc = db.prepare('SELECT id FROM recurring_campaigns WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!rc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const allowed = ['name', 'subject', 'from_name', 'from_email', 'reply_to', 'status']
  const updates: string[] = ["updated_at = datetime('now')"]
  const values: unknown[] = []
  for (const k of allowed) {
    if (k in body) { updates.push(`${k} = ?`); values.push(body[k]) }
  }
  if (updates.length > 1) db.prepare(`UPDATE recurring_campaigns SET ${updates.join(', ')} WHERE id = ?`).run(...values, id)
  return NextResponse.json(db.prepare('SELECT * FROM recurring_campaigns WHERE id = ?').get(id))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const rc = db.prepare('SELECT id FROM recurring_campaigns WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!rc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  db.prepare('DELETE FROM recurring_campaigns WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
