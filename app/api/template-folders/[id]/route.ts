import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { name, color } = await req.json()
  const db = getDb()
  const folder = db.prepare('SELECT id FROM template_folders WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (name) db.prepare('UPDATE template_folders SET name = ? WHERE id = ?').run(name.trim(), id)
  if (color) db.prepare('UPDATE template_folders SET color = ? WHERE id = ?').run(color, id)
  return NextResponse.json(db.prepare('SELECT * FROM template_folders WHERE id = ?').get(id))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const folder = db.prepare('SELECT id FROM template_folders WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  db.prepare('UPDATE templates SET folder_id = NULL WHERE folder_id = ?').run(id)
  db.prepare('DELETE FROM template_folders WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
