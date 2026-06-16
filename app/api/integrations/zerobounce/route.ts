import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

// GET /api/integrations/zerobounce?action=credits
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const s = db.prepare('SELECT zerobounce_api_key FROM settings WHERE user_id = ?').get(session.id) as { zerobounce_api_key: string | null } | undefined
  const key = s?.zerobounce_api_key
  if (!key) return NextResponse.json({ error: 'ZeroBounce not configured' }, { status: 400 })

  try {
    const res = await fetch(`https://api.zerobounce.net/v2/getcredits?api_key=${key}`)
    const data = await res.json()
    if (data.Credits === -1) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    return NextResponse.json({ credits: data.Credits })
  } catch {
    return NextResponse.json({ error: 'Failed to connect to ZeroBounce' }, { status: 502 })
  }
}

// POST /api/integrations/zerobounce  body: { list_id?: string }
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const s = db.prepare('SELECT zerobounce_api_key FROM settings WHERE user_id = ?').get(session.id) as { zerobounce_api_key: string | null } | undefined
  const key = s?.zerobounce_api_key
  if (!key) return NextResponse.json({ error: 'ZeroBounce not configured' }, { status: 400 })

  const { list_id } = await req.json().catch(() => ({}))

  // Fetch contacts to validate
  let contacts: { id: string; email: string }[]
  if (list_id) {
    contacts = db.prepare(`
      SELECT c.id, c.email FROM contacts c
      JOIN contact_lists cl ON cl.contact_id = c.id
      WHERE cl.list_id = ? AND c.user_id = ? AND c.status = 'subscribed'
    `).all(list_id, session.id) as { id: string; email: string }[]
  } else {
    contacts = db.prepare(`SELECT id, email FROM contacts WHERE user_id = ? AND status = 'subscribed'`).all(session.id) as { id: string; email: string }[]
  }

  if (contacts.length === 0) return NextResponse.json({ validated: 0, valid: 0, invalid: 0, unknown: 0 })

  // ZeroBounce bulk validate in batches of 100
  const BATCH = 100
  let valid = 0, invalid = 0, unknown = 0
  const invalidIds: string[] = []

  for (let i = 0; i < contacts.length; i += BATCH) {
    const batch = contacts.slice(i, i + BATCH)
    const email_batch = batch.map(c => ({ email_address: c.email, ip_address: '' }))

    try {
      const res = await fetch('https://api.zerobounce.net/v2/validatebatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: key, email_batch }),
      })
      const data = await res.json()
      const results: { address: string; status: string }[] = data.email_batch || []

      for (const r of results) {
        const contact = batch.find(c => c.email.toLowerCase() === r.address.toLowerCase())
        if (!contact) continue
        if (r.status === 'valid') { valid++ }
        else if (r.status === 'invalid' || r.status === 'spamtrap' || r.status === 'abuse' || r.status === 'do_not_mail') {
          invalid++
          invalidIds.push(contact.id)
        } else {
          unknown++ // catch-all, unknown — leave as-is
        }
      }
    } catch {
      // If a batch fails, mark all as unknown
      unknown += batch.length
    }
  }

  // Update invalid contacts to 'bounced'
  if (invalidIds.length > 0) {
    const tx = db.transaction(() => {
      for (let i = 0; i < invalidIds.length; i += 500) {
        const slice = invalidIds.slice(i, i + 500)
        const ph = slice.map(() => '?').join(',')
        db.prepare(`UPDATE contacts SET status = 'bounced' WHERE id IN (${ph})`).run(...slice)
      }
    })
    tx()
  }

  return NextResponse.json({ validated: contacts.length, valid, invalid, unknown })
}
