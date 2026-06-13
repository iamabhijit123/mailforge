import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { sendEmail } from '@/lib/postmark'
import { generateEmailHtml, personalizeHtml } from '@/lib/email-html'
import { parseJsonSafe } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const { to_email } = await req.json()
  if (!to_email) return NextResponse.json({ error: 'Test email address required' }, { status: 400 })

  const db = getDb()
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(id, session.id) as Record<string, unknown> | undefined
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(session.id) as Record<string, unknown> | undefined
  if (!settings?.postmark_api_key) return NextResponse.json({ error: 'Postmark API key not configured' }, { status: 400 })

  const blocks = parseJsonSafe(campaign.blocks as string, [])
  const baseHtml = (campaign.html_body as string) || generateEmailHtml(blocks)
  const html = personalizeHtml(baseHtml, { email: to_email, first_name: 'Test', last_name: 'User' }, '#unsubscribe')

  await sendEmail({
    apiKey: settings.postmark_api_key as string,
    from: `${campaign.from_name} <${campaign.from_email}>`,
    to: to_email,
    subject: `[TEST] ${campaign.subject as string}`,
    htmlBody: html,
    replyTo: campaign.reply_to as string | undefined,
    messageStream: (settings.postmark_message_stream as string) || 'broadcast',
    trackOpens: false,
  })

  return NextResponse.json({ ok: true })
}
