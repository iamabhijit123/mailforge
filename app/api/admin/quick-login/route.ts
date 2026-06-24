// Admin quick-login — credentials validated against ADMIN_EMAIL + ADMIN_PASSWORD env vars
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { signToken, COOKIE_NAME } from '@/lib/auth'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    return NextResponse.json({ error: 'Admin credentials not configured in environment variables.' }, { status: 404 })
  }

  const { password } = await req.json()
  if (!password || password !== adminPassword) {
    return NextResponse.json({ error: 'Incorrect admin password.' }, { status: 401 })
  }

  const db = getDb()

  // Find or create the admin user row
  let user = db.prepare('SELECT id, name, email, is_workspace_owner FROM users WHERE email = ?').get(adminEmail.toLowerCase()) as
    { id: string; name: string; email: string; is_workspace_owner?: number } | undefined

  if (!user) {
    const id = randomUUID()
    db.prepare(`INSERT OR IGNORE INTO users (id, email, name, password_hash, is_workspace_owner, is_admin)
                VALUES (?, ?, 'Admin', 'admin-env-auth', 1, 1)`).run(id, adminEmail.toLowerCase())
    user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(adminEmail.toLowerCase()) as
      { id: string; name: string; email: string }
  }

  // Ensure is_admin flag is set
  db.prepare('UPDATE users SET is_admin = 1 WHERE email = ?').run(adminEmail.toLowerCase())

  if (!user) return NextResponse.json({ error: 'Could not resolve admin user' }, { status: 500 })

  const token = await signToken({
    id: user.id,
    memberId: user.id,
    email: user.email,
    name: user.name || 'Admin',
    role: 'admin',
    isOwner: true,
  })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}
