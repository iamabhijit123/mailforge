import { NextRequest, NextResponse } from 'next/server'
import { getSession, signToken, COOKIE_NAME } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.isOwner) return NextResponse.json({ error: 'Only the account owner can transfer ownership' }, { status: 403 })

  const { memberId } = await req.json()
  if (!memberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 })

  const db = getDb()

  // Verify the target is an active member of this workspace
  const memberRow = db.prepare(`
    SELECT tm.member_user_id, tm.email, tm.name, u.name as user_name, u.email as user_email
    FROM team_members tm
    LEFT JOIN users u ON u.id = tm.member_user_id
    WHERE tm.owner_id = ? AND tm.member_user_id = ? AND tm.status = 'active'
  `).get(session.id, memberId) as {
    member_user_id: string; email: string; name: string | null
    user_name: string | null; user_email: string
  } | undefined

  if (!memberRow) return NextResponse.json({ error: 'Member not found or not yet accepted invite' }, { status: 404 })

  // Transfer: flip is_workspace_owner flags
  db.prepare('UPDATE users SET is_workspace_owner = 0 WHERE id = ?').run(session.memberId)
  db.prepare('UPDATE users SET is_workspace_owner = 1 WHERE id = ?').run(memberId)

  // Remove new owner from team_members (they are no longer a member)
  db.prepare('DELETE FROM team_members WHERE owner_id = ? AND member_user_id = ?').run(session.id, memberId)

  // Add old owner as a team member so they appear in the member list
  const existingRow = db.prepare('SELECT 1 FROM team_members WHERE owner_id = ? AND member_user_id = ?').get(session.id, session.memberId)
  if (!existingRow) {
    const oldOwnerUser = db.prepare('SELECT email, name FROM users WHERE id = ?').get(session.memberId) as { email: string; name: string } | undefined
    db.prepare(`
      INSERT INTO team_members (id, owner_id, member_user_id, email, name, role, status)
      VALUES (?, ?, ?, ?, ?, 'member', 'active')
    `).run(crypto.randomUUID(), session.id, session.memberId, oldOwnerUser?.email || session.email, oldOwnerUser?.name || session.name)
  }

  // Issue new token for current user (now a member)
  const newToken = await signToken({
    id: session.id,
    memberId: session.memberId,
    email: session.email,
    name: session.name,
    role: session.role,
    isOwner: false,
  })

  const res = NextResponse.json({ ok: true, newOwnerEmail: memberRow.user_email || memberRow.email })
  res.cookies.set(COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}
