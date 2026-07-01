import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { generateWeekdaySchedule } from '@/lib/schedule-utils'
import type { Frequency } from '@/lib/schedule-utils'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const campaigns = db.prepare(`
    SELECT rc.*,
      tf.name as folder_name,
      (SELECT COUNT(*) FROM recurring_sends rs WHERE rs.recurring_campaign_id = rc.id) as total_sends,
      (SELECT COUNT(*) FROM recurring_sends rs WHERE rs.recurring_campaign_id = rc.id AND rs.status = 'sent') as sent_count,
      (SELECT rs.scheduled_at FROM recurring_sends rs WHERE rs.recurring_campaign_id = rc.id AND rs.status = 'pending' ORDER BY rs.scheduled_at ASC LIMIT 1) as next_send_at
    FROM recurring_campaigns rc
    LEFT JOIN template_folders tf ON tf.id = rc.template_folder_id
    WHERE rc.user_id = ?
    ORDER BY rc.created_at DESC
  `).all(session.id)
  return NextResponse.json(campaigns)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const {
    name, subject, from_name, from_email, reply_to, cc_emails,
    list_ids, template_folder_id, template_ids, frequency, timezone, send_time,
    start_date, end_date, allow_weekends, sends: manualSends, auto_resend_after_hours,
  } = body

  if (!name || !subject || !from_email || !frequency || !start_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = getDb()
  const id = crypto.randomUUID()

  // Derive single legacy template_id for backwards compat (first of template_ids if only one)
  const legacyTemplateId = (!template_ids || template_ids.length !== 1) ? null : template_ids[0]
  db.prepare(`
    INSERT INTO recurring_campaigns
      (id, user_id, name, subject, from_name, from_email, reply_to, cc_emails, list_ids, template_folder_id, template_id, template_ids, frequency, timezone, send_time, start_date, end_date, auto_resend_after_hours)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, session.id, name, subject, from_name || '', from_email, reply_to || null,
    JSON.stringify(cc_emails || []), JSON.stringify(list_ids || []),
    template_folder_id || null, legacyTemplateId,
    template_ids?.length ? JSON.stringify(template_ids) : null,
    frequency, timezone || 'UTC', send_time || '09:00', start_date, end_date,
    auto_resend_after_hours || 0
  )

  // For ongoing campaigns (no end_date), generate 1 year of sends upfront
  const effectiveEndDate = end_date || (() => {
    const d = new Date(start_date + 'T12:00:00Z')
    d.setUTCFullYear(d.getUTCFullYear() + 1)
    return d.toISOString().slice(0, 10)
  })()

  // Use manually adjusted sends if provided, otherwise auto-generate
  const schedule = manualSends?.length
    ? manualSends as Array<{ date: string; time: string; scheduledAt: string }>
    : generateWeekdaySchedule(start_date, effectiveEndDate, frequency as Frequency, send_time || '09:00', timezone || 'UTC', !!allow_weekends)

  const insertSend = db.prepare(
    'INSERT INTO recurring_sends (id, recurring_campaign_id, scheduled_date, scheduled_time, scheduled_at, is_adjusted) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const insertAll = db.transaction(() => {
    for (const s of schedule) {
      insertSend.run(crypto.randomUUID(), id, s.date, s.time, s.scheduledAt, (s as { adjusted?: boolean }).adjusted ? 1 : 0)
    }
  })
  insertAll()

  return NextResponse.json(db.prepare('SELECT * FROM recurring_campaigns WHERE id = ?').get(id), { status: 201 })
}
