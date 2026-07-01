import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const scheduled = db.prepare(`
    SELECT sc.*, c.name as campaign_name, c.subject
    FROM scheduled_campaigns sc
    JOIN campaigns c ON c.id = sc.campaign_id
    WHERE sc.user_id = ?
    ORDER BY sc.scheduled_at ASC
  `).all(session.id)
  return NextResponse.json(scheduled)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { campaign_id, scheduled_at, list_ids, auto_resend_after_hours = 0 } = body
  if (!campaign_id || !scheduled_at) return NextResponse.json({ error: 'campaign_id and scheduled_at required' }, { status: 400 })
  const db = getDb()
  const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ? AND user_id = ?').get(campaign_id, session.id)
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  if (list_ids && Array.isArray(list_ids) && list_ids.length > 0) {
    db.prepare('UPDATE campaigns SET list_ids = ? WHERE id = ? AND user_id = ?').run(JSON.stringify(list_ids), campaign_id, session.id)
  }

  const resendHours = Number(auto_resend_after_hours) || 0

  const existing = db.prepare("SELECT id FROM scheduled_campaigns WHERE campaign_id = ? AND status = 'pending' AND is_auto_resend = 0").get(campaign_id)
  if (existing) {
    db.prepare("UPDATE scheduled_campaigns SET scheduled_at = ?, auto_resend_after_hours = ? WHERE campaign_id = ? AND status = 'pending' AND is_auto_resend = 0").run(scheduled_at, resendHours, campaign_id)
    db.prepare("UPDATE campaigns SET scheduled_at = ? WHERE id = ?").run(scheduled_at, campaign_id)
    return NextResponse.json({ ok: true, rescheduled: true })
  }
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO scheduled_campaigns (id, user_id, campaign_id, scheduled_at, auto_resend_after_hours) VALUES (?, ?, ?, ?, ?)').run(id, session.id, campaign_id, scheduled_at, resendHours)
  db.prepare("UPDATE campaigns SET scheduled_at = ?, status = 'scheduled' WHERE id = ?").run(scheduled_at, campaign_id)
  return NextResponse.json({ id, ok: true }, { status: 201 })
}
