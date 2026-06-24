import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAdminSettings } from '@/lib/admin'
import { getDb } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  // Primary lookup by user_id; also catch records whose user_id drifted after a DB wipe
  // by joining on email so the same person's domains survive a redeploy.
  let domains = db.prepare(
    'SELECT * FROM domain_verifications WHERE user_id = ? ORDER BY created_at DESC'
  ).all(session.id)

  if (domains.length === 0) {
    // Fallback: find stale records belonging to any user with the same email (DB wipe scenario)
    const stale = db.prepare(`
      SELECT dv.* FROM domain_verifications dv
      JOIN users u ON u.id = dv.user_id
      WHERE lower(u.email) = lower(?)
      ORDER BY dv.created_at DESC
    `).all(session.email) as Array<Record<string, unknown>>

    if (stale.length > 0) {
      // Reassign all stale records to the current session user_id
      for (const row of stale) {
        db.prepare('UPDATE domain_verifications SET user_id = ? WHERE id = ?').run(session.id, row.id)
      }
      domains = db.prepare(
        'SELECT * FROM domain_verifications WHERE user_id = ? ORDER BY created_at DESC'
      ).all(session.id)
    }
  }

  return NextResponse.json({ domains })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.isOwner) return NextResponse.json({ error: 'Only account owners can add domains' }, { status: 403 })

  const { domain } = await req.json()
  if (!domain) return NextResponse.json({ error: 'Domain is required' }, { status: 400 })

  // Normalise: strip protocol, www, trailing path
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
    if (existing.user_id === session.id) {
      // Same user, just return the existing record
      return NextResponse.json({ domain: existing })
    }

    // Different user_id — check if it's actually the same person (DB wipe / redeploy scenario)
    const originalOwner = db.prepare('SELECT email FROM users WHERE id = ?').get(existing.user_id as string) as { email: string } | undefined
    if (originalOwner && originalOwner.email.toLowerCase() === session.email.toLowerCase()) {
      // Reassign to current session user_id and return
      db.prepare('UPDATE domain_verifications SET user_id = ? WHERE id = ?').run(session.id, existing.id)
      return NextResponse.json({ domain: db.prepare('SELECT * FROM domain_verifications WHERE id = ?').get(existing.id) })
    }

    return NextResponse.json({ error: 'This domain is already registered by another account.' }, { status: 409 })
  }

  // Create domain in Postmark
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
        // Domain already exists in Postmark — fetch its current details
        return NextResponse.json({
          error: 'This domain already exists in Postmark. Remove it from Postmark Domains first, then try again.',
        }, { status: 409 })
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
