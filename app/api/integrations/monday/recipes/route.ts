import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const recipes = db.prepare(`
    SELECT r.*,
      (SELECT COUNT(*) FROM monday_recipe_runs WHERE recipe_id = r.id) as total_runs,
      (SELECT created_at FROM monday_recipe_runs WHERE recipe_id = r.id ORDER BY created_at DESC LIMIT 1) as last_run_at
    FROM monday_recipes r
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `).all(session.id)
  return NextResponse.json(recipes)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { name } = body
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const db = getDb()
  const id = crypto.randomUUID()
  db.prepare(`
    INSERT INTO monday_recipes (id, user_id, name, trigger_board_id, trigger_column_id, steps, status)
    VALUES (?, ?, ?, '', '', '[]', 'paused')
  `).run(id, session.id, name)
  return NextResponse.json({ id, ok: true }, { status: 201 })
}
