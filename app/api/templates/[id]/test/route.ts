import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { sendEmail } from '@/lib/postmark'
import { generateEmailHtml } from '@/lib/email-html'
import { parseJsonSafe } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { to_email } = await req.json()
  if (!to_email) return NextResponse.json({ error: 'Email address required' }, { status: 400 })

  const db = getDb()
  const template = db.prepare('SELECT * FROM templates WHERE id = ? AND (user_id = ? OR is_system = 1)').get(id, session.id) as Record<string, unknown> | undefined
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(session.id) as Record<string, unknown> | undefined
  const postmarkKey = (settings?.postmark_api_key as string) || process.env.POSTMARK_API_KEY
  if (!postmarkKey) return NextResponse.json({ error: 'Postmark API key not configured. Add it in Settings.' }, { status: 400 })

  const fromEmail = settings?.sender_email as string
  const fromName = (settings?.sender_name as string) || 'MailForge'
  if (!fromEmail) return NextResponse.json({ error: 'Sender email not configured in Settings.' }, { status: 400 })

  const blocks = parseJsonSafe(template.blocks as string, [])
  const html = (template.html_body as string) || generateEmailHtml(blocks)
  const subject = `[TEST] ${template.name as string}${template.subject ? ` — ${template.subject}` : ''}`

  try {
    await sendEmail({
      apiKey: postmarkKey,
      from: `${fromName} <${fromEmail}>`,
      to: to_email,
      subject,
      htmlBody: html,
      messageStream: 'outbound',
      trackOpens: false,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
