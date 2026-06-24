import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAdminSettings } from '@/lib/admin'
import { getDb } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ available: false })

  const db = getDb()
  const userSettings = db.prepare('SELECT anthropic_api_key FROM settings WHERE user_id = ?').get(session.id) as { anthropic_api_key?: string } | null
  const adminSettings = getAdminSettings()

  const available = !!(
    userSettings?.anthropic_api_key ||
    adminSettings.anthropic_api_key ||
    process.env.ANTHROPIC_API_KEY
  )

  return NextResponse.json({ available })
}
