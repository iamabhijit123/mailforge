import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const auto = db.prepare('SELECT id FROM automations WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!auto) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json()
  const fields = ['name', 'trigger_type', 'trigger_config', 'steps', 'status']
  const updates: string[] = []
  const values: unknown[] = []
  for (const f of fields) {
    if (f in body) {
      updates.push(`${f} = ?`)
      values.push(f === 'trigger_config' || f === 'steps' ? JSON.stringify(body[f]) : body[f])
    }
  }
  if (updates.length) db.prepare(`UPDATE automations SET ${updates.join(', ')} WHERE id = ?`).run(...values, id)
  return NextResponse.json(db.prepare('SELECT * FROM automations WHERE id = ?').get(id))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  db.prepare('DELETE FROM automations WHERE id = ? AND user_id = ?').run(id, session.id)
  return NextResponse.json({ ok: true })
}
