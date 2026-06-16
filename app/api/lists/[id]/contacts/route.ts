import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const list = db.prepare('SELECT id FROM lists WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const url = new URL(req.url)
  const q = url.searchParams.get('q') || ''
  const status = url.searchParams.get('status') || ''
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = 50
  const offset = (page - 1) * limit

  const conditions: string[] = ['cl.list_id = ?', 'c.user_id = ?']
  const args: unknown[] = [id, session.id]

  if (q) {
    conditions.push(`(c.email LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ?)`)
    args.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }
  if (status) {
    conditions.push('c.status = ?')
    args.push(status)
  }

  const where = `WHERE ${conditions.join(' AND ')}`

  const { total } = db.prepare(`
    SELECT COUNT(*) as total FROM contacts c
    JOIN contact_lists cl ON cl.contact_id = c.id
    ${where}
  `).get(...args) as { total: number }

  const contacts = db.prepare(`
    SELECT c.* FROM contacts c
    JOIN contact_lists cl ON cl.contact_id = c.id
    ${where}
    ORDER BY c.email ASC
    LIMIT ? OFFSET ?
  `).all(...args, limit, offset)

  return NextResponse.json({ contacts, total, pages: Math.max(1, Math.ceil(total / limit)) })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const list = db.prepare('SELECT id FROM lists WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { contact_ids, added } = await req.json()
  let count = 0
  for (const cid of contact_ids as string[]) {
    db.prepare('INSERT OR IGNORE INTO contact_lists (contact_id, list_id) VALUES (?, ?)').run(cid, id)
    count++
  }
  return NextResponse.json({ ok: true, added: count })
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
