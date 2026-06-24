// Admin quick-login — tries env var credentials first, falls back to DB is_admin users
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { signToken, COOKIE_NAME } from '@/lib/auth'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 })

  const db = getDb()
  const adminEmailEnv = process.env.ADMIN_EMAIL
  const adminPasswordEnv = process.env.ADMIN_PASSWORD

  // ── Method 1: env var plain-text credentials ──────────────────────────────
  if (adminEmailEnv && adminPasswordEnv) {
    if (password !== adminPasswordEnv) {
      return NextResponse.json({ error: 'Incorrect admin password.' }, { status: 401 })
    }

    // Find or create the admin user row
    let user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(adminEmailEnv.toLowerCase()) as
      { id: string; name: string; email: string } | undefined

    if (!user) {
      const id = randomUUID()
      db.prepare(`INSERT OR IGNORE INTO users (id, email, name, password_hash, is_workspace_owner, is_admin)
                  VALUES (?, ?, 'Admin', 'admin-env-auth', 1, 1)`).run(id, adminEmailEnv.toLowerCase())
      user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(adminEmailEnv.toLowerCase()) as
        { id: string; name: string; email: string } | undefined
    }

    if (!user) return NextResponse.json({ error: 'Could not resolve admin user' }, { status: 500 })

    // Ensure is_admin is set in DB
    db.prepare('UPDATE users SET is_admin = 1 WHERE email = ?').run(adminEmailEnv.toLowerCase())

    return buildSession(user.id, user.name || 'Admin', user.email)
  }

  // ── Method 2: DB fallback — any user with is_admin=1 + bcrypt password ───
  const adminUsers = db.prepare(
    `SELECT id, name, email, password_hash FROM users WHERE is_admin = 1`
  ).all() as { id: string; name: string; email: string; password_hash: string }[]

  for (const u of adminUsers) {
    if (u.password_hash && u.password_hash !== 'jwt-authenticated' && u.password_hash !== 'admin-env-auth') {
      const valid = await bcrypt.compare(password, u.password_hash)
      if (valid) return buildSession(u.id, u.name, u.email)
    }
  }

  // ── Method 3: first workspace owner fallback (no is_admin flag set yet) ──
  if (adminEmailEnv) {
    const ownerUser = db.prepare(
      `SELECT id, name, email, password_hash FROM users WHERE email = ? AND password_hash != 'jwt-authenticated'`
    ).get(adminEmailEnv.toLowerCase()) as { id: string; name: string; email: string; password_hash: string } | undefined

    if (ownerUser) {
      const valid = await bcrypt.compare(password, ownerUser.password_hash)
      if (valid) {
        db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(ownerUser.id)
        return buildSession(ownerUser.id, ownerUser.name, ownerUser.email)
      }
      return NextResponse.json({ error: 'Incorrect admin password.' }, { status: 401 })
    }
  }

  return NextResponse.json({
    error: 'No admin account found. Register your account first, then try again.',
  }, { status: 404 })
}

async function buildSession(id: string, name: string, email: string) {
  const token = await signToken({ id, memberId: id, email, name, role: 'admin', isOwner: true })
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
