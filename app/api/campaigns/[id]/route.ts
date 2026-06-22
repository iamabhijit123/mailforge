import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const campaign = db.prepare(`
    SELECT c.*, cs.* FROM campaigns c
    LEFT JOIN campaign_stats cs ON cs.campaign_id = c.id
    WHERE c.id = ? AND c.user_id = ?
  `).get(id, session.id)
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(campaign)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const campaign = db.prepare('SELECT id, status FROM campaigns WHERE id = ? AND user_id = ?').get(id, session.id) as { id: string; status: string } | undefined
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (campaign.status === 'sent') return NextResponse.json({ error: 'Cannot edit a sent campaign' }, { status: 400 })

  const body = await req.json()
  const fields = ['name', 'subject', 'preview_text', 'from_name', 'from_email', 'reply_to', 'cc_emails', 'list_ids', 'blocks', 'html_body', 'scheduled_at', 'status']
  const jsonFields = ['list_ids', 'blocks', 'cc_emails']
  const updates: string[] = []
  const values: unknown[] = []

  for (const f of fields) {
    if (f in body) {
      updates.push(`${f} = ?`)
      values.push(jsonFields.includes(f) ? JSON.stringify(body[f]) : body[f])
    }
  }
  if (updates.length) {
    updates.push("updated_at = datetime('now')")
    db.prepare(`UPDATE campaigns SET ${updates.join(', ')} WHERE id = ?`).run(...values, id)
  }

  return NextResponse.json(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
