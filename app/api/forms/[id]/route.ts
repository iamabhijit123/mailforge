import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const form = db.prepare('SELECT * FROM forms WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(form)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const form = db.prepare('SELECT id FROM forms WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { name, list_id, config, active } = await req.json()
  const updates: string[] = []
  const values: unknown[] = []
  if (name !== undefined) { updates.push('name = ?'); values.push(name) }
  if (list_id !== undefined) { updates.push('list_id = ?'); values.push(list_id) }
  if (config !== undefined) { updates.push('config = ?'); values.push(JSON.stringify(config)) }
  if (active !== undefined) { updates.push('active = ?'); values.push(active ? 1 : 0) }
  if (updates.length) db.prepare(`UPDATE forms SET ${updates.join(', ')} WHERE id = ?`).run(...values, id)
  return NextResponse.json(db.prepare('SELECT * FROM forms WHERE id = ?').get(id))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  db.prepare('DELETE FROM forms WHERE id = ? AND user_id = ?').run(id, session.id)
  return NextResponse.json({ ok: true })
}
