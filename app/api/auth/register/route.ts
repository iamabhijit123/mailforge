import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'
import { signToken, COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json()
  if (!name || !email || !password) return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

  const db = getDb()
  const normalEmail = email.toLowerCase().trim()

  const existing = db.prepare('SELECT id, email, password_hash, role FROM users WHERE email = ?').get(normalEmail) as
    { id: string; email: string; password_hash: string; role: string } | undefined

  if (existing) {
    if (existing.password_hash !== 'jwt-authenticated') {
      return NextResponse.json({ error: 'An account with this email already exists. Sign in or use Forgot password.' }, { status: 409 })
    }
    // Reclaim placeholder account created after a DB wipe
    const hash = await bcrypt.hash(password, 12)
    const isAdminEmail = process.env.ADMIN_EMAIL && normalEmail === process.env.ADMIN_EMAIL.toLowerCase()
    const noAdminsExist = (db.prepare('SELECT COUNT(*) as c FROM users WHERE is_admin = 1').get() as { c: number }).c === 0
    if (isAdminEmail || noAdminsExist) db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(existing.id)
    db.prepare('UPDATE users SET name = ?, password_hash = ? WHERE id = ?').run(name.trim(), hash, existing.id)
    const settings = db.prepare('SELECT 1 FROM settings WHERE user_id = ?').get(existing.id)
    if (!settings) db.prepare('INSERT INTO settings (user_id) VALUES (?)').run(existing.id)

    const token = await signToken({ id: existing.id, memberId: existing.id, email: existing.email, name: name.trim(), role: existing.role || 'admin', isOwner: true })
    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' })
    return res
  }

  const id = crypto.randomUUID()
  const hash = await bcrypt.hash(password, 12)

  // First workspace owner OR matching ADMIN_EMAIL gets is_admin = 1
  const noOwners = (db.prepare('SELECT COUNT(*) as c FROM users WHERE workspace_id IS NULL').get() as { c: number }).c === 0
  const isAdminEmail = process.env.ADMIN_EMAIL && normalEmail === process.env.ADMIN_EMAIL.toLowerCase()
  const noAdminsExist = (db.prepare('SELECT COUNT(*) as c FROM users WHERE is_admin = 1').get() as { c: number }).c === 0
  const grantAdmin = noOwners || isAdminEmail || noAdminsExist

  db.prepare('INSERT INTO users (id, email, name, password_hash, role, is_workspace_owner, is_admin) VALUES (?, ?, ?, ?, ?, 1, ?)').run(
    id, normalEmail, name.trim(), hash, grantAdmin ? 'admin' : 'member', grantAdmin ? 1 : 0
  )
  db.prepare('INSERT INTO settings (user_id) VALUES (?)').run(id)

  const token = await signToken({ id, memberId: id, email: normalEmail, name: name.trim(), role: grantAdmin ? 'admin' : 'member', isOwner: true })
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' })
  return res
}
