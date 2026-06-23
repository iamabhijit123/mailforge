import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'
import { signToken, COOKIE_NAME } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const db = getDb()
  const invite = db.prepare(`
    SELECT tm.*, u.name as owner_name, u.email as owner_email
    FROM team_members tm
    JOIN users u ON u.id = tm.owner_id
    WHERE tm.invite_token = ? AND tm.status = 'pending'
  `).get(token) as {
    id: string; email: string; name: string | null; role: string; owner_name: string; owner_email: string
  } | undefined

  if (!invite) return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 })
  return NextResponse.json({ email: invite.email, name: invite.name, role: invite.role, owner_name: invite.owner_name })
}

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const { name, password } = await req.json()
  if (!name?.trim() || !password) return NextResponse.json({ error: 'Name and password are required' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

  const db = getDb()
  const invite = db.prepare(`
    SELECT tm.*, u.id as owner_user_id
    FROM team_members tm
    JOIN users u ON u.id = tm.owner_id
    WHERE tm.invite_token = ? AND tm.status = 'pending'
  `).get(token) as {
    id: string; email: string; owner_user_id: string; role: string
  } | undefined

  if (!invite) return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 })

  // Check if user already exists with this email
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(invite.email.toLowerCase()) as { id: string } | undefined
  if (existingUser) {
    // Link existing user to the workspace
    db.prepare('UPDATE users SET workspace_id = ? WHERE id = ?').run(invite.owner_user_id, existingUser.id)
    db.prepare('UPDATE team_members SET status = ?, member_user_id = ?, invite_token = NULL WHERE id = ?')
      .run('active', existingUser.id, invite.id)
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(existingUser.id) as { id: string; email: string; name: string; role: string }
    const jwtToken = await signToken({ id: invite.owner_user_id, memberId: user.id, email: user.email, name: user.name, role: user.role, isOwner: false })
    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE_NAME, jwtToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' })
    return res
  }

  // Create new user with workspace_id pointing to owner
  const userId = crypto.randomUUID()
  const hash = await bcrypt.hash(password, 12)
  db.prepare('INSERT INTO users (id, email, name, password_hash, role, workspace_id, is_workspace_owner) VALUES (?, ?, ?, ?, ?, ?, 0)').run(
    userId, invite.email.toLowerCase(), name.trim(), hash, invite.role, invite.owner_user_id
  )
  // No settings row needed — member inherits owner's settings via workspace_id

  db.prepare('UPDATE team_members SET status = ?, member_user_id = ?, name = ?, invite_token = NULL WHERE id = ?')
    .run('active', userId, name.trim(), invite.id)

  const jwtToken = await signToken({
    id: invite.owner_user_id,
    memberId: userId,
    email: invite.email.toLowerCase(),
    name: name.trim(),
    role: invite.role,
    isOwner: false,
  })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, jwtToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' })
  return res
}
