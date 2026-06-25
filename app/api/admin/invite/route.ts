import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isAdmin, getAdminSettings } from '@/lib/admin'
import { getDb } from '@/lib/db'
import { sendEmail } from '@/lib/postmark'

export async function GET() {
  const session = await getSession()
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const invites = getDb().prepare(
    `SELECT * FROM admin_invites WHERE used_at IS NULL ORDER BY created_at DESC`
  ).all()
  return NextResponse.json({ invites })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, role } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const normalEmail = email.toLowerCase().trim()
  const db = getDb()

  // Check if email already has an active account
  const existing = db.prepare(`SELECT id FROM users WHERE email = ? AND password_hash != 'jwt-authenticated'`).get(normalEmail)
  if (existing) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })

  const id = crypto.randomUUID()
  const token = crypto.randomUUID()
  const inviteRole = role === 'admin' ? 'admin' : 'user'

  db.prepare(`INSERT INTO admin_invites (id, token, email, role) VALUES (?, ?, ?, ?)`).run(id, token, normalEmail, inviteRole)

  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const inviteUrl = `${origin}/register?invite=${token}`

  // Send invite email via Postmark
  const adminSettings = getAdminSettings()
  const apiKey = adminSettings.postmark_api_key
  let emailSent = false
  let emailError = ''

  if (apiKey) {
    const fromEmail = adminSettings.default_sender_email || process.env.POSTMARK_FROM_EMAIL || 'noreply@mailforge.app'
    const fromName = adminSettings.default_sender_name || 'MailForge'
    try {
      await sendEmail({
        apiKey,
        from: `${fromName} <${fromEmail}>`,
        to: normalEmail,
        subject: "You've been invited to MailForge",
        htmlBody: `
          <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;background:#ffffff;">
            <div style="margin-bottom:28px;">
              <span style="font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.5px;">MailForge</span>
            </div>
            <h2 style="font-size:24px;font-weight:700;color:#111827;margin:0 0 12px;">You&apos;ve been invited!</h2>
            <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 8px;">
              You&apos;ve been invited to create a <strong>MailForge</strong> account as a
              <strong style="color:#2563EB;">${inviteRole === 'admin' ? 'Platform Admin' : 'Workspace Owner'}</strong>.
            </p>
            <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 32px;">
              Click the button below to set up your account. This invite link can only be used once.
            </p>
            <a href="${inviteUrl}"
              style="display:inline-block;background:#2563EB;color:#ffffff;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:15px;">
              Accept Invite &amp; Create Account
            </a>
            <p style="color:#9CA3AF;font-size:13px;margin:32px 0 0;line-height:1.5;">
              Or copy this link into your browser:<br>
              <span style="color:#6B7280;word-break:break-all;">${inviteUrl}</span>
            </p>
            <hr style="border:none;border-top:1px solid #F3F4F6;margin:32px 0 20px;">
            <p style="color:#D1D5DB;font-size:12px;margin:0;">
              If you weren&apos;t expecting this invite, you can safely ignore this email.
            </p>
          </div>
        `,
      })
      emailSent = true
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err)
    }
  } else {
    emailError = 'No Postmark API key configured in Admin → Settings'
  }

  return NextResponse.json({
    invite: { id, token, email: normalEmail, role: inviteRole },
    url: inviteUrl,
    emailSent,
    emailError: emailSent ? undefined : emailError,
  })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await req.json()
  getDb().prepare(`DELETE FROM admin_invites WHERE id = ?`).run(id)
  return NextResponse.json({ ok: true })
}
