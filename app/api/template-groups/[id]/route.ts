import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const group = db.prepare(`
    SELECT tg.*, l.name as list_name
    FROM template_groups tg
    LEFT JOIN lists l ON l.id = tg.list_id
    WHERE tg.id = ? AND tg.user_id = ?
  `).get(id, session.id)
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const items = db.prepare(`
    SELECT tgi.*, t.name as template_name, t.subject as template_subject
    FROM template_group_items tgi
    LEFT JOIN templates t ON t.id = tgi.template_id
    WHERE tgi.group_id = ?
    ORDER BY tgi.position ASC, tgi.scheduled_at ASC
  `).all(id)
  return NextResponse.json({ ...group as object, items })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const group = db.prepare('SELECT id FROM template_groups WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json()
  const { name, description, list_id, from_name, from_email, status } = body
  const updates: string[] = []
  const values: unknown[] = []
  if (name !== undefined) { updates.push('name = ?'); values.push(name) }
  if (description !== undefined) { updates.push('description = ?'); values.push(description) }
  if (list_id !== undefined) { updates.push('list_id = ?'); values.push(list_id) }
  if (from_name !== undefined) { updates.push('from_name = ?'); values.push(from_name) }
  if (from_email !== undefined) { updates.push('from_email = ?'); values.push(from_email) }
  if (status !== undefined) { updates.push('status = ?'); values.push(status) }
  if (updates.length) db.prepare(`UPDATE template_groups SET ${updates.join(', ')} WHERE id = ?`).run(...values, id)
  return NextResponse.json(db.prepare('SELECT * FROM template_groups WHERE id = ?').get(id))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const group = db.prepare('SELECT id FROM template_groups WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  db.prepare('DELETE FROM template_groups WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
