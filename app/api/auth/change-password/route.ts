import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword || !newPassword) return NextResponse.json({ error: 'Both current and new password required' }, { status: 400 })
  if (newPassword.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })

  const db = getDb()
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(session.memberId) as { password_hash: string } | undefined
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const valid = await bcrypt.compare(currentPassword, user.password_hash)
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })

  const hash = await bcrypt.hash(newPassword, 12)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, session.memberId)

  return NextResponse.json({ ok: true })
}
