import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { getDb } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getDb()
  const accounts = db.prepare(`
    SELECT
      u.id, u.name, u.email, u.created_at,
      COALESCE(u.is_disabled, 0) as is_disabled,
      COALESCE(u.api_access_enabled, 1) as api_access_enabled,
      COALESCE(u.is_admin, 0) as is_admin,
      (SELECT COUNT(*) FROM contacts WHERE user_id = u.id) as contacts_count,
      (SELECT COUNT(*) FROM campaigns WHERE user_id = u.id) as campaigns_count,
      (SELECT COALESCE(SUM(total_recipients), 0) FROM campaigns WHERE user_id = u.id AND status = 'sent') as emails_sent,
      (SELECT COUNT(*) FROM team_members WHERE owner_id = u.id AND status = 'active') as team_count,
      (SELECT COUNT(*) FROM domain_verifications WHERE user_id = u.id AND status = 'verified') as verified_domains
    FROM users u
    WHERE u.is_workspace_owner = 1 OR (u.workspace_id IS NULL AND u.is_workspace_owner IS NULL)
    ORDER BY u.created_at ASC
  `).all() as Array<Record<string, unknown>>

  // Fetch team members for all accounts
  const ownerIds = accounts.map(a => a.id as string)
  let teamRows: Array<Record<string, unknown>> = []
  if (ownerIds.length > 0) {
    const placeholders = ownerIds.map(() => '?').join(',')
    teamRows = db.prepare(`
      SELECT
        tm.id, tm.owner_id, tm.email, tm.name, tm.role, tm.status, tm.invited_at,
        u.name as user_name, u.email as user_email, u.created_at as user_created_at,
        COALESCE(u.is_disabled, 0) as is_disabled
      FROM team_members tm
      LEFT JOIN users u ON u.id = tm.member_user_id
      WHERE tm.owner_id IN (${placeholders})
      ORDER BY tm.invited_at ASC
    `).all(...ownerIds) as Array<Record<string, unknown>>
  }

  // Group team members by owner_id
  const teamByOwner: Record<string, unknown[]> = {}
  for (const row of teamRows) {
    const oid = row.owner_id as string
    if (!teamByOwner[oid]) teamByOwner[oid] = []
    teamByOwner[oid].push({
      id: row.id,
      email: row.user_email || row.email,
      name: row.user_name || row.name,
      role: row.role,
      status: row.status,
      invited_at: row.invited_at,
      is_disabled: row.is_disabled,
    })
  }

  const accountsWithTeam = accounts.map(a => ({
    ...a,
    team_members: teamByOwner[a.id as string] || [],
  }))

  const totalStats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM contacts) as total_contacts,
      (SELECT COALESCE(SUM(total_recipients),0) FROM campaigns WHERE status='sent') as total_emails,
      (SELECT COUNT(*) FROM campaigns WHERE status='sent') as total_campaigns
  `).get() as { total_contacts: number; total_emails: number; total_campaigns: number }

  return NextResponse.json({ accounts: accountsWithTeam, stats: totalStats })
}
