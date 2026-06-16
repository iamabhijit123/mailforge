import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const lists = db.prepare(`
    SELECT l.*,
      COUNT(cl.contact_id) as contact_count,
      COUNT(CASE WHEN c.status = 'subscribed' THEN 1 END) as subscribed_count
    FROM lists l
    LEFT JOIN contact_lists cl ON cl.list_id = l.id
    LEFT JOIN contacts c ON c.id = cl.contact_id
    WHERE l.user_id = ?
    GROUP BY l.id
    ORDER BY l.created_at DESC
  `).all(session.id)
  return NextResponse.json(lists)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, description } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const db = getDb()
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO lists (id, user_id, name, description) VALUES (?, ?, ?, ?)').run(id, session.id, name.trim(), description || null)
  return NextResponse.json(db.prepare('SELECT * FROM lists WHERE id = ?').get(id), { status: 201 })
}
