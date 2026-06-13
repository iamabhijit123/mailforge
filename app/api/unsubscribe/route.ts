import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  if (!email) return new NextResponse('Invalid link', { status: 400 })

  const db = getDb()
  db.prepare("UPDATE contacts SET status = 'unsubscribed', updated_at = datetime('now') WHERE email = ?").run(email.toLowerCase())

  return new NextResponse(`
    <!DOCTYPE html>
    <html>
    <head><title>Unsubscribed</title></head>
    <body style="font-family:Arial,sans-serif;text-align:center;padding:60px;">
      <h2 style="color:#374151;">You have been unsubscribed</h2>
      <p style="color:#6b7280;">You will no longer receive emails at <strong>${email}</strong>.</p>
    </body>
    </html>
  `, { headers: { 'Content-Type': 'text/html' } })
}
