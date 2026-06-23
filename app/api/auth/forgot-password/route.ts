import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { sendEmail } from '@/lib/postmark'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const db = getDb()
    const user = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(
      email.toLowerCase().trim()
    ) as { id: string; email: string; name: string } | undefined

    // Always return success — don't reveal if email exists
    if (!user) return NextResponse.json({ ok: true })

    // Get Postmark API key: settings table → env var
    const settings = db.prepare('SELECT postmark_api_key, sender_email, sender_name FROM settings WHERE user_id = ?').get(user.id) as {
      postmark_api_key: string | null
      sender_email: string | null
      sender_name: string | null
    } | undefined

    const apiKey = settings?.postmark_api_key || process.env.POSTMARK_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Email sending not configured. Please set POSTMARK_API_KEY in your environment variables.' }, { status: 503 })
    }

    // Generate secure token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('')

    // Delete old unused tokens for this user
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ? AND used = 0').run(user.id)

    // Store token with 1-hour expiry
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    db.prepare('INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, expiresAt)

    // Build reset URL from request origin
    const origin = req.headers.get('origin') || req.nextUrl.origin
    const resetUrl = `${origin}/reset-password/${token}`

    const fromEmail = settings?.sender_email || process.env.POSTMARK_FROM_EMAIL || 'flyers@aptnetwork.com'
    const fromName = settings?.sender_name || process.env.POSTMARK_FROM_NAME || 'MailForge'

    await sendEmail({
      apiKey,
      from: `${fromName} <${fromEmail}>`,
      to: user.email,
      subject: 'Reset your MailForge password',
      htmlBody: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <div style="margin-bottom:24px;">
            <span style="font-size:20px;font-weight:700;color:#111827;">MailForge</span>
          </div>
          <h2 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 8px;">Reset your password</h2>
          <p style="color:#6B7280;margin:0 0 24px;">Hi ${user.name}, we received a request to reset your MailForge password. Click the button below to choose a new one.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#2563EB;color:white;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:15px;">Reset Password</a>
          <p style="color:#9CA3AF;font-size:13px;margin:24px 0 0;">This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.</p>
          <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;">
          <p style="color:#D1D5DB;font-size:11px;">Or copy this link: ${resetUrl}</p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[forgot-password]', msg)
    return NextResponse.json({ error: 'Failed to send reset email: ' + msg }, { status: 500 })
  }
}
