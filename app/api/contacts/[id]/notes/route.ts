import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const notes = db.prepare('SELECT * FROM contact_notes WHERE contact_id = ? AND user_id = ? ORDER BY created_at DESC').all(id, session.id)
  return NextResponse.json(notes)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { body } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Note body required' }, { status: 400 })
  const db = getDb()
  const noteId = crypto.randomUUID()
  db.prepare('INSERT INTO contact_notes (id, contact_id, user_id, body) VALUES (?, ?, ?, ?)').run(noteId, id, session.id, body.trim())
  return NextResponse.json(db.prepare('SELECT * FROM contact_notes WHERE id = ?').get(noteId), { status: 201 })
}
