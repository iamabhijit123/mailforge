import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { sendBatch } from '@/lib/postmark'
import { generateEmailHtml, personalizeHtml } from '@/lib/email-html'
import { parseJsonSafe } from '@/lib/utils'
import { cleanSubject } from '@/lib/email-utils'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function executeCampaignSend(
  db: ReturnType<typeof getDb>,
  campaignId: string,
  userId: string,
  apiKey: string,
  messageStream: string,
  companyInfo: string,
) {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId) as Record<string, unknown>
  const listIds = parseJsonSafe<string[]>(campaign.list_ids as string, [])
  const contacts = listIds.length > 0
    ? db.prepare(`SELECT DISTINCT c.id, c.email, c.first_name, c.last_name FROM contacts c JOIN contact_lists cl ON cl.contact_id = c.id WHERE cl.list_id IN (${listIds.map(() => '?').join(',')}) AND c.status = 'subscribed' AND c.user_id = ?`).all(...listIds, userId) as Array<{ id: string; email: string; first_name: string | null; last_name: string | null }>
    : db.prepare("SELECT id, email, first_name, last_name FROM contacts WHERE user_id = ? AND status = 'subscribed'").all(userId) as Array<{ id: string; email: string; first_name: string | null; last_name: string | null }>

  if (!contacts.length) return 0

  const blocks = parseJsonSafe(campaign.blocks as string, [])
  const baseHtml = (campaign.html_body as string) || generateEmailHtml(blocks, {}, '{{unsubscribe_url}}', companyInfo)

  db.prepare("UPDATE campaigns SET status = 'sending' WHERE id = ?").run(campaignId)

  const messages = contacts.map(contact => {
    const unsubUrl = `${APP_URL}/api/unsubscribe?email=${encodeURIComponent(contact.email)}&uid=${userId}`
    const html = personalizeHtml(baseHtml, contact, unsubUrl)
    return {
      From: `${campaign.from_name} <${campaign.from_email}>`,
      To: contact.email,
      Subject: cleanSubject(campaign.subject as string),
      HtmlBody: html,
      ReplyTo: campaign.reply_to as string | undefined,
      MessageStream: messageStream || 'broadcast',
      TrackOpens: true,
      Metadata: { campaign_id: campaignId, contact_id: contact.id },
    }
  })

  const results = await sendBatch(apiKey, messages)

  const insertRecipient = db.prepare('INSERT OR IGNORE INTO campaign_recipients (campaign_id, contact_id, contact_email, postmark_message_id) VALUES (?, ?, ?, ?)')
  db.transaction(() => {
    for (let i = 0; i < contacts.length; i++) {
      insertRecipient.run(campaignId, contacts[i].id, contacts[i].email, results[i]?.MessageID || null)
    }
  })()

  const sent = results.filter(r => r?.ErrorCode === 0).length
  db.prepare("UPDATE campaigns SET status = 'sent', sent_at = datetime('now'), total_recipients = ? WHERE id = ?").run(sent, campaignId)
  if (db.prepare('SELECT campaign_id FROM campaign_stats WHERE campaign_id = ?').get(campaignId)) {
    db.prepare('UPDATE campaign_stats SET sent = ? WHERE campaign_id = ?').run(sent, campaignId)
  } else {
    db.prepare('INSERT INTO campaign_stats (campaign_id, sent) VALUES (?, ?)').run(campaignId, sent)
  }
  return sent
}

export async function POST() {
  const db = getDb()
  const now = new Date().toISOString()
  const results = { scheduled_campaigns: 0, group_items: 0, errors: [] as string[] }

  // 1. Process due scheduled campaigns (original sends + auto-resends)
  const dueCampaigns = db.prepare(`
    SELECT sc.*, c.user_id FROM scheduled_campaigns sc
    JOIN campaigns c ON c.id = sc.campaign_id
    WHERE sc.status = 'pending' AND sc.scheduled_at <= ?
  `).all(now) as Array<{ id: string; campaign_id: string; user_id: string; auto_resend_after_hours: number; is_auto_resend: number }>

  for (const sc of dueCampaigns) {
    try {
      const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(sc.user_id) as Record<string, unknown> | null
      const postmarkKey = (settings?.postmark_api_key as string) || process.env.POSTMARK_API_KEY
      if (!postmarkKey) continue

      if (sc.is_auto_resend) {
        // Auto-resend to non-openers — inline resend logic
        const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(sc.campaign_id) as Record<string, unknown> | null
        if (!campaign || campaign.status !== 'sent') { db.prepare("UPDATE scheduled_campaigns SET status = 'sent' WHERE id = ?").run(sc.id); continue }

        const originalMsgIds = db.prepare('SELECT contact_id, contact_email, postmark_message_id FROM campaign_recipients WHERE campaign_id = ? AND postmark_message_id IS NOT NULL').all(sc.campaign_id) as Array<{ contact_id: string; contact_email: string; postmark_message_id: string }>
        const resendMsgIds = db.prepare(`SELECT crr.contact_id, crr.contact_email, crr.postmark_message_id FROM campaign_resend_recipients crr JOIN campaign_resends cr ON cr.id = crr.resend_id WHERE cr.campaign_id = ? AND crr.postmark_message_id IS NOT NULL`).all(sc.campaign_id) as Array<{ contact_id: string; contact_email: string; postmark_message_id: string }>

        const insertEv = db.prepare('INSERT OR IGNORE INTO email_events (id, campaign_id, contact_id, contact_email, event_type, link_url, postmark_message_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
        for (const r of [...originalMsgIds, ...resendMsgIds]) {
          try {
            const pmRes = await fetch(`https://api.postmarkapp.com/messages/outbound/${r.postmark_message_id}/details`, { headers: { 'X-Postmark-Server-Token': postmarkKey, Accept: 'application/json' } })
            if (!pmRes.ok) continue
            const pmData = await pmRes.json() as { MessageEvents?: Array<{ Type: string; Details?: { Link?: string } }> }
            for (const e of pmData.MessageEvents || []) {
              const t = (e.Type || '').toLowerCase()
              const evType = t === 'opened' ? 'open' : (t === 'clicked' || t === 'linkclicked') ? 'click' : null
              if (evType) insertEv.run(crypto.randomUUID(), sc.campaign_id, r.contact_id || null, r.contact_email, evType, e.Details?.Link || null, r.postmark_message_id)
            }
          } catch { /* skip */ }
        }

        const openerEmails = new Set<string>((db.prepare(`SELECT DISTINCT contact_email FROM email_events WHERE campaign_id = ? AND event_type = 'open'`).all(sc.campaign_id) as Array<{ contact_email: string }>).map(r => r.contact_email))
        const allRecipientEmails = [...new Set([...originalMsgIds.map(r => r.contact_email), ...resendMsgIds.map(r => r.contact_email)])]
        const nonOpenerEmails = allRecipientEmails.filter(e => !openerEmails.has(e))

        if (nonOpenerEmails.length > 0) {
          const ph = nonOpenerEmails.map(() => '?').join(',')
          const contacts = db.prepare(`SELECT id, email, first_name, last_name FROM contacts WHERE user_id = ? AND email IN (${ph}) AND status = 'subscribed'`).all(sc.user_id, ...nonOpenerEmails) as Array<{ id: string; email: string; first_name: string | null; last_name: string | null }>
          if (contacts.length > 0) {
            const maxWave = ((db.prepare('SELECT MAX(wave_number) as m FROM campaign_resends WHERE campaign_id = ?').get(sc.campaign_id) as { m: number | null }).m) || 1
            const companyInfo = [settings?.company_name, settings?.company_address].filter(Boolean).join(' · ')
            const blocks = parseJsonSafe(campaign.blocks as string, [])
            const baseHtml = (campaign.html_body as string) || generateEmailHtml(blocks, {}, '{{unsubscribe_url}}', companyInfo)
            const msgs = contacts.map(c => ({
              From: `${campaign.from_name} <${campaign.from_email}>`,
              To: c.email,
              Subject: cleanSubject(campaign.subject as string),
              HtmlBody: personalizeHtml(baseHtml, c, `${APP_URL}/api/unsubscribe?email=${encodeURIComponent(c.email)}&uid=${sc.user_id}`),
              MessageStream: (settings?.postmark_message_stream as string) || 'broadcast',
              TrackOpens: true,
              Metadata: { campaign_id: sc.campaign_id, contact_id: c.id, wave: String(maxWave + 1) },
            }))
            const resResults = await sendBatch(postmarkKey, msgs)
            const sent = resResults.filter(r => r?.ErrorCode === 0).length
            const resendId = crypto.randomUUID()
            db.prepare(`INSERT INTO campaign_resends (id, campaign_id, wave_number, status, sent_count, sent_at) VALUES (?, ?, ?, 'sent', ?, datetime('now'))`).run(resendId, sc.campaign_id, maxWave + 1, sent)
            const insRR = db.prepare('INSERT INTO campaign_resend_recipients (id, resend_id, contact_id, contact_email, postmark_message_id) VALUES (?, ?, ?, ?, ?)')
            db.transaction(() => { for (let i = 0; i < contacts.length; i++) insRR.run(crypto.randomUUID(), resendId, contacts[i].id, contacts[i].email, resResults[i]?.MessageID || null) })()
          }
        }
        db.prepare("UPDATE scheduled_campaigns SET status = 'sent' WHERE id = ?").run(sc.id)
        results.scheduled_campaigns++
      } else {
        // Normal scheduled send
        const companyInfo = [settings?.company_name, settings?.company_address].filter(Boolean).join(' · ')
        await executeCampaignSend(db, sc.campaign_id, sc.user_id, postmarkKey, (settings?.postmark_message_stream as string) || 'broadcast', companyInfo)
        db.prepare("UPDATE scheduled_campaigns SET status = 'sent' WHERE id = ?").run(sc.id)

        // If auto-resend was configured, schedule the resend now
        const resendHours = sc.auto_resend_after_hours || 0
        if (resendHours > 0) {
          const resendAt = new Date(Date.now() + resendHours * 3600 * 1000).toISOString()
          db.prepare('INSERT INTO scheduled_campaigns (id, user_id, campaign_id, scheduled_at, is_auto_resend) VALUES (?, ?, ?, ?, 1)').run(crypto.randomUUID(), sc.user_id, sc.campaign_id, resendAt)
        }
        results.scheduled_campaigns++
      }
    } catch (e) {
      results.errors.push(`Campaign ${sc.campaign_id}: ${(e as Error).message}`)
      db.prepare("UPDATE scheduled_campaigns SET status = 'error' WHERE id = ?").run(sc.id)
    }
  }

  // 2. Process due template group items
  const dueItems = db.prepare(`
    SELECT tgi.*, tg.user_id, tg.list_id, tg.from_name as group_from_name, tg.from_email as group_from_email
    FROM template_group_items tgi
    JOIN template_groups tg ON tg.id = tgi.group_id
    WHERE tgi.status = 'pending' AND tgi.scheduled_at <= ? AND tg.status = 'active'
  `).all(now) as Array<{ id: string; group_id: string; template_id: string; subject: string | null; user_id: string; list_id: string | null; item_list_id: string | null; recipient_email: string | null; campaign_id: string | null; group_from_name: string | null; group_from_email: string | null }>

  for (const item of dueItems) {
    try {
      const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(item.template_id) as Record<string, unknown> | null
      if (!template) continue
      const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(item.user_id) as Record<string, unknown> | null
      const postmarkKey = (settings?.postmark_api_key as string) || process.env.POSTMARK_API_KEY
      if (!postmarkKey) continue

      const blocks = parseJsonSafe<Parameters<typeof generateEmailHtml>[0]>(template.blocks as string, [])
      const companyInfo = settings ? [settings.company_name, settings.company_address].filter(Boolean).join(' · ') : ''
      const htmlBody = (template.html_body as string) || generateEmailHtml(blocks, {}, '{{unsubscribe_url}}', companyInfo)
      const subject = item.subject || (template.subject as string) || 'No Subject'
      const fromName = item.group_from_name || (settings?.sender_name as string) || ''
      const fromEmail = item.group_from_email || (settings?.sender_email as string) || ''
      // item_list_id takes precedence over group's list_id; recipient_email overrides both for single-email sends
      const effectiveListId = item.item_list_id || item.list_id
      const listIds = effectiveListId ? JSON.stringify([effectiveListId]) : '[]'

      // Reuse pre-created campaign if available, otherwise create new one
      let campaignId: string
      const preCampaign = item.campaign_id
        ? db.prepare("SELECT id FROM campaigns WHERE id = ? AND status IN ('scheduled', 'draft')").get(item.campaign_id) as { id: string } | null
        : null

      if (preCampaign) {
        campaignId = preCampaign.id
        // Apply any item-level list override and reset to draft for executeCampaignSend
        db.prepare('UPDATE campaigns SET list_ids = ?, status = \'draft\', subject = ?, from_name = ?, from_email = ? WHERE id = ?').run(
          listIds, subject, fromName, fromEmail, campaignId
        )
      } else {
        campaignId = crypto.randomUUID()
        db.prepare(`
          INSERT INTO campaigns (id, user_id, name, subject, from_name, from_email, list_ids, blocks, html_body, status, template_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
        `).run(campaignId, item.user_id, `[Auto] ${template.name as string}`, subject, fromName, fromEmail, listIds, template.blocks as string, htmlBody, item.template_id)
        db.prepare('INSERT INTO campaign_stats (campaign_id) VALUES (?)').run(campaignId)
      }

      const messageStream = (settings?.postmark_message_stream as string) || 'broadcast'

      if (item.recipient_email) {
        // Single-email send — bypass list lookup, send directly to the specified address
        const unsubUrl = `${APP_URL}/api/unsubscribe?email=${encodeURIComponent(item.recipient_email)}&uid=${item.user_id}`
        const html = personalizeHtml(htmlBody, { first_name: null, last_name: null, email: item.recipient_email }, unsubUrl)
        const results = await sendBatch(postmarkKey, [{
          From: `${fromName} <${fromEmail}>`,
          To: item.recipient_email,
          Subject: subject,
          HtmlBody: html,
          MessageStream: messageStream,
          TrackOpens: true,
          Metadata: { campaign_id: campaignId },
        }])
        const sent = results.filter(r => r?.ErrorCode === 0).length
        const messageId = results[0]?.MessageID || null
        db.prepare("UPDATE campaigns SET status = 'sent', sent_at = datetime('now'), total_recipients = ? WHERE id = ?").run(sent, campaignId)
        db.prepare('UPDATE campaign_stats SET sent = ? WHERE campaign_id = ?').run(sent, campaignId)
        db.prepare('INSERT OR IGNORE INTO campaign_recipients (campaign_id, contact_id, contact_email, postmark_message_id) VALUES (?, ?, ?, ?)').run(campaignId, crypto.randomUUID(), item.recipient_email, messageId)
      } else {
        await executeCampaignSend(db, campaignId, item.user_id, postmarkKey, messageStream, companyInfo)
      }

      db.prepare("UPDATE template_group_items SET status = 'sent', sent_at = datetime('now'), campaign_id = ? WHERE id = ?").run(campaignId, item.id)
      results.group_items++
    } catch (e) {
      results.errors.push(`Group item ${item.id}: ${(e as Error).message}`)
      db.prepare("UPDATE template_group_items SET status = 'error' WHERE id = ?").run(item.id)
    }
  }

  // 3. Process due recurring sends
  const dueRecurring = db.prepare(`
    SELECT rs.*, rc.user_id, rc.from_name, rc.from_email, rc.reply_to, rc.cc_emails,
           rc.list_ids, rc.template_folder_id, rc.template_id, rc.template_ids, rc.rotation_index, rc.subject, rc.name as rc_name
    FROM recurring_sends rs
    JOIN recurring_campaigns rc ON rc.id = rs.recurring_campaign_id
    WHERE rs.status = 'pending' AND rs.scheduled_at <= ? AND rc.status = 'active'
  `).all(now) as Array<{
    id: string; recurring_campaign_id: string; user_id: string
    from_name: string; from_email: string; reply_to: string | null; cc_emails: string
    list_ids: string; template_folder_id: string | null; template_id: string | null
    template_ids: string | null; rotation_index: number
    subject: string; rc_name: string
  }>

  for (const rs of dueRecurring) {
    try {
      const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(rs.user_id) as Record<string, unknown> | null
      const postmarkKey = (settings?.postmark_api_key as string) || process.env.POSTMARK_API_KEY
      if (!postmarkKey) continue

      // Pick template: template_ids array → folder rotation → single template_id
      let template: Record<string, unknown> | null = null
      const templateIds = parseJsonSafe<string[]>(rs.template_ids || '', [])
      if (templateIds.length > 0) {
        const tid = templateIds[rs.rotation_index % templateIds.length]
        template = db.prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?').get(tid, rs.user_id) as Record<string, unknown> | null
      } else if (rs.template_folder_id) {
        const folderTemplates = db.prepare('SELECT * FROM templates WHERE folder_id = ? AND user_id = ? ORDER BY created_at ASC').all(rs.template_folder_id, rs.user_id) as Array<Record<string, unknown>>
        template = folderTemplates.length ? folderTemplates[rs.rotation_index % folderTemplates.length] : null
      } else if (rs.template_id) {
        template = db.prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?').get(rs.template_id, rs.user_id) as Record<string, unknown> | null
      }

      const companyInfo = settings ? [settings.company_name, settings.company_address].filter(Boolean).join(' · ') : ''
      const blocks = parseJsonSafe<Parameters<typeof generateEmailHtml>[0]>(template?.blocks as string, [])
      const htmlBody = (template?.html_body as string) || generateEmailHtml(blocks, {}, '{{unsubscribe_url}}', companyInfo)

      const campaignId = crypto.randomUUID()
      const subject = cleanSubject(rs.subject)
      db.prepare(`INSERT INTO campaigns (id, user_id, name, subject, from_name, from_email, reply_to, list_ids, blocks, html_body, status, template_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`)
        .run(campaignId, rs.user_id, `[Recurring] ${rs.rc_name}`, subject, rs.from_name, rs.from_email, rs.reply_to,
          rs.list_ids, template?.blocks || '[]', template?.html_body || null, template?.id || null)
      db.prepare('INSERT INTO campaign_stats (campaign_id) VALUES (?)').run(campaignId)

      const messageStream = (settings?.postmark_message_stream as string) || 'broadcast'
      await executeCampaignSend(db, campaignId, rs.user_id, postmarkKey, messageStream, companyInfo)

      // Mark send done, increment rotation
      db.prepare("UPDATE recurring_sends SET status = 'sent', campaign_id = ? WHERE id = ?").run(campaignId, rs.id)
      db.prepare('UPDATE recurring_campaigns SET rotation_index = rotation_index + 1 WHERE id = ?').run(rs.recurring_campaign_id)

      // Mark completed if all sends done
      const pending = db.prepare("SELECT COUNT(*) as n FROM recurring_sends WHERE recurring_campaign_id = ? AND status = 'pending'").get(rs.recurring_campaign_id) as { n: number }
      if (pending.n === 0) db.prepare("UPDATE recurring_campaigns SET status = 'completed' WHERE id = ?").run(rs.recurring_campaign_id)

      results.group_items++
    } catch (e) {
      results.errors.push(`Recurring send ${rs.id}: ${(e as Error).message}`)
      db.prepare("UPDATE recurring_sends SET status = 'error' WHERE id = ?").run(rs.id)
    }
  }

  return NextResponse.json({ ok: true, ...results })
}
