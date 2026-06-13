import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const list = db.prepare('SELECT l.*, COUNT(cl.contact_id) as contact_count FROM lists l LEFT JOIN contact_lists cl ON cl.list_id = l.id WHERE l.id = ? AND l.user_id = ? GROUP BY l.id').get(id, session.id)
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(list)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const list = db.prepare('SELECT id FROM lists WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { name, description } = await req.json()
  db.prepare('UPDATE lists SET name = ?, description = ? WHERE id = ?').run(name, description || null, id)
  return NextResponse.json(db.prepare('SELECT * FROM lists WHERE id = ?').get(id))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const list = db.prepare('SELECT id FROM lists WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  db.prepare('DELETE FROM lists WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
