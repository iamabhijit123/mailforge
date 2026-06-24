import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { getAdminSettings } from '@/lib/admin'
import { sendBatch } from '@/lib/postmark'
import { generateEmailHtml, personalizeHtml } from '@/lib/email-html'
import { parseJsonSafe } from '@/lib/utils'
import { cleanSubject } from '@/lib/email-utils'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const db = getDb()

  // SaaS gate: check workspace is active and has API access
  const owner = db.prepare('SELECT is_disabled, api_access_enabled FROM users WHERE id = ?').get(session.id) as { is_disabled?: number; api_access_enabled?: number } | undefined
  if (owner?.is_disabled === 1) return NextResponse.json({ error: 'This account has been disabled. Contact support.' }, { status: 403 })
  if (owner?.api_access_enabled === 0) return NextResponse.json({ error: 'API access has been revoked for this account. Contact support.' }, { status: 403 })

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(id, session.id) as Record<string, unknown> | undefined
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (campaign.status === 'sent') return NextResponse.json({ error: 'Already sent' }, { status: 400 })

  const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(session.id) as Record<string, unknown> | undefined

  // Use admin Postmark key (fall back to workspace key for existing self-hosted setups)
  const adminSettings = getAdminSettings()
  const postmarkKey = adminSettings.postmark_api_key || (settings?.postmark_api_key as string) || process.env.POSTMARK_API_KEY
  if (!postmarkKey) return NextResponse.json({ error: 'Postmark API key not configured. Contact your administrator.' }, { status: 400 })
  if (!campaign.from_email) return NextResponse.json({ error: 'Sender email not set on campaign' }, { status: 400 })

  let body: { list_ids?: string[] } = {}
  try { body = await req.json() } catch { /* no body */ }
  if (body.list_ids?.length) {
    db.prepare('UPDATE campaigns SET list_ids = ? WHERE id = ? AND user_id = ?').run(JSON.stringify(body.list_ids), id, session.id)
    campaign.list_ids = JSON.stringify(body.list_ids)
  }

  const listIds = parseJsonSafe<string[]>(campaign.list_ids as string, [])
  if (!listIds.length) return NextResponse.json({ error: 'No lists selected' }, { status: 400 })

  const contacts = db.prepare(`
    SELECT DISTINCT c.id, c.email, c.first_name, c.last_name
    FROM contacts c
    JOIN contact_lists cl ON cl.contact_id = c.id
    WHERE cl.list_id IN (${listIds.map(() => '?').join(',')})
      AND c.status = 'subscribed'
      AND c.user_id = ?
  `).all(...listIds, session.id) as Array<{ id: string; email: string; first_name: string | null; last_name: string | null }>

  if (!contacts.length) return NextResponse.json({ error: 'No subscribed contacts in selected lists' }, { status: 400 })

  // Domain verification check
  const senderEmail = campaign.from_email as string
  const senderDomain = senderEmail.split('@')[1] || ''
  const domainVerified = senderDomain
    ? db.prepare('SELECT id FROM domain_verifications WHERE user_id = ? AND domain = ? AND status = ?').get(session.id, senderDomain, 'verified')
    : null

  // If domain not verified and admin has a default sender, fall back to it
  let effectiveFromName = campaign.from_name as string
  let effectiveFromEmail = senderEmail
  let effectiveReplyTo = campaign.reply_to as string | undefined

  if (!domainVerified && adminSettings.default_sender_email) {
    effectiveFromName = adminSettings.default_sender_name || effectiveFromName
    effectiveFromEmail = adminSettings.default_sender_email
    // Keep user's desired From email as Reply-To so replies still go to them
    effectiveReplyTo = effectiveReplyTo || senderEmail
  }

  const blocks = parseJsonSafe(campaign.blocks as string, [])
  const companyInfo = settings ? [settings.company_name, settings.company_address].filter(Boolean).join(' · ') : ''
  const baseHtml = (campaign.html_body as string) || generateEmailHtml(blocks, {}, '{{unsubscribe_url}}', companyInfo)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  db.prepare("UPDATE campaigns SET status = 'sending', updated_at = datetime('now') WHERE id = ?").run(id)

  const ccEmails = parseJsonSafe<string[]>(campaign.cc_emails as string, [])
  const ccStr = ccEmails.filter(Boolean).join(', ')
  const messageStream = (settings?.postmark_message_stream as string) || adminSettings.postmark_message_stream || 'broadcast'

  const messages = contacts.map(contact => {
    const unsubUrl = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(contact.email)}&uid=${session.id}`
    const html = personalizeHtml(baseHtml, contact, unsubUrl)
    return {
      From: `${effectiveFromName} <${effectiveFromEmail}>`,
      To: contact.email,
      Subject: cleanSubject(campaign.subject as string),
      HtmlBody: html,
      ReplyTo: effectiveReplyTo,
      ...(ccStr ? { Cc: ccStr } : {}),
      MessageStream: messageStream,
      TrackOpens: true,
      Metadata: { campaign_id: id, contact_id: contact.id },
    }
  })

  try {
    const results = await sendBatch(postmarkKey, messages)

    const insertRecipient = db.prepare('INSERT OR IGNORE INTO campaign_recipients (campaign_id, contact_id, contact_email, postmark_message_id) VALUES (?, ?, ?, ?)')
    db.transaction(() => {
      for (let i = 0; i < contacts.length; i++) {
        insertRecipient.run(id, contacts[i].id, contacts[i].email, results[i]?.MessageID || null)
      }
    })()

    const sent = results.filter(r => r?.ErrorCode === 0).length
    db.prepare(`UPDATE campaigns SET status = 'sent', sent_at = datetime('now'), total_recipients = ?, updated_at = datetime('now') WHERE id = ?`).run(sent, id)
    db.prepare('UPDATE campaign_stats SET sent = ? WHERE campaign_id = ?').run(sent, id)

    return NextResponse.json({
      ok: true, sent, total: contacts.length,
      domainVerified: !!domainVerified,
      usedFallbackSender: !domainVerified && !!adminSettings.default_sender_email,
    })
  } catch (err) {
    db.prepare("UPDATE campaigns SET status = 'draft', updated_at = datetime('now') WHERE id = ?").run(id)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
