import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()
    if (!token || !password) return NextResponse.json({ error: 'Token and password required' }, { status: 400 })
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

    const db = getDb()
    const row = db.prepare('SELECT * FROM password_reset_tokens WHERE token = ?').get(token) as {
      token: string; user_id: string; expires_at: string; used: number
    } | undefined

    if (!row) return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 })
    if (row.used) return NextResponse.json({ error: 'This reset link has already been used.' }, { status: 400 })
    if (new Date(row.expires_at) < new Date()) return NextResponse.json({ error: 'This reset link has expired. Please request a new one.' }, { status: 400 })

    const hash = await bcrypt.hash(password, 12)
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, row.user_id)
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE token = ?').run(token)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
