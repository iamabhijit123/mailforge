import { NextRequest, NextResponse } from 'next/server'
import { getSession, signToken, COOKIE_NAME } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { isAdmin } from '@/lib/admin'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const user = db.prepare('SELECT name, email, phone FROM users WHERE id = ?').get(session.memberId) as { name: string; email: string; phone: string | null } | undefined
  return NextResponse.json({
    id: session.id,
    memberId: session.memberId,
    email: session.email,
    name: session.name,
    phone: user?.phone || '',
    role: session.role,
    isOwner: session.isOwner,
    isAdmin: isAdmin(session),
  })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, phone } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const db = getDb()
  db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(name.trim(), phone || null, session.memberId)

  // Issue updated session token with new name
  const newToken = await signToken({ ...session, name: name.trim() })
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}
