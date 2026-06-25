import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const invite = getDb().prepare(
    `SELECT id, email, role FROM admin_invites WHERE token = ? AND used_at IS NULL`
  ).get(token) as { id: string; email: string; role: string } | undefined

  if (!invite) return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 })
  return NextResponse.json(invite)
}
