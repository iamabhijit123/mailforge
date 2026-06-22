import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const folders = db.prepare(`
    SELECT tf.*, COUNT(t.id) as template_count
    FROM template_folders tf
    LEFT JOIN templates t ON t.folder_id = tf.id AND t.user_id = tf.user_id
    WHERE tf.user_id = ?
    GROUP BY tf.id
    ORDER BY tf.name ASC
  `).all(session.id)
  return NextResponse.json(folders)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, color } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const db = getDb()
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO template_folders (id, user_id, name, color) VALUES (?, ?, ?, ?)').run(id, session.id, name.trim(), color || '#6366f1')
  return NextResponse.json(db.prepare('SELECT * FROM template_folders WHERE id = ?').get(id), { status: 201 })
}
