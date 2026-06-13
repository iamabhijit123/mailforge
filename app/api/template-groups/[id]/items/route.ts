import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const group = db.prepare('SELECT id FROM template_groups WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const items = db.prepare(`
    SELECT tgi.*, t.name as template_name, t.subject as template_subject
    FROM template_group_items tgi
    LEFT JOIN templates t ON t.id = tgi.template_id
    WHERE tgi.group_id = ?
    ORDER BY tgi.position ASC, tgi.scheduled_at ASC
  `).all(id)
  return NextResponse.json(items)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const group = db.prepare('SELECT id FROM template_groups WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json()
  const { template_id, subject, scheduled_at, position } = body
  if (!template_id || !scheduled_at) return NextResponse.json({ error: 'template_id and scheduled_at required' }, { status: 400 })
  const pos = position ?? (db.prepare('SELECT COALESCE(MAX(position),0)+1 as p FROM template_group_items WHERE group_id = ?').get(id) as { p: number }).p
  const itemId = crypto.randomUUID()
  db.prepare(`
    INSERT INTO template_group_items (id, group_id, template_id, position, subject, scheduled_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(itemId, id, template_id, pos, subject || null, scheduled_at)
  return NextResponse.json(db.prepare('SELECT * FROM template_group_items WHERE id = ?').get(itemId), { status: 201 })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const group = db.prepare('SELECT id FROM template_groups WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json()
  const { items } = body as { items: Array<{ id: string; template_id: string; subject?: string; scheduled_at: string; position: number }> }
  if (!Array.isArray(items)) return NextResponse.json({ error: 'items array required' }, { status: 400 })
  const del = db.prepare('DELETE FROM template_group_items WHERE group_id = ? AND status = ?')
  const ins = db.prepare('INSERT OR REPLACE INTO template_group_items (id, group_id, template_id, position, subject, scheduled_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
  db.transaction(() => {
    del.run(id, 'pending')
    for (const item of items) {
      ins.run(item.id || crypto.randomUUID(), id, item.template_id, item.position, item.subject || null, item.scheduled_at, 'pending')
    }
  })()
  return NextResponse.json({ ok: true })
}
