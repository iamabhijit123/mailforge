import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = getDb()

  const campaignId = body.Metadata?.campaign_id || body.metadata?.campaign_id
  const contactId = body.Metadata?.contact_id || body.metadata?.contact_id
  const email = body.Recipient || body.Email || ''
  const messageId = body.MessageID || ''
  const eventType = detectEventType(body)

  if (!eventType || !email) return NextResponse.json({ ok: true })

  const eventId = crypto.randomUUID()
  const linkUrl = body.OriginalLink || body.Link || null

  db.prepare('INSERT OR IGNORE INTO email_events (id, campaign_id, contact_id, contact_email, event_type, link_url, postmark_message_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    eventId, campaignId || 'unknown', contactId || null, email, eventType, linkUrl, messageId
  )

  if (campaignId) {
    const updates: Record<string, string> = {
      open: 'opens = opens + 1, unique_opens = unique_opens + 1',
      click: 'clicks = clicks + 1, unique_clicks = unique_clicks + 1',
      bounce: 'bounces = bounces + 1',
      unsubscribe: 'unsubscribes = unsubscribes + 1',
      spam: 'spam_complaints = spam_complaints + 1',
      delivery: 'delivered = delivered + 1',
    }
    if (updates[eventType]) {
      db.prepare(`UPDATE campaign_stats SET ${updates[eventType]} WHERE campaign_id = ?`).run(campaignId)
    }
  }

  if (email) {
    if (eventType === 'bounce' || eventType === 'spam') {
      db.prepare(`UPDATE contacts SET status = ?, updated_at = datetime('now') WHERE email = ?`).run(
        eventType === 'spam' ? 'spam' : 'bounced', email.toLowerCase()
      )
    }
    if (eventType === 'unsubscribe') {
      db.prepare(`UPDATE contacts SET status = 'unsubscribed', updated_at = datetime('now') WHERE email = ?`).run(email.toLowerCase())
    }
  }

  return NextResponse.json({ ok: true })
}

function detectEventType(body: Record<string, unknown>): string | null {
  if (body.RecordType === 'Open') return 'open'
  if (body.RecordType === 'Click') return 'click'
  if (body.RecordType === 'Bounce') return 'bounce'
  if (body.RecordType === 'SpamComplaint') return 'spam'
  if (body.RecordType === 'Delivery') return 'delivery'
  if (body.RecordType === 'SubscriptionChange' && body.SuppressSending) return 'unsubscribe'
  return null
}
