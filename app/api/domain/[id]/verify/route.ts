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

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const db = getDb()
  const record = db.prepare('SELECT * FROM domain_verifications WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!record) return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
  if (!canClaim(db, record, session.id, session.email)) return NextResponse.json({ error: 'Domain not found' }, { status: 404 })

  // Migrate user_id to current session if needed
  if (record.user_id !== session.id) {
    db.prepare('UPDATE domain_verifications SET user_id = ? WHERE id = ?').run(session.id, id)
  }

  const { postmark_account_api_key } = getAdminSettings()
  if (!postmark_account_api_key) return NextResponse.json({ error: 'Postmark Account API token not configured' }, { status: 400 })

  const pmId = record.postmark_domain_id as string
  const headers = { Accept: 'application/json', 'X-Postmark-Account-Token': postmark_account_api_key }

  try {
    await fetch(`https://api.postmarkapp.com/domains/${pmId}/verifyDkim`, { method: 'PUT', headers })

    const detRes = await fetch(`https://api.postmarkapp.com/domains/${pmId}`, { headers })
    if (!detRes.ok) return NextResponse.json({ error: 'Could not fetch domain status from Postmark' }, { status: 400 })

    const det = await detRes.json() as Record<string, unknown>
    const dkimVerified = det.DKIMVerified ? 1 : 0
    const returnVerified = det.ReturnPathDomainVerified ? 1 : 0
    const fullyVerified = dkimVerified === 1

    db.prepare(`
      UPDATE domain_verifications SET
        dkim_verified = ?, return_path_verified = ?,
        dkim_host = ?, dkim_value = ?,
        return_path_host = ?, return_path_value = ?,
        status = ?,
        verified_at = CASE WHEN ? = 1 THEN datetime('now') ELSE verified_at END
      WHERE id = ?
    `).run(
      dkimVerified, returnVerified,
      det.DKIMHost, det.DKIMTextValue,
      det.ReturnPathDomain, det.ReturnPathDomainCNAMEValue,
      fullyVerified ? 'verified' : 'pending',
      fullyVerified ? 1 : 0,
      id,
    )

    return NextResponse.json({
      domain: db.prepare('SELECT * FROM domain_verifications WHERE id = ?').get(id),
      verified: fullyVerified,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
