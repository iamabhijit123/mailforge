import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const s = db.prepare('SELECT zerobounce_api_key, monday_api_key FROM settings WHERE user_id = ?').get(session.id) as {
    zerobounce_api_key: string | null; monday_api_key: string | null
  } | undefined
  return NextResponse.json({
    zerobounce: { connected: !!(s?.zerobounce_api_key), api_key: s?.zerobounce_api_key || '' },
    monday: { connected: !!(s?.monday_api_key), api_key: s?.monday_api_key || '' },
  })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { integration, api_key } = await req.json()
  if (!['zerobounce', 'monday'].includes(integration)) return NextResponse.json({ error: 'Unknown integration' }, { status: 400 })
  const db = getDb()
  const col = integration === 'zerobounce' ? 'zerobounce_api_key' : 'monday_api_key'
  // INSERT the row if it doesn't exist yet, then set the key
  db.prepare(`INSERT OR IGNORE INTO settings (user_id) VALUES (?)`).run(session.id)
  db.prepare(`UPDATE settings SET ${col} = ? WHERE user_id = ?`).run(api_key || null, session.id)
  return NextResponse.json({ ok: true })
}
