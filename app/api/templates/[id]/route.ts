import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { generateEmailHtml } from '@/lib/email-html'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const tpl = db.prepare('SELECT * FROM templates WHERE id = ? AND (user_id = ? OR is_system = 1)').get(id, session.id)
  if (!tpl) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(tpl)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const tpl = db.prepare('SELECT id FROM templates WHERE id = ? AND user_id = ? AND is_system = 0').get(id, session.id)
  if (!tpl) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { name, category, subject, blocks, html_body } = body
  const finalHtml = html_body || (blocks ? generateEmailHtml(blocks) : undefined)

  const updates: string[] = []
  const values: unknown[] = []
  if (name) { updates.push('name = ?'); values.push(name) }
  if (category) { updates.push('category = ?'); values.push(category) }
  if (subject !== undefined) { updates.push('subject = ?'); values.push(subject) }
  if (blocks) { updates.push('blocks = ?'); values.push(JSON.stringify(blocks)) }
  if (finalHtml) { updates.push('html_body = ?'); values.push(finalHtml) }
  if (updates.length) {
    updates.push("updated_at = datetime('now')")
    db.prepare(`UPDATE templates SET ${updates.join(', ')} WHERE id = ?`).run(...values, id)
  }
  return NextResponse.json(db.prepare('SELECT * FROM templates WHERE id = ?').get(id))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const tpl = db.prepare('SELECT id FROM templates WHERE id = ? AND user_id = ? AND is_system = 0').get(id, session.id)
  if (!tpl) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  db.prepare('DELETE FROM templates WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
