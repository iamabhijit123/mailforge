import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  return NextResponse.json(db.prepare('SELECT f.*, l.name as list_name FROM forms f LEFT JOIN lists l ON l.id = f.list_id WHERE f.user_id = ? ORDER BY f.created_at DESC').all(session.id))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, list_id, config = {} } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const db = getDb()
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO forms (id, user_id, name, list_id, config) VALUES (?, ?, ?, ?, ?)').run(id, session.id, name.trim(), list_id || null, JSON.stringify(config))
  return NextResponse.json(db.prepare('SELECT * FROM forms WHERE id = ?').get(id), { status: 201 })
}
