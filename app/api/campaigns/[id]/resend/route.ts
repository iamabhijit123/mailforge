import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { getAdminSettings } from '@/lib/admin'
import { sendBatch } from '@/lib/postmark'
import { generateEmailHtml, personalizeHtml } from '@/lib/email-html'
import { parseJsonSafe } from '@/lib/utils'
import { cleanSubject } from '@/lib/email-utils'

/** Returns wave history + current non-opener count (does NOT sync — call POST to sync+send). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const campaign = db.prepare('SELECT id, status FROM campaigns WHERE id = ? AND user_id = ?').get(id, session.id) as { id: string; status: string } | undefined
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const waves = db.prepare('SELECT * FROM campaign_resends WHERE campaign_id = ? ORDER BY wave_number ASC').all(id)

  const totalRecipients = (db.prepare('SELECT COUNT(*) as n FROM campaign_recipients WHERE campaign_id = ?').get(id) as { n: number }).n
  const totalOpened = (db.prepare(`SELECT COUNT(DISTINCT contact_email) as n FROM email_events WHERE campaign_id = ? AND event_type = 'open'`).get(id) as { n: number }).n
  const nonOpenerCount = Math.max(0, totalRecipients - totalOpened)

  return NextResponse.json({ waves, nonOpenerCount, totalRecipients, totalOpened })
}

/** Syncs Postmark opens, finds non-openers across all waves, sends to them, records new wave. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(id, session.id) as Record<string, unknown> | undefined
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (campaign.status !== 'sent') return NextResponse.json({ error: 'Campaign must be sent first' }, { status: 400 })

  const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(session.id) as Record<string, unknown> | undefined
  const adminSettings = getAdminSettings()
  const postmarkKey = adminSettings.postmark_api_key || (settings?.postmark_api_key as string) || process.env.POSTMARK_API_KEY
  if (!postmarkKey) return NextResponse.json({ error: 'Postmark API key not configured' }, { status: 400 })

  // ── Step 1: Sync opens from Postmark for ALL previous waves ────────────────
  const originalMsgIds = db.prepare(
    'SELECT contact_id, contact_email, postmark_message_id FROM campaign_recipients WHERE campaign_id = ? AND postmark_message_id IS NOT NULL'
  ).all(id) as Array<{ contact_id: string; contact_email: string; postmark_message_id: string }>

  const resendMsgIds = db.prepare(`
    SELECT crr.contact_id, crr.contact_email, crr.postmark_message_id
    FROM campaign_resend_recipients crr
    JOIN campaign_resends cr ON cr.id = crr.resend_id
    WHERE cr.campaign_id = ? AND crr.postmark_message_id IS NOT NULL
  `).all(id) as Array<{ contact_id: string; contact_email: string; postmark_message_id: string }>

  const insertEvent = db.prepare(
    'INSERT OR IGNORE INTO email_events (id, campaign_id, contact_id, contact_email, event_type, link_url, postmark_message_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )

  for (const r of [...originalMsgIds, ...resendMsgIds]) {
    try {
      const res = await fetch(`https://api.postmarkapp.com/messages/outbound/${r.postmark_message_id}/details`, {
        headers: { 'X-Postmark-Server-Token': postmarkKey, Accept: 'application/json' },
      })
      if (!res.ok) continue
      const data = await res.json() as { MessageEvents?: Array<{ Type: string; Details?: { Link?: string } }> }
      for (const e of data.MessageEvents || []) {
        const t = (e.Type || '').toLowerCase()
        const evType = t === 'opened' ? 'open'
          : (t === 'clicked' || t === 'linkclicked') ? 'click'
          : t === 'bounced' ? 'bounce'
          : null
        if (!evType) continue
        insertEvent.run(crypto.randomUUID(), id, r.contact_id || null, r.contact_email, evType, e.Details?.Link || null, r.postmark_message_id)
      }
    } catch { /* skip individual fetch errors */ }
  }

  // ── Step 2: Identify openers across all waves ──────────────────────────────
  const openerEmails = new Set<string>(
    (db.prepare(`SELECT DISTINCT contact_email FROM email_events WHERE campaign_id = ? AND event_type = 'open'`).all(id) as Array<{ contact_email: string }>).map(r => r.contact_email)
  )

  // ── Step 3: All recipients across every wave ───────────────────────────────
  const allRecipientEmails = new Set<string>([
    ...originalMsgIds.map(r => r.contact_email),
    ...resendMsgIds.map(r => r.contact_email),
  ])

  const nonOpenerEmails = [...allRecipientEmails].filter(e => !openerEmails.has(e))
  if (!nonOpenerEmails.length) {
    return NextResponse.json({ ok: false, message: 'Great news — everyone has opened this campaign! No non-openers remaining.' })
  }

  // ── Step 4: Get subscribed contact details ─────────────────────────────────
  const ph = nonOpenerEmails.map(() => '?').join(',')
  const contacts = db.prepare(`
    SELECT id, email, first_name, last_name FROM contacts
    WHERE user_id = ? AND email IN (${ph}) AND status = 'subscribed'
  `).all(session.id, ...nonOpenerEmails) as Array<{ id: string; email: string; first_name: string | null; last_name: string | null }>

  if (!contacts.length) return NextResponse.json({ ok: false, message: 'All non-openers have unsubscribed — no one to resend to.' })

  // ── Step 5: Build and send emails ─────────────────────────────────────────
  const maxWave = ((db.prepare('SELECT MAX(wave_number) as m FROM campaign_resends WHERE campaign_id = ?').get(id) as { m: number | null }).m) || 1
  const nextWave = maxWave + 1

  const blocks = parseJsonSafe(campaign.blocks as string, [])
  const companyInfo = settings ? [settings.company_name as string, settings.company_address as string].filter(Boolean).join(' · ') : ''
  const baseHtml = (campaign.html_body as string) || generateEmailHtml(blocks, {}, '{{unsubscribe_url}}', companyInfo)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const messageStream = (settings?.postmark_message_stream as string) || adminSettings.postmark_message_stream || 'broadcast'

  // Domain fallback
  const senderEmail = campaign.from_email as string
  const senderDomain = senderEmail.split('@')[1] || ''
  const domainVerified = senderDomain
    ? db.prepare('SELECT id FROM domain_verifications WHERE user_id = ? AND domain = ? AND status = ?').get(session.id, senderDomain, 'verified')
    : null
  let effectiveFromName = campaign.from_name as string
  let effectiveFromEmail = senderEmail
  let effectiveReplyTo = campaign.reply_to as string | undefined
  if (!domainVerified && adminSettings.default_sender_email) {
    effectiveFromName = adminSettings.default_sender_name || effectiveFromName
    effectiveFromEmail = adminSettings.default_sender_email
    effectiveReplyTo = effectiveReplyTo || senderEmail
  }

  const messages = contacts.map(contact => {
    const unsubUrl = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(contact.email)}&uid=${session.id}`
    return {
      From: `${effectiveFromName} <${effectiveFromEmail}>`,
      To: contact.email,
      Subject: cleanSubject(campaign.subject as string),
      HtmlBody: personalizeHtml(baseHtml, contact, unsubUrl),
      ReplyTo: effectiveReplyTo,
      MessageStream: messageStream,
      TrackOpens: true,
      Metadata: { campaign_id: id, contact_id: contact.id, wave: String(nextWave) },
    }
  })

  try {
    const results = await sendBatch(postmarkKey, messages)
    const sent = results.filter(r => r?.ErrorCode === 0).length

    const resendId = crypto.randomUUID()
    db.prepare(`
      INSERT INTO campaign_resends (id, campaign_id, wave_number, status, sent_count, sent_at)
      VALUES (?, ?, ?, 'sent', ?, datetime('now'))
    `).run(resendId, id, nextWave, sent)

    const insertRR = db.prepare(
      'INSERT INTO campaign_resend_recipients (id, resend_id, contact_id, contact_email, postmark_message_id) VALUES (?, ?, ?, ?, ?)'
    )
    db.transaction(() => {
      for (let i = 0; i < contacts.length; i++) {
        insertRR.run(crypto.randomUUID(), resendId, contacts[i].id, contacts[i].email, results[i]?.MessageID || null)
      }
    })()

    return NextResponse.json({ ok: true, wave: nextWave, sent, totalNonOpeners: nonOpenerEmails.length, resendId })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
