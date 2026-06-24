import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAdminSettings } from '@/lib/admin'
import { getDb } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const db = getDb()
  // Accept by user_id OR by owner email (handles DB-wipe user_id drift)
  let record = db.prepare('SELECT * FROM domain_verifications WHERE id = ? AND user_id = ?').get(id, session.id) as Record<string, unknown> | undefined
  if (!record) {
    record = db.prepare(`
      SELECT dv.* FROM domain_verifications dv
      JOIN users u ON u.id = dv.user_id
      WHERE dv.id = ? AND lower(u.email) = lower(?)
    `).get(id, session.email) as Record<string, unknown> | undefined
  }
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Remove from Postmark (non-fatal if it fails)
  const { postmark_account_api_key } = getAdminSettings()
  if (postmark_account_api_key && record.postmark_domain_id) {
    try {
      await fetch(`https://api.postmarkapp.com/domains/${record.postmark_domain_id}`, {
        method: 'DELETE',
        headers: { 'X-Postmark-Account-Token': postmark_account_api_key },
      })
    } catch { /* non-fatal */ }
  }

  db.prepare('DELETE FROM domain_verifications WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
