import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { noteId } = await params
  const db = getDb()
  db.prepare('DELETE FROM contact_notes WHERE id = ? AND user_id = ?').run(noteId, session.id)
  return NextResponse.json({ ok: true })
}
