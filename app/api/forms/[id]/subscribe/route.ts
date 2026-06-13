import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { parseJsonSafe } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const form = db.prepare('SELECT * FROM forms WHERE id = ? AND active = 1').get(id) as Record<string, unknown> | undefined
  if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 })

  const body = await req.json()
  const { email, first_name, last_name } = body
  if (!email || !email.includes('@')) return NextResponse.json({ error: 'Valid email required' }, { status: 400 })

  const userId = form.user_id as string
  const listId = form.list_id as string | null

  const existing = db.prepare('SELECT id FROM contacts WHERE user_id = ? AND email = ?').get(userId, email.toLowerCase().trim()) as { id: string } | undefined
  let contactId: string

  if (existing) {
    db.prepare("UPDATE contacts SET status = 'subscribed', updated_at = datetime('now') WHERE id = ?").run(existing.id)
    contactId = existing.id
  } else {
    contactId = crypto.randomUUID()
    db.prepare('INSERT INTO contacts (id, user_id, email, first_name, last_name, source) VALUES (?, ?, ?, ?, ?, ?)').run(contactId, userId, email.toLowerCase().trim(), first_name || null, last_name || null, 'form')
  }

  if (listId) {
    db.prepare('INSERT OR IGNORE INTO contact_lists (contact_id, list_id) VALUES (?, ?)').run(contactId, listId)
  }

  db.prepare("UPDATE forms SET submissions = submissions + 1 WHERE id = ?").run(id)

  const config = parseJsonSafe<Record<string, unknown>>(form.config as string, {})
  const successMessage = (config.success_message as string) || 'Thank you for subscribing!'
  return NextResponse.json({ ok: true, message: successMessage })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
