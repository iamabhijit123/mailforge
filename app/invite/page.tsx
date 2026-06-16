'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

interface InviteInfo { email: string; name: string | null; role: string; owner_name: string }

function InviteForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''

  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return }
    fetch(`/api/invite?token=${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { setInfo(d); setName(d.name || '') }
        else setNotFound(true)
        setLoading(false)
      })
  }, [token])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError('')
    setSubmitting(true)
    const res = await fetch(`/api/invite?token=${token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
    })
    setSubmitting(false)
    if (res.ok) {
      router.push('/dashboard')
    } else {
      const d = await res.json()
      setError(d.error || 'Something went wrong')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F6F8]">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full mx-4 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Invite Link</h1>
          <p className="text-sm text-gray-500">This invite link is invalid or has already been used.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F5F6F8]">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Join MailForge</h1>
          <p className="text-sm text-gray-500 mt-1">
            <strong>{info!.owner_name}</strong> invited you to collaborate
          </p>
        </div>

        {/* Email badge */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 text-center">
          <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-0.5">Invited email</p>
          <p className="text-sm font-bold text-blue-900">{info!.email}</p>
          {info!.role !== 'member' && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full capitalize">{info!.role}</span>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="Your full name"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Create password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="Repeat your password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm"
          >
            {submitting ? 'Setting up your account…' : 'Accept Invite & Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline font-medium">Sign in</a>
        </p>
      </div>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <InviteForm />
    </Suspense>
  )
}
