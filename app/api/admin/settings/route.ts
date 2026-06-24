import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isAdmin, getAdminSettings, setAdminSetting } from '@/lib/admin'

export async function GET() {
  const session = await getSession()
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json(getAdminSettings())
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const allowed = ['postmark_api_key', 'anthropic_api_key', 'postmark_message_stream', 'default_sender_name', 'default_sender_email']
  for (const key of allowed) {
    if (key in body) setAdminSetting(key, String(body[key] ?? ''))
  }
  return NextResponse.json({ ok: true, settings: getAdminSettings() })
}
