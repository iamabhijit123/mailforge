import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAdminSettings } from '@/lib/admin'
import { getDb } from '@/lib/db'
import { randomUUID } from 'crypto'

// Returns whether the current session user can claim a domain_verifications row.
// They can if: (a) they already own it, (b) the original user no longer exists,
// or (c) the original user has the same email (DB-wipe user_id drift).
function canClaim(db: ReturnType<typeof getDb>, domainRow: Record<string, unknown>, sessionId: string, sessionEmail: string): boolean {
  if (domainRow.user_id === sessionId) return true
  const original = db.prepare('SELECT email FROM users WHERE id = ?').get(domainRow.user_id as string) as { email: string } | undefined
  if (!original) return true // original user deleted — orphaned record, first claimer wins
  return original.email.toLowerCase() === sessionEmail.toLowerCase()
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()

  // Fetch all domain rows that belong to this user OR are claimable by them
  const all = db.prepare('SELECT * FROM domain_verifications ORDER BY created_at DESC').all() as Array<Record<string, unknown>>

  const mine: Array<Record<string, unknown>> = []
  for (const row of all) {
    if (canClaim(db, row, session.id, session.email)) {
      // Migrate user_id to current session if needed
      if (row.user_id !== session.id) {
        db.prepare('UPDATE domain_verifications SET user_id = ? WHERE id = ?').run(session.id, row.id)
        row.user_id = session.id
      }
      mine.push(row)
    }
  }

  return NextResponse.json({ domains: mine })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.isOwner) return NextResponse.json({ error: 'Only account owners can add domains' }, { status: 403 })

  const { domain } = await req.json()
  if (!domain) return NextResponse.json({ error: 'Domain is required' }, { status: 400 })

  const cleanDomain = domain.toLowerCase().trim()
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]
    .split(':')[0]

  if (!cleanDomain || !cleanDomain.includes('.')) return NextResponse.json({ error: 'Enter a valid domain (e.g. example.com)' }, { status: 400 })

  const adminSettings = getAdminSettings()
  if (!adminSettings.postmark_account_api_key) return NextResponse.json({ error: 'Postmark Account API token not configured. Ask the admin to add it under Admin → Settings.' }, { status: 400 })

  const db = getDb()
  const existing = db.prepare('SELECT * FROM domain_verifications WHERE domain = ?').get(cleanDomain) as Record<string, unknown> | undefined

  if (existing) {
    if (canClaim(db, existing, session.id, session.email)) {
      // Reassign to current user if needed and return existing record
      if (existing.user_id !== session.id) {
        db.prepare('UPDATE domain_verifications SET user_id = ? WHERE id = ?').run(session.id, existing.id)
      }
      return NextResponse.json({ domain: db.prepare('SELECT * FROM domain_verifications WHERE id = ?').get(existing.id) })
    }
    return NextResponse.json({ error: 'This domain is already registered by another account.' }, { status: 409 })
  }

  try {
    const pmRes = await fetch('https://api.postmarkapp.com/domains', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Account-Token': adminSettings.postmark_account_api_key,
      },
      body: JSON.stringify({ Name: cleanDomain }),
    })

    const pmData = await pmRes.json() as Record<string, unknown>

    if (!pmRes.ok) {
      if ((pmData.ErrorCode as number) === 505) {
        return NextResponse.json({ error: 'This domain already exists in Postmark. Remove it from Postmark Domains first, then try again.' }, { status: 409 })
      }
      return NextResponse.json({ error: (pmData.Message as string) || 'Postmark error' }, { status: 400 })
    }

    const id = randomUUID()
    db.prepare(`
      INSERT INTO domain_verifications
        (id, user_id, domain, postmark_domain_id, dkim_host, dkim_value, dkim_verified, return_path_host, return_path_value, return_path_verified, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      id, session.id, cleanDomain, String(pmData.ID),
      pmData.DKIMHost, pmData.DKIMTextValue,
      pmData.DKIMVerified ? 1 : 0,
      pmData.ReturnPathDomain, pmData.ReturnPathDomainCNAMEValue,
      pmData.ReturnPathDomainVerified ? 1 : 0,
    )

    return NextResponse.json({ domain: db.prepare('SELECT * FROM domain_verifications WHERE id = ?').get(id) })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
