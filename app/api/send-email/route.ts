import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { sendEmail } from '@/lib/postmark'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, subject, html, fromName } = await req.json()
  if (!to || !subject || !html) {
    return NextResponse.json({ error: 'Missing required fields: to, subject, html' }, { status: 400 })
  }

  const emailList = String(to).split(/[,;]/).map((e: string) => e.trim()).filter(Boolean)
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const invalid = emailList.filter(e => !validEmail.test(e))
  if (invalid.length) {
    return NextResponse.json({ error: `Invalid email address: ${invalid.join(', ')}` }, { status: 400 })
  }

  const db = getDb()
  const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(session.id) as Record<string, unknown> | undefined
  const postmarkKey = (settings?.postmark_api_key as string) || process.env.POSTMARK_API_KEY
  if (!postmarkKey) {
    return NextResponse.json({ error: 'Postmark API key not configured. Add it in Settings.' }, { status: 400 })
  }

  const fromEmail = (settings?.sender_email as string) || 'flyers@aptnetwork.com'
  const name = fromName || (settings?.sender_name as string) || 'ApartmentNetwork.com'

  try {
    for (const recipient of emailList) {
      await sendEmail({
        apiKey: postmarkKey,
        from: `${name} <${fromEmail}>`,
        to: recipient,
        subject,
        htmlBody: html,
        messageStream: 'outbound',
        trackOpens: false,
      })
    }
    return NextResponse.json({ success: true, recipients: emailList.length })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
