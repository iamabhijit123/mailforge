import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { sendBatch } from '@/lib/postmark'
import { generateEmailHtml, personalizeHtml } from '@/lib/email-html'
import { parseJsonSafe } from '@/lib/utils'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const db = getDb()
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(id, session.id) as Record<string, unknown> | undefined
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (campaign.status === 'sent') return NextResponse.json({ error: 'Already sent' }, { status: 400 })

  const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(session.id) as Record<string, unknown> | undefined
  const postmarkKey = (settings?.postmark_api_key as string) || process.env.POSTMARK_API_KEY
  if (!postmarkKey) return NextResponse.json({ error: 'Postmark API key not configured. Add it in Settings.' }, { status: 400 })
  if (!campaign.from_email) return NextResponse.json({ error: 'Sender email not set' }, { status: 400 })

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

  const blocks = parseJsonSafe(campaign.blocks as string, [])
  const companyInfo = [settings.company_name, settings.company_address].filter(Boolean).join(' · ')
  const baseHtml = (campaign.html_body as string) || generateEmailHtml(blocks, {}, '{{unsubscribe_url}}', companyInfo)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  db.prepare("UPDATE campaigns SET status = 'sending', updated_at = datetime('now') WHERE id = ?").run(id)

  const messages = contacts.map(contact => {
    const unsubUrl = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(contact.email)}&uid=${session.id}`
    const html = personalizeHtml(baseHtml, contact, unsubUrl)
    return {
      From: `${campaign.from_name} <${campaign.from_email}>`,
      To: contact.email,
      Subject: campaign.subject as string,
      HtmlBody: html,
      ReplyTo: campaign.reply_to as string | undefined,
      MessageStream: (settings?.postmark_message_stream as string) || 'broadcast',
      TrackOpens: true,
      Metadata: { campaign_id: id, contact_id: contact.id },
    }
  })

  try {
    const results = await sendBatch(postmarkKey, messages)

    const insertRecipient = db.prepare('INSERT OR IGNORE INTO campaign_recipients (campaign_id, contact_id, contact_email, postmark_message_id) VALUES (?, ?, ?, ?)')
    const insertTx = db.transaction(() => {
      for (let i = 0; i < contacts.length; i++) {
        const r = results[i]
        insertRecipient.run(id, contacts[i].id, contacts[i].email, r?.MessageID || null)
      }
    })
    insertTx()

    const sent = results.filter(r => r?.ErrorCode === 0).length
    db.prepare(`UPDATE campaigns SET status = 'sent', sent_at = datetime('now'), total_recipients = ?, updated_at = datetime('now') WHERE id = ?`).run(sent, id)
    db.prepare('UPDATE campaign_stats SET sent = ? WHERE campaign_id = ?').run(sent, id)

    return NextResponse.json({ ok: true, sent, total: contacts.length })
  } catch (err) {
    db.prepare("UPDATE campaigns SET status = 'draft', updated_at = datetime('now') WHERE id = ?").run(id)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
