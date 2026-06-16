import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()

  const contact = db.prepare('SELECT id, email FROM contacts WHERE id = ? AND user_id = ?').get(id, session.id) as { id: string; email: string } | undefined
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Sent emails (campaign_recipients)
  const sends = db.prepare(`
    SELECT cr.campaign_id, cr.sent_at as occurred_at, 'sent' as event_type, c.name as campaign_name, c.subject
    FROM campaign_recipients cr
    JOIN campaigns c ON c.id = cr.campaign_id
    WHERE cr.contact_id = ? OR cr.contact_email = ?
    ORDER BY cr.sent_at DESC
    LIMIT 50
  `).all(id, contact.email) as Array<{ campaign_id: string; occurred_at: string; event_type: string; campaign_name: string; subject: string }>

  // Email events (opens, clicks, bounces, unsubscribes)
  const events = db.prepare(`
    SELECT ee.campaign_id, ee.occurred_at, ee.event_type, c.name as campaign_name, c.subject, ee.link_url
    FROM email_events ee
    JOIN campaigns c ON c.id = ee.campaign_id
    WHERE (ee.contact_id = ? OR ee.contact_email = ?)
      AND ee.event_type != 'delivery'
    ORDER BY ee.occurred_at DESC
    LIMIT 100
  `).all(id, contact.email) as Array<{ campaign_id: string; occurred_at: string; event_type: string; campaign_name: string; subject: string; link_url?: string }>

  // Merge and sort by date
  const all = [...sends, ...events].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())

  // Insights (30 days)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const emailsSent = (db.prepare(`
    SELECT COUNT(*) as c FROM campaign_recipients cr
    WHERE (cr.contact_id = ? OR cr.contact_email = ?) AND cr.sent_at >= ?
  `).get(id, contact.email, since) as { c: number }).c

  const uniqueOpens = (db.prepare(`
    SELECT COUNT(DISTINCT campaign_id) as c FROM email_events
    WHERE (contact_id = ? OR contact_email = ?) AND event_type = 'open' AND occurred_at >= ?
  `).get(id, contact.email, since) as { c: number }).c

  const uniqueClicks = (db.prepare(`
    SELECT COUNT(DISTINCT campaign_id) as c FROM email_events
    WHERE (contact_id = ? OR contact_email = ?) AND event_type = 'click' AND occurred_at >= ?
  `).get(id, contact.email, since) as { c: number }).c

  const bounces = (db.prepare(`
    SELECT COUNT(*) as c FROM email_events
    WHERE (contact_id = ? OR contact_email = ?) AND event_type = 'bounce' AND occurred_at >= ?
  `).get(id, contact.email, since) as { c: number }).c

  const openRate = emailsSent > 0 ? Math.round((uniqueOpens / emailsSent) * 100) : 0
  const clickRate = emailsSent > 0 ? Math.round((uniqueClicks / emailsSent) * 100) : 0

  return NextResponse.json({
    activity: all,
    insights: { emails_sent: emailsSent, open_rate: openRate, click_rate: clickRate, bounces },
  })
}
