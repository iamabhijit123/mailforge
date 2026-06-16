import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

async function mondayQuery(api_key: string, query: string) {
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': api_key,
      'API-Version': '2023-10',
    },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`Monday.com API error: ${res.status}`)
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0]?.message || 'Monday.com API error')
  return json.data
}

// GET /api/integrations/monday?action=boards
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const s = db.prepare('SELECT monday_api_key FROM settings WHERE user_id = ?').get(session.id) as { monday_api_key: string | null } | undefined
  const key = s?.monday_api_key
  if (!key) return NextResponse.json({ error: 'Monday.com not configured' }, { status: 400 })

  try {
    const data = await mondayQuery(key, `{ boards(limit: 50, order_by: used_at) { id name description } }`)
    return NextResponse.json({ boards: data.boards || [] })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}

// POST /api/integrations/monday  body: { board_id: string, list_id?: string }
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const s = db.prepare('SELECT monday_api_key FROM settings WHERE user_id = ?').get(session.id) as { monday_api_key: string | null } | undefined
  const key = s?.monday_api_key
  if (!key) return NextResponse.json({ error: 'Monday.com not configured' }, { status: 400 })

  const { board_id, list_id } = await req.json()
  if (!board_id) return NextResponse.json({ error: 'board_id required' }, { status: 400 })

  try {
    const data = await mondayQuery(key, `{
      boards(ids: [${board_id}]) {
        items_page(limit: 500) {
          items {
            id name
            column_values { id value text type column { title } }
          }
        }
      }
    }`)

    const items = data.boards?.[0]?.items_page?.items || []
    let imported = 0, updated = 0, skipped = 0

    const insertContact = db.prepare(`
      INSERT INTO contacts (id, user_id, email, first_name, last_name, company, status, source)
      VALUES (?, ?, ?, ?, ?, ?, 'subscribed', 'monday')
      ON CONFLICT(user_id, email) DO UPDATE SET
        first_name = COALESCE(excluded.first_name, first_name),
        last_name = COALESCE(excluded.last_name, last_name),
        company = COALESCE(excluded.company, company),
        updated_at = datetime('now')
    `)

    const addToList = list_id
      ? db.prepare('INSERT OR IGNORE INTO contact_lists (contact_id, list_id) VALUES (?, ?)')
      : null

    const tx = db.transaction(() => {
      for (const item of items) {
        // Find email columns
        type ColValue = { type: string; text: string; value?: string; column?: { title: string } }
        const emailCols = item.column_values.filter((cv: ColValue) =>
          cv.type === 'email' || cv.column?.title?.toLowerCase().includes('email')
        )
        const email = emailCols[0]?.text?.trim() || emailCols[0]?.value?.replace(/[^@\w.+\-]/g, '').trim()
        if (!email || !email.includes('@')) { skipped++; continue }

        // Extract name parts from item name
        const nameParts = item.name?.trim().split(/\s+/) || []
        const first_name = nameParts[0] || null
        const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null

        // Find company column
        const companyCols = item.column_values.filter((cv: { column: { title: string } }) =>
          cv.column?.title?.toLowerCase().includes('company') || cv.column?.title?.toLowerCase().includes('organization')
        )
        const company = companyCols[0]?.text?.trim() || null

        const id = crypto.randomUUID()
        const result = insertContact.run(id, session.id, email.toLowerCase(), first_name, last_name, company)
        if (result.changes > 0) {
          if (result.lastInsertRowid) imported++; else updated++
          if (addToList) addToList.run(id, list_id)
        } else {
          skipped++
        }
      }
    })
    tx()

    return NextResponse.json({ imported, updated, skipped, total: items.length })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
