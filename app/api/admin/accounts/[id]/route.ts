import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { getDb } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (id === session.memberId) return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 })

  const body = await req.json()
  const db = getDb()

  if (body.is_disabled !== undefined) db.prepare('UPDATE users SET is_disabled = ? WHERE id = ?').run(body.is_disabled ? 1 : 0, id)
  if (body.api_access_enabled !== undefined) db.prepare('UPDATE users SET api_access_enabled = ? WHERE id = ?').run(body.api_access_enabled ? 1 : 0, id)
  if (body.is_admin !== undefined) db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(body.is_admin ? 1 : 0, id)

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const { newPassword } = await req.json()
  if (!newPassword || newPassword.length < 8)
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

  const hash = await bcrypt.hash(newPassword, 12)
  const result = getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id)
  if (result.changes === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
