import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

async function mondayMutation(api_key: string, query: string) {
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: api_key, 'API-Version': '2023-10' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`Monday.com API error: ${res.status}`)
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0]?.message || 'Monday.com API error')
  return json.data
}

type DbRecipe = {
  id: string; user_id: string; name: string; status: string
  trigger_board_id: string; trigger_column_id: string
  webhook_id: string | null; steps: string
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const recipe = db.prepare('SELECT * FROM monday_recipes WHERE id = ? AND user_id = ?').get(params.id, session.id)
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const runs = db.prepare('SELECT * FROM monday_recipe_runs WHERE recipe_id = ? ORDER BY created_at DESC LIMIT 30').all(params.id)
  return NextResponse.json({ ...recipe, runs })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()

  const recipe = db.prepare('SELECT * FROM monday_recipes WHERE id = ? AND user_id = ?').get(params.id, session.id) as DbRecipe | undefined
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const {
    name, status,
    trigger_board_id, trigger_board_name,
    trigger_column_id, trigger_column_name,
    trigger_value, steps,
  } = body

  const s = db.prepare('SELECT monday_api_key FROM settings WHERE user_id = ?').get(session.id) as { monday_api_key: string | null } | undefined
  const apiKey = s?.monday_api_key

  const newBoardId = trigger_board_id ?? recipe.trigger_board_id
  const newColumnId = trigger_column_id ?? recipe.trigger_column_id
  const newStatus = status ?? recipe.status
  const boardChanged = newBoardId !== recipe.trigger_board_id || newColumnId !== recipe.trigger_column_id
  const activating = newStatus === 'active' && (recipe.status !== 'active' || boardChanged)
  const deactivating = newStatus === 'paused' && recipe.status === 'active'

  let webhookId = recipe.webhook_id

  if (apiKey) {
    // Remove old webhook if deactivating or trigger changed
    if ((deactivating || boardChanged) && recipe.webhook_id) {
      try {
        await mondayMutation(apiKey, `mutation { delete_webhook(id: ${recipe.webhook_id}) { id } }`)
      } catch { /* non-fatal */ }
      webhookId = null
    }

    // Register new webhook if activating
    if (activating && !deactivating && newBoardId) {
      try {
        const host = req.headers.get('host') || ''
        const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
        const webhookUrl = `${proto}://${host}/api/webhooks/monday`
        const colConfig = JSON.stringify({ columnId: newColumnId }).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
        const data = await mondayMutation(apiKey, `mutation { create_webhook(board_id: ${newBoardId}, url: "${webhookUrl}", event: change_specific_column_value, config: "${colConfig}") { id } }`)
        webhookId = data?.create_webhook?.id ?? null
      } catch (e) {
        console.error('Webhook registration failed:', (e as Error).message)
        // Save recipe but return warning
      }
    }
  }

  db.prepare(`
    UPDATE monday_recipes SET
      name = COALESCE(?, name),
      status = COALESCE(?, status),
      trigger_board_id = COALESCE(?, trigger_board_id),
      trigger_board_name = ?,
      trigger_column_id = COALESCE(?, trigger_column_id),
      trigger_column_name = ?,
      trigger_value = ?,
      steps = COALESCE(?, steps),
      webhook_id = ?,
      updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(
    name ?? null, status ?? null,
    trigger_board_id ?? null, trigger_board_name ?? null,
    trigger_column_id ?? null, trigger_column_name ?? null,
    trigger_value ?? null,
    steps != null ? JSON.stringify(steps) : null,
    webhookId,
    params.id, session.id,
  )

  return NextResponse.json({ ok: true, webhook_id: webhookId })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()

  const recipe = db.prepare('SELECT * FROM monday_recipes WHERE id = ? AND user_id = ?').get(params.id, session.id) as DbRecipe | undefined
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (recipe.webhook_id) {
    const s = db.prepare('SELECT monday_api_key FROM settings WHERE user_id = ?').get(session.id) as { monday_api_key: string | null } | undefined
    if (s?.monday_api_key) {
      try { await mondayMutation(s.monday_api_key, `mutation { delete_webhook(id: ${recipe.webhook_id}) { id } }`) } catch { /* non-fatal */ }
    }
  }

  db.prepare('DELETE FROM monday_recipe_runs WHERE recipe_id = ?').run(params.id)
  db.prepare('DELETE FROM monday_recipes WHERE id = ? AND user_id = ?').run(params.id, session.id)
  return NextResponse.json({ ok: true })
}
