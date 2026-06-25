import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { getDb } from '@/lib/db'

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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return NextResponse.json({ invite: { id, token, email: normalEmail, role: inviteRole }, url: `${baseUrl}/register?invite=${token}` })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await req.json()
  getDb().prepare(`DELETE FROM admin_invites WHERE id = ?`).run(id)
  return NextResponse.json({ ok: true })
}
