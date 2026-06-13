import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { DEFAULT_BLOCKS, generateEmailHtml } from '@/lib/email-html'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const templates = db.prepare('SELECT id, name, category, subject, is_system, created_at, updated_at, html_body FROM templates WHERE user_id = ? OR is_system = 1 ORDER BY is_system DESC, created_at DESC').all(session.id)
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, category = 'custom', subject, blocks = DEFAULT_BLOCKS, html_body } = body
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const db = getDb()
  const id = crypto.randomUUID()
  const finalHtml = html_body || generateEmailHtml(blocks)
  db.prepare('INSERT INTO templates (id, user_id, name, category, subject, blocks, html_body) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, session.id, name.trim(), category, subject || null, JSON.stringify(blocks), finalHtml)
  return NextResponse.json(db.prepare('SELECT * FROM templates WHERE id = ?').get(id), { status: 201 })
}
