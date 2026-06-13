import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { contacts, list_ids = [] } = body as {
    contacts: Array<{ email: string; first_name?: string; last_name?: string; phone?: string; company?: string }>
    list_ids: string[]
  }

  if (!Array.isArray(contacts) || !contacts.length) return NextResponse.json({ error: 'No contacts provided' }, { status: 400 })

  const db = getDb()
  let imported = 0
  let skipped = 0
  let updated = 0

  const insertContact = db.prepare('INSERT OR IGNORE INTO contacts (id, user_id, email, first_name, last_name, phone, company) VALUES (?, ?, ?, ?, ?, ?, ?)')
  const updateContact = db.prepare("UPDATE contacts SET first_name=COALESCE(?, first_name), last_name=COALESCE(?, last_name), phone=COALESCE(?, phone), company=COALESCE(?, company), updated_at=datetime('now') WHERE user_id=? AND email=?")
  const insertList = db.prepare('INSERT OR IGNORE INTO contact_lists (contact_id, list_id) VALUES (?, ?)')
  const getContact = db.prepare('SELECT id FROM contacts WHERE user_id = ? AND email = ?')

  const doImport = db.transaction(() => {
    for (const c of contacts) {
      if (!c.email || !c.email.includes('@')) { skipped++; continue }
      const email = c.email.toLowerCase().trim()
      const existing = getContact.get(session.id, email) as { id: string } | undefined

      if (existing) {
        updateContact.run(c.first_name || null, c.last_name || null, c.phone || null, c.company || null, session.id, email)
        for (const lid of list_ids) insertList.run(existing.id, lid)
        updated++
      } else {
        const id = crypto.randomUUID()
        const result = insertContact.run(id, session.id, email, c.first_name || null, c.last_name || null, c.phone || null, c.company || null)
        if (result.changes > 0) {
          for (const lid of list_ids) insertList.run(id, lid)
          imported++
        } else skipped++
      }
    }
  })

  doImport()
  return NextResponse.json({ imported, updated, skipped })
}
