import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAdminSettings } from '@/lib/admin'
import { getDb } from '@/lib/db'

function canClaim(db: ReturnType<typeof getDb>, domainRow: Record<string, unknown>, sessionId: string, sessionEmail: string): boolean {
  if (domainRow.user_id === sessionId) return true
  const original = db.prepare('SELECT email FROM users WHERE id = ?').get(domainRow.user_id as string) as { email: string } | undefined
  if (!original) return true // orphaned — original user deleted
  return original.email.toLowerCase() === sessionEmail.toLowerCase()
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const db = getDb()
  const record = db.prepare('SELECT * FROM domain_verifications WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canClaim(db, record, session.id, session.email)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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
