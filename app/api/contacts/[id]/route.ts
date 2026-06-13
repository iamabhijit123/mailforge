import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const lists = db.prepare(`
    SELECT l.* FROM lists l
    JOIN contact_lists cl ON cl.list_id = l.id
    WHERE cl.contact_id = ?
  `).all(id)

  return NextResponse.json({ ...contact as object, lists })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const db = getDb()
  const contact = db.prepare('SELECT id FROM contacts WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const fields = ['email', 'first_name', 'last_name', 'phone', 'company', 'status', 'tags', 'custom_fields']
  const updates: string[] = []
  const values: unknown[] = []

  for (const f of fields) {
    if (f in body) {
      updates.push(`${f} = ?`)
      values.push(f === 'tags' || f === 'custom_fields' ? JSON.stringify(body[f]) : body[f])
    }
  }
  if (updates.length) {
    updates.push("updated_at = datetime('now')")
    db.prepare(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`).run(...values, id)
  }

  if (body.list_ids !== undefined) {
    db.prepare('DELETE FROM contact_lists WHERE contact_id = ?').run(id)
    for (const lid of body.list_ids as string[]) {
      db.prepare('INSERT OR IGNORE INTO contact_lists (contact_id, list_id) VALUES (?, ?)').run(id, lid)
    }
  }

  return NextResponse.json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(id))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const contact = db.prepare('SELECT id FROM contacts WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  db.prepare('DELETE FROM contacts WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
