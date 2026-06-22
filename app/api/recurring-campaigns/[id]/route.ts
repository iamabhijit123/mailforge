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

  return NextResponse.json({ campaign, sends })
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
