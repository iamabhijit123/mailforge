import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const list = db.prepare('SELECT id FROM lists WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const contacts = db.prepare(`
    SELECT c.* FROM contacts c
    JOIN contact_lists cl ON cl.contact_id = c.id
    WHERE cl.list_id = ? AND c.status = 'subscribed'
  `).all(id)
  return NextResponse.json(contacts)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const list = db.prepare('SELECT id FROM lists WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { contact_ids } = await req.json()
  for (const cid of contact_ids as string[]) {
    db.prepare('INSERT OR IGNORE INTO contact_lists (contact_id, list_id) VALUES (?, ?)').run(cid, id)
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const { contact_ids } = await req.json()
  for (const cid of contact_ids as string[]) {
    db.prepare('DELETE FROM contact_lists WHERE contact_id = ? AND list_id = ?').run(cid, id)
  }
  return NextResponse.json({ ok: true })
}
