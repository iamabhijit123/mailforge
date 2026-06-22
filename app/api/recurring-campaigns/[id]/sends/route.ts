import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const rc = db.prepare('SELECT id FROM recurring_campaigns WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!rc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const sends = db.prepare(`
    SELECT rs.*, t.name as template_name
    FROM recurring_sends rs
    LEFT JOIN templates t ON t.id = rs.template_id
    WHERE rs.recurring_campaign_id = ?
    ORDER BY rs.scheduled_at ASC
  `).all(id)
  return NextResponse.json(sends)
}

// PATCH /api/recurring-campaigns/[id]/sends — adjust a single send's date/time
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const rc = db.prepare('SELECT id FROM recurring_campaigns WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!rc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { send_id, scheduled_at, scheduled_date, scheduled_time } = await req.json()
  if (!send_id || !scheduled_at) return NextResponse.json({ error: 'send_id and scheduled_at required' }, { status: 400 })

  db.prepare('UPDATE recurring_sends SET scheduled_at = ?, scheduled_date = ?, scheduled_time = ?, is_adjusted = 1 WHERE id = ? AND recurring_campaign_id = ?')
    .run(scheduled_at, scheduled_date || scheduled_at.slice(0, 10), scheduled_time || scheduled_at.slice(11, 16), send_id, id)

  return NextResponse.json({ ok: true })
}
