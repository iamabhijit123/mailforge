import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.isOwner) return NextResponse.json({ error: 'Only account owners can manage team members' }, { status: 403 })

  const db = getDb()
  const members = db.prepare(`
    SELECT tm.*, u.email as user_email, u.name as user_name
    FROM team_members tm
    LEFT JOIN users u ON u.id = tm.member_user_id
    WHERE tm.owner_id = ?
    ORDER BY tm.invited_at DESC
  `).all(session.id)

  return NextResponse.json({ members })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.isOwner) return NextResponse.json({ error: 'Only account owners can invite team members' }, { status: 403 })

  const { email, name, role } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const normalEmail = email.toLowerCase().trim()

  // Block self-invite
  if (normalEmail === session.email.toLowerCase()) {
    return NextResponse.json({ error: "You can't invite yourself — you're already the account owner." }, { status: 400 })
  }

  const db = getDb()

  // Check for duplicate invite
  const existing = db.prepare('SELECT id FROM team_members WHERE owner_id = ? AND email = ?').get(session.id, normalEmail)
  if (existing) return NextResponse.json({ error: 'This email has already been invited' }, { status: 409 })

  // Check if already an active member
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ? AND workspace_id = ?').get(normalEmail, session.id)
  if (existingUser) return NextResponse.json({ error: 'This user is already a member of your account' }, { status: 409 })

  const id = crypto.randomUUID()
  const invite_token = crypto.randomUUID()

  db.prepare(`
    INSERT INTO team_members (id, owner_id, email, name, role, invite_token)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, session.id, normalEmail, name?.trim() || null, role || 'member', invite_token)

  const member = db.prepare('SELECT * FROM team_members WHERE id = ?').get(id)
  return NextResponse.json({ member, invite_token }, { status: 201 })
}
