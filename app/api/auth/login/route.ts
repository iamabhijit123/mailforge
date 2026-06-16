import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'
import { signToken, COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 })

  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as {
    id: string; email: string; name: string; password_hash: string; role: string; workspace_id: string | null
  } | undefined
  if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })

  // workspace_id: use owner's id so all queries hit the same data
  const workspaceId = user.workspace_id || user.id
  const isOwner = !user.workspace_id

  const token = await signToken({
    id: workspaceId,
    memberId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isOwner,
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
