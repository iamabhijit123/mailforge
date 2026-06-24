import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAdminSettings } from '@/lib/admin'
import { getDb } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const domains = getDb().prepare('SELECT * FROM domain_verifications WHERE user_id = ? ORDER BY created_at DESC').all(session.id)
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
  if (!adminSettings.postmark_api_key) return NextResponse.json({ error: 'Postmark API key not configured. Ask the admin to add it under Admin → Settings.' }, { status: 400 })

  const db = getDb()
  const existing = db.prepare('SELECT * FROM domain_verifications WHERE domain = ?').get(cleanDomain) as Record<string, unknown> | undefined
  if (existing) {
    if (existing.user_id !== session.id) return NextResponse.json({ error: 'This domain is already registered by another account.' }, { status: 409 })
    return NextResponse.json({ domain: existing })
  }

  // Create domain in Postmark
  try {
    const pmRes = await fetch('https://api.postmarkapp.com/domains', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': adminSettings.postmark_api_key,
      },
      body: JSON.stringify({ Name: cleanDomain }),
    })

    const pmData = await pmRes.json() as Record<string, unknown>

    if (!pmRes.ok) {
      // ErrorCode 505 = domain already in Postmark under this server — fetch its details
      if (pmData.ErrorCode === 505) {
        return NextResponse.json({ error: 'This domain already exists in Postmark. If it belongs to you, remove it from Postmark first.' }, { status: 409 })
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
