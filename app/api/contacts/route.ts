import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const status = searchParams.get('status') || ''
  const listId = searchParams.get('list_id') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const perPage = 50

  const db = getDb()
  let query = 'SELECT c.* FROM contacts c'
  const params: unknown[] = [session.id]
  const conditions = ['c.user_id = ?']

  if (listId) {
    query += ' JOIN contact_lists cl ON cl.contact_id = c.id'
    conditions.push('cl.list_id = ?')
    params.push(listId)
  }

  if (q) {
    conditions.push('(c.email LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR c.company LIKE ?)')
    const like = `%${q}%`
    params.push(like, like, like, like)
  }
  if (status) {
    conditions.push('c.status = ?')
    params.push(status)
  }

  query += ' WHERE ' + conditions.join(' AND ')
  const total = (db.prepare(query.replace('SELECT c.*', 'SELECT COUNT(*) as count')).get(...params) as { count: number }).count

  query += ` ORDER BY c.created_at DESC LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`
  const contacts = db.prepare(query).all(...params)

  return NextResponse.json({ contacts, total, page, pages: Math.ceil(total / perPage) })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { email, first_name, last_name, phone, company, tags = [], custom_fields = {}, list_ids = [] } = body

  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const db = getDb()
  const existing = db.prepare('SELECT id FROM contacts WHERE user_id = ? AND email = ?').get(session.id, email.toLowerCase().trim()) as { id: string } | undefined

  let contactId: string
  if (existing) {
    db.prepare(`UPDATE contacts SET first_name=?, last_name=?, phone=?, company=?, tags=?, custom_fields=?, updated_at=datetime('now') WHERE id=?`)
      .run(first_name || null, last_name || null, phone || null, company || null, JSON.stringify(tags), JSON.stringify(custom_fields), existing.id)
    contactId = existing.id
  } else {
    contactId = crypto.randomUUID()
    db.prepare('INSERT INTO contacts (id, user_id, email, first_name, last_name, phone, company, tags, custom_fields) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(contactId, session.id, email.toLowerCase().trim(), first_name || null, last_name || null, phone || null, company || null, JSON.stringify(tags), JSON.stringify(custom_fields))
  }

  for (const listId of list_ids) {
    db.prepare('INSERT OR IGNORE INTO contact_lists (contact_id, list_id) VALUES (?, ?)').run(contactId, listId)
  }

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId)
  return NextResponse.json(contact, { status: existing ? 200 : 201 })
}
