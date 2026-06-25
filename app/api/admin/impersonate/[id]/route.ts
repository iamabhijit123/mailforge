import { NextRequest, NextResponse } from 'next/server'
import { getSession, signToken, COOKIE_NAME } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { getDb } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const db = getDb()
  const user = db.prepare(`SELECT id, email, name, role, workspace_id, is_workspace_owner FROM users WHERE id = ?`).get(id) as {
    id: string; email: string; name: string; role: string; workspace_id: string | null; is_workspace_owner: number | null
  } | undefined

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const workspaceId = user.workspace_id || user.id
  const isOwner = user.is_workspace_owner === 1 || (user.is_workspace_owner === null && !user.workspace_id)

  const token = await signToken({ id: workspaceId, memberId: user.id, email: user.email, name: user.name, role: user.role || 'member', isOwner })
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
