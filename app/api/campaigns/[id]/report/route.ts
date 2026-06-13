import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const db = getDb()
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const stats = db.prepare('SELECT * FROM campaign_stats WHERE campaign_id = ?').get(id)

  const topLinks = db.prepare(`
    SELECT link_url, COUNT(*) as clicks
    FROM email_events
    WHERE campaign_id = ? AND event_type = 'click'
    GROUP BY link_url
    ORDER BY clicks DESC
    LIMIT 10
  `).all(id)

  const opensByDay = db.prepare(`
    SELECT date(occurred_at) as date, COUNT(*) as opens
    FROM email_events
    WHERE campaign_id = ? AND event_type = 'open'
    GROUP BY date(occurred_at)
    ORDER BY date ASC
  `).all(id)

  const recentActivity = db.prepare(`
    SELECT * FROM email_events
    WHERE campaign_id = ?
    ORDER BY occurred_at DESC
    LIMIT 50
  `).all(id)

  return NextResponse.json({ campaign, stats, topLinks, opensByDay, recentActivity })
}
