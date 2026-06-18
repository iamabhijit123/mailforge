import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()

  const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(session.id) as Record<string, unknown> | undefined
  const postmarkKey = (settings?.postmark_api_key as string) || process.env.POSTMARK_API_KEY
  if (!postmarkKey) return NextResponse.json({ error: 'Postmark API key not configured' }, { status: 400 })

  // Check all recipients including those without message IDs for diagnostics
  const allRecipients = db.prepare(
    'SELECT contact_id, contact_email, postmark_message_id FROM campaign_recipients WHERE campaign_id = ?'
  ).all(id) as Array<{ contact_id: string; contact_email: string; postmark_message_id: string | null }>

  const recipients = allRecipients.filter(r => r.postmark_message_id)

  if (!allRecipients.length) {
    return NextResponse.json({ ok: false, error: 'No recipients found for this campaign in the database. This campaign may have been sent before recipient tracking was added.' })
  }

  if (!recipients.length) {
    return NextResponse.json({ ok: false, error: `Found ${allRecipients.length} recipient(s) but none have a Postmark message ID stored. The email may have failed to send.` })
  }

  let totalOpens = 0, uniqueOpens = 0, totalClicks = 0, uniqueClicks = 0
  let bounces = 0, unsubscribes = 0, delivered = 0, spamComplaints = 0
  let synced = 0
  const apiErrors: string[] = []
  const eventsSeen: string[] = []

  const insertEvent = db.prepare(
    'INSERT OR IGNORE INTO email_events (id, campaign_id, contact_id, contact_email, event_type, link_url, postmark_message_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )

  for (const r of recipients) {
    const res = await fetch(`https://api.postmarkapp.com/messages/outbound/${r.postmark_message_id}/details`, {
      headers: { 'X-Postmark-Server-Token': postmarkKey, 'Accept': 'application/json' },
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      apiErrors.push(`Message ${r.postmark_message_id}: HTTP ${res.status} — ${errText.slice(0, 200)}`)
      continue
    }

    const data = await res.json() as { MessageEvents?: Array<{ Type: string; Details?: { Link?: string } }> }
    const events = data.MessageEvents || []

    // Collect all raw event types for diagnostics
    for (const e of events) {
      if (!eventsSeen.includes(e.Type)) eventsSeen.push(e.Type)
    }

    let recipientOpened = false, recipientClicked = false

    for (const e of events) {
      const t = (e.Type || '').toLowerCase()
      const eventType = t === 'opened' ? 'open'
        : t === 'clicked' || t === 'linkclicked' || t === 'linkclick' ? 'click'
        : t === 'bounced' || t === 'failed' ? 'bounce'
        : t === 'delivered' ? 'delivery'
        : t === 'spamcomplaint' ? 'spam'
        : t === 'subscriptionchange' || t === 'subscriptionchanged' ? 'unsubscribe'
        : null

      if (!eventType) continue

      const linkUrl = e.Details?.Link || null
      insertEvent.run(crypto.randomUUID(), id, r.contact_id || null, r.contact_email, eventType, linkUrl, r.postmark_message_id)

      if (eventType === 'open') { totalOpens++; if (!recipientOpened) { uniqueOpens++; recipientOpened = true } }
      if (eventType === 'click') { totalClicks++; if (!recipientClicked) { uniqueClicks++; recipientClicked = true } }
      if (eventType === 'bounce') bounces++
      if (eventType === 'delivery') delivered++
      if (eventType === 'spam') spamComplaints++
      if (eventType === 'unsubscribe') unsubscribes++
    }
    synced++
  }

  if (synced > 0) {
    db.prepare(`
      UPDATE campaign_stats
      SET opens = ?, unique_opens = ?, clicks = ?, unique_clicks = ?, bounces = ?, unsubscribes = ?, delivered = ?, spam_complaints = ?
      WHERE campaign_id = ?
    `).run(totalOpens, uniqueOpens, totalClicks, uniqueClicks, bounces, unsubscribes, delivered, spamComplaints, id)
  }

  return NextResponse.json({
    ok: synced > 0 || apiErrors.length === 0,
    synced,
    stats: { uniqueOpens, uniqueClicks, bounces, delivered, unsubscribes },
    debug: {
      totalRecipients: allRecipients.length,
      withMessageId: recipients.length,
      apiErrors,
      eventTypesFromPostmark: eventsSeen,
    },
  })
}
