import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.isOwner) return NextResponse.json({ error: 'Only account owners can remove team members' }, { status: 403 })

  const { id } = await params
  const db = getDb()

  const member = db.prepare('SELECT * FROM team_members WHERE id = ? AND owner_id = ?').get(id, session.id) as {
    member_user_id: string | null
  } | undefined
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If they have an account, remove their workspace link
  if (member.member_user_id) {
    db.prepare('UPDATE users SET workspace_id = NULL WHERE id = ?').run(member.member_user_id)
  }

  db.prepare('DELETE FROM team_members WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.isOwner) return NextResponse.json({ error: 'Only account owners can update team members' }, { status: 403 })

  const { id } = await params
  const { role } = await req.json()
  const db = getDb()

  const member = db.prepare('SELECT id FROM team_members WHERE id = ? AND owner_id = ?').get(id, session.id)
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  db.prepare('UPDATE team_members SET role = ? WHERE id = ?').run(role, id)
  return NextResponse.json({ ok: true })
}
