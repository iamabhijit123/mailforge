import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { ensureUser } from './db'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-me'
)
const COOKIE_NAME = 'em_token'

export interface SessionUser {
  id: string       // workspace id: owner's user_id for members, own id for owners
  memberId: string // actual logged-in user id (= id for owners)
  email: string
  name: string
  role: string
  isOwner: boolean
}

export async function signToken(payload: SessionUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    const p = payload as unknown as Partial<SessionUser> & { id: string; email: string; name: string; role: string }
    // backwards-compat: old tokens without memberId
    return {
      id: p.id,
      memberId: p.memberId ?? p.id,
      email: p.email,
      name: p.name,
      role: p.role,
      isOwner: p.isOwner ?? true,
    }
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  const session = await verifyToken(token)
  if (session) ensureUser(session)
  return session
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export { COOKIE_NAME }
