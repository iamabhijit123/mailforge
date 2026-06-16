import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const group = db.prepare('SELECT id FROM template_groups WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const items = db.prepare(`
    SELECT tgi.*, t.name as template_name, t.subject as template_subject
    FROM template_group_items tgi
    LEFT JOIN templates t ON t.id = tgi.template_id
    WHERE tgi.group_id = ?
    ORDER BY tgi.position ASC, tgi.scheduled_at ASC
  `).all(id)
  return NextResponse.json(items)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const body = await req.json()
  const { template_id, subject, scheduled_at, position, item_list_id, recipient_email } = body
  if (!template_id || !scheduled_at) return NextResponse.json({ error: 'template_id and scheduled_at required' }, { status: 400 })

  const group = db.prepare('SELECT * FROM template_groups WHERE id = ? AND user_id = ?').get(id, session.id) as Record<string, unknown> | null
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(template_id) as Record<string, unknown> | null
  const settings = db.prepare('SELECT sender_name, sender_email FROM settings WHERE user_id = ?').get(session.id) as { sender_name: string | null; sender_email: string | null } | undefined

  const pos = position ?? (db.prepare('SELECT COALESCE(MAX(position),0)+1 as p FROM template_group_items WHERE group_id = ?').get(id) as { p: number }).p
  const itemId = crypto.randomUUID()

  // Convert local datetime to UTC ISO string so scheduler comparison works across timezones
  const scheduledAtUTC = new Date(scheduled_at).toISOString()

  // Pre-create a campaign with status='scheduled' so it appears in the Campaigns list
  const effectiveListId = item_list_id || (group.list_id as string | null)
  const listIdsJson = recipient_email ? '[]' : (effectiveListId ? JSON.stringify([effectiveListId]) : '[]')
  const campaignSubject = subject || (template?.subject as string) || 'No Subject'
  const fromName = (group.from_name as string) || settings?.sender_name || ''
  const fromEmail = (group.from_email as string) || settings?.sender_email || ''
  const campaignId = crypto.randomUUID()
  db.prepare(`
    INSERT INTO campaigns (id, user_id, name, subject, from_name, from_email, list_ids, blocks, html_body, status, template_id, scheduled_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
  `).run(campaignId, session.id, `[Group] ${template?.name || 'Scheduled'}`, campaignSubject, fromName, fromEmail, listIdsJson, template?.blocks || '[]', template?.html_body || null, template_id, scheduledAtUTC)
  db.prepare('INSERT INTO campaign_stats (campaign_id) VALUES (?)').run(campaignId)

  db.prepare(`
    INSERT INTO template_group_items (id, group_id, template_id, position, subject, scheduled_at, item_list_id, recipient_email, campaign_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(itemId, id, template_id, pos, subject || null, scheduledAtUTC, item_list_id || null, recipient_email || null, campaignId)
  return NextResponse.json(db.prepare(`
    SELECT tgi.*, t.name as template_name, t.subject as template_subject
    FROM template_group_items tgi LEFT JOIN templates t ON t.id = tgi.template_id
    WHERE tgi.id = ?
  `).get(itemId), { status: 201 })
}

// DELETE /api/template-groups/[id]/items?item_id=xxx  — cancel a single scheduled item
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const itemId = new URL(req.url).searchParams.get('item_id')
  if (!itemId) return NextResponse.json({ error: 'item_id required' }, { status: 400 })
  const db = getDb()

  // Verify the item belongs to this group/user
  const item = db.prepare(`
    SELECT tgi.id, tgi.campaign_id FROM template_group_items tgi
    JOIN template_groups tg ON tg.id = tgi.group_id
    WHERE tgi.id = ? AND tgi.group_id = ? AND tg.user_id = ? AND tgi.status = 'pending'
  `).get(itemId, id, session.id) as { id: string; campaign_id: string | null } | null

  if (!item) return NextResponse.json({ error: 'Item not found or already sent' }, { status: 404 })

  db.transaction(() => {
    // Delete the pre-created campaign if it exists
    if (item.campaign_id) {
      db.prepare('DELETE FROM campaign_stats WHERE campaign_id = ?').run(item.campaign_id)
      db.prepare('DELETE FROM campaigns WHERE id = ? AND user_id = ?').run(item.campaign_id, session.id)
    }
    db.prepare('DELETE FROM template_group_items WHERE id = ?').run(itemId)
  })()

  return NextResponse.json({ ok: true })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const group = db.prepare('SELECT id FROM template_groups WHERE id = ? AND user_id = ?').get(id, session.id)
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json()
  const { items } = body as { items: Array<{ id: string; template_id: string; subject?: string; scheduled_at: string; position: number; item_list_id?: string; recipient_email?: string; campaign_id?: string }> }
  if (!Array.isArray(items)) return NextResponse.json({ error: 'items array required' }, { status: 400 })

  // Find campaigns belonging to items being removed so we can delete them
  const pendingItems = db.prepare('SELECT id, campaign_id FROM template_group_items WHERE group_id = ? AND status = ?').all(id, 'pending') as { id: string; campaign_id: string | null }[]
  const keptIds = new Set(items.map(i => i.id).filter(Boolean))
  const campaignsToDelete = pendingItems.filter(p => !keptIds.has(p.id) && p.campaign_id).map(p => p.campaign_id!)

  const del = db.prepare('DELETE FROM template_group_items WHERE group_id = ? AND status = ?')
  const ins = db.prepare('INSERT OR REPLACE INTO template_group_items (id, group_id, template_id, position, subject, scheduled_at, item_list_id, recipient_email, campaign_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')

  db.transaction(() => {
    // Delete orphaned pre-created campaigns
    for (const cId of campaignsToDelete) {
      db.prepare('DELETE FROM campaign_stats WHERE campaign_id = ?').run(cId)
      db.prepare('DELETE FROM campaigns WHERE id = ? AND user_id = ?').run(cId, session.id)
    }
    del.run(id, 'pending')
    for (const item of items) {
      ins.run(item.id || crypto.randomUUID(), id, item.template_id, item.position, item.subject || null, item.scheduled_at, item.item_list_id || null, item.recipient_email || null, item.campaign_id || null, 'pending')
    }
  })()
  return NextResponse.json({ ok: true })
}
