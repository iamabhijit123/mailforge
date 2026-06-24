import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAdminSettings } from '@/lib/admin'
import { getDb } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    if (record) db.prepare('UPDATE domain_verifications SET user_id = ? WHERE id = ?').run(session.id, id)
  }
  if (!record) return NextResponse.json({ error: 'Domain not found' }, { status: 404 })

  const { postmark_account_api_key } = getAdminSettings()
  if (!postmark_account_api_key) return NextResponse.json({ error: 'Postmark Account API token not configured' }, { status: 400 })

  const pmId = record.postmark_domain_id as string
  const headers = { Accept: 'application/json', 'X-Postmark-Account-Token': postmark_account_api_key }

  try {
    // Trigger DKIM verification
    await fetch(`https://api.postmarkapp.com/domains/${pmId}/verifyDkim`, { method: 'PUT', headers })

    // Fetch latest domain status from Postmark
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
