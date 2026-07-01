import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

function extractText(value: unknown): string {
  if (!value) return ''
  if (typeof value !== 'object') return String(value).trim()
  const v = value as Record<string, unknown>
  const raw = v.email ?? v.text ?? v.value ?? (v.label as { text?: string } | null)?.text ?? v.checked ?? ''
  return String(raw).trim()
}

type RecipeRow = { id: string; user_id: string; steps: string; trigger_value: string | null }
type Step = { id: string; type: string; config: Record<string, unknown> }

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ ok: true }) }

  // Monday.com challenge handshake
  if (body.challenge) return NextResponse.json({ challenge: body.challenge })

  const event = body.event as Record<string, unknown> | undefined
  if (!event) return NextResponse.json({ ok: true })

  const boardId = String(event.boardId || '')
  const columnId = String(event.columnId || '')
  if (!boardId || !columnId) return NextResponse.json({ ok: true })

  const triggerText = extractText(event.value)
  const triggerEmail = triggerText.includes('@') ? triggerText.toLowerCase() : ''
  const triggerItemName = String(event.pulseName || '')

  const db = getDb()

  const recipes = db.prepare(`
    SELECT * FROM monday_recipes
    WHERE trigger_board_id = ? AND trigger_column_id = ? AND status = 'active'
  `).all(boardId, columnId) as RecipeRow[]

  for (const recipe of recipes) {
    // Optional trigger-value filter (contains check)
    if (recipe.trigger_value && !triggerText.toLowerCase().includes(recipe.trigger_value.toLowerCase())) continue

    const steps: Step[] = JSON.parse(recipe.steps || '[]')
    const log: Array<{ type: string; result: string; detail?: string }> = []
    let contactId: string | null = null
    let stopped = false

    for (const step of steps) {
      if (stopped) break
      try {
        switch (step.type) {
          case 'filter': {
            const { operator = 'not_empty', value: fv = '' } = step.config as { operator?: string; value?: string }
            const test = triggerText
            const passes =
              operator === 'not_empty' ? !!test :
              operator === 'is_empty' ? !test :
              operator === 'equals' ? test === fv :
              operator === 'not_equals' ? test !== fv :
              operator === 'contains' ? test.includes(fv) :
              operator === 'not_contains' ? !test.includes(fv) : true
            if (!passes) { log.push({ type: 'filter', result: 'filtered_out' }); stopped = true }
            else log.push({ type: 'filter', result: 'passed' })
            break
          }

          case 'find_or_create_contact': {
            const src = step.config.email_source === 'item_name' ? triggerItemName : triggerEmail
            const email = src.toLowerCase().trim()
            if (!email || !email.includes('@')) {
              log.push({ type: 'find_or_create_contact', result: 'error', detail: `No valid email (got "${src}")` }); break
            }
            const existing = db.prepare('SELECT id FROM contacts WHERE user_id = ? AND LOWER(email) = ?')
              .get(recipe.user_id, email) as { id: string } | undefined
            if (existing) {
              contactId = existing.id
              log.push({ type: 'find_or_create_contact', result: 'found', detail: email })
            } else {
              contactId = crypto.randomUUID()
              const parts = triggerItemName.split(/\s+/)
              db.prepare(`INSERT INTO contacts (id, user_id, email, first_name, last_name, status, source) VALUES (?, ?, ?, ?, ?, 'subscribed', 'monday_recipe')`)
                .run(contactId, recipe.user_id, email, parts[0] || null, parts.slice(1).join(' ') || null)
              log.push({ type: 'find_or_create_contact', result: 'created', detail: email })
            }
            break
          }

          case 'create_contact': {
            const email = triggerEmail
            if (!email) { log.push({ type: 'create_contact', result: 'error', detail: 'No valid email' }); break }
            contactId = crypto.randomUUID()
            const parts = triggerItemName.split(/\s+/)
            db.prepare(`INSERT OR REPLACE INTO contacts (id, user_id, email, first_name, last_name, status, source) VALUES (?, ?, ?, ?, ?, 'subscribed', 'monday_recipe')`)
              .run(contactId, recipe.user_id, email, parts[0] || null, parts.slice(1).join(' ') || null)
            log.push({ type: 'create_contact', result: 'done', detail: email })
            break
          }

          case 'add_to_list': {
            if (!contactId) { log.push({ type: 'add_to_list', result: 'skipped', detail: 'No contact' }); break }
            const ids = (step.config.list_ids as string[]) || []
            for (const lid of ids) db.prepare('INSERT OR IGNORE INTO contact_lists (contact_id, list_id) VALUES (?, ?)').run(contactId, lid)
            log.push({ type: 'add_to_list', result: 'done', detail: `${ids.length} list(s)` })
            break
          }

          case 'remove_from_list': {
            if (!contactId) { log.push({ type: 'remove_from_list', result: 'skipped', detail: 'No contact' }); break }
            const ids = (step.config.list_ids as string[]) || []
            for (const lid of ids) db.prepare('DELETE FROM contact_lists WHERE contact_id = ? AND list_id = ?').run(contactId, lid)
            log.push({ type: 'remove_from_list', result: 'done', detail: `${ids.length} list(s)` })
            break
          }

          case 'update_contact': {
            if (!contactId) { log.push({ type: 'update_contact', result: 'skipped', detail: 'No contact' }); break }
            const parts = triggerItemName.split(/\s+/)
            const sets: string[] = []; const vals: unknown[] = []
            if (step.config.first_name_source === 'item_name_first') { sets.push('first_name = ?'); vals.push(parts[0] || null) }
            if (step.config.last_name_source === 'item_name_last') { sets.push('last_name = ?'); vals.push(parts.slice(1).join(' ') || null) }
            if (sets.length) db.prepare(`UPDATE contacts SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...vals, contactId)
            log.push({ type: 'update_contact', result: 'done' })
            break
          }

          case 'delay':
            log.push({ type: 'delay', result: 'skipped', detail: 'Runs synchronously in webhook mode' })
            break
        }
      } catch (err) {
        log.push({ type: step.type, result: 'error', detail: (err as Error).message })
      }
    }

    const runStatus = stopped ? 'filtered' : 'done'
    db.prepare('INSERT INTO monday_recipe_runs (id, recipe_id, status, trigger_email, trigger_item, run_log) VALUES (?, ?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), recipe.id, runStatus, triggerEmail || triggerText, triggerItemName, JSON.stringify(log))
    db.prepare('UPDATE monday_recipes SET run_count = run_count + 1 WHERE id = ?').run(recipe.id)
  }

  return NextResponse.json({ ok: true, matched: recipes.length })
}
