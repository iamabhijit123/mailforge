import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const groups = db.prepare(`
    SELECT tg.*, l.name as list_name,
      (SELECT COUNT(*) FROM template_group_items tgi WHERE tgi.group_id = tg.id) as item_count,
      (SELECT COUNT(*) FROM template_group_items tgi WHERE tgi.group_id = tg.id AND tgi.status = 'sent') as sent_count
    FROM template_groups tg
    LEFT JOIN lists l ON l.id = tg.list_id
    WHERE tg.user_id = ?
    ORDER BY tg.created_at DESC
  `).all(session.id)
  return NextResponse.json(groups)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { name, description, list_id, from_name, from_email } = body
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const db = getDb()
  const id = crypto.randomUUID()
  db.prepare(`
    INSERT INTO template_groups (id, user_id, name, description, list_id, from_name, from_email)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, session.id, name, description || null, list_id || null, from_name || null, from_email || null)
  return NextResponse.json(db.prepare('SELECT * FROM template_groups WHERE id = ?').get(id), { status: 201 })
}
