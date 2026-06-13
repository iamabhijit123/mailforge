import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()

    const totalContacts = (db.prepare("SELECT COUNT(*) as c FROM contacts WHERE user_id = ? AND status = 'subscribed'").get(session.id) as { c: number }).c
    const totalCampaigns = (db.prepare('SELECT COUNT(*) as c FROM campaigns WHERE user_id = ?').get(session.id) as { c: number }).c
    const sentCampaigns = (db.prepare("SELECT COUNT(*) as c FROM campaigns WHERE user_id = ? AND status = 'sent'").get(session.id) as { c: number }).c

    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(cs.sent), 0) as total_sent,
        COALESCE(SUM(cs.unique_opens), 0) as total_opens,
        COALESCE(SUM(cs.unique_clicks), 0) as total_clicks,
        COALESCE(SUM(cs.bounces), 0) as total_bounces,
        COALESCE(SUM(cs.unsubscribes), 0) as total_unsubscribes
      FROM campaigns c
      JOIN campaign_stats cs ON cs.campaign_id = c.id
      WHERE c.user_id = ?
    `).get(session.id) as Record<string, number> | null

    const recentCampaigns = db.prepare(`
      SELECT c.id, c.name, c.subject, c.sent_at, c.status,
        cs.sent, cs.unique_opens, cs.unique_clicks, cs.bounces
      FROM campaigns c
      LEFT JOIN campaign_stats cs ON cs.campaign_id = c.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
      LIMIT 10
    `).all(session.id)

    const contactGrowth = db.prepare(`
      SELECT date(created_at) as date, COUNT(*) as new_contacts
      FROM contacts WHERE user_id = ?
      AND created_at >= date('now', '-30 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all(session.id)

    const opensByDay = db.prepare(`
      SELECT date(e.occurred_at) as date, COUNT(*) as opens
      FROM email_events e
      JOIN campaigns c ON c.id = e.campaign_id
      WHERE c.user_id = ? AND e.event_type = 'open'
      AND e.occurred_at >= date('now', '-30 days')
      GROUP BY date(e.occurred_at)
      ORDER BY date ASC
    `).all(session.id)

    return NextResponse.json({
      totalContacts,
      totalCampaigns,
      sentCampaigns,
      totals: totals || { total_sent: 0, total_opens: 0, total_clicks: 0, total_bounces: 0, total_unsubscribes: 0 },
      recentCampaigns,
      contactGrowth,
      opensByDay,
    })
  } catch (err) {
    console.error('[analytics GET]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
