import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()

  db.prepare("UPDATE scheduled_campaigns SET status = 'cancelled' WHERE campaign_id = ? AND user_id = ? AND status = 'pending'").run(id, session.id)
  db.prepare("UPDATE campaigns SET status = 'draft', scheduled_at = NULL, updated_at = datetime('now') WHERE id = ? AND user_id = ?").run(id, session.id)

  // If this campaign was pre-created for a template group item, remove that item
  db.prepare("DELETE FROM template_group_items WHERE campaign_id = ? AND status = 'pending'").run(id)

  return NextResponse.json({ ok: true })
}
