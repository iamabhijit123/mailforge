import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  return NextResponse.json(db.prepare('SELECT * FROM automations WHERE user_id = ? ORDER BY created_at DESC').all(session.id))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, trigger_type, trigger_config = {}, steps = [] } = await req.json()
  if (!name || !trigger_type) return NextResponse.json({ error: 'Name and trigger required' }, { status: 400 })
  const db = getDb()
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO automations (id, user_id, name, trigger_type, trigger_config, steps) VALUES (?, ?, ?, ?, ?, ?)').run(id, session.id, name.trim(), trigger_type, JSON.stringify(trigger_config), JSON.stringify(steps))
  return NextResponse.json(db.prepare('SELECT * FROM automations WHERE id = ?').get(id), { status: 201 })
}
