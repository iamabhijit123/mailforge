'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong'); return }
      setSent(true)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 60%, #F0FDF4 100%)' }}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)' }}>
            <Mail className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900">MailForge</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="w-14 h-14 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Check your email</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                If <strong>{email}</strong> is registered, we've sent a password reset link. It expires in 1 hour.
              </p>
              <p className="text-xs text-gray-400">Didn't get it? Check your spam folder or try again.</p>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:underline mt-2">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Forgot your password?</h1>
                <p className="text-gray-500 mt-1 text-sm">Enter your email and we'll send you a reset link.</p>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="you@example.com"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-gray-500">
                Remember it?{' '}
                <Link href="/login" className="text-blue-600 font-semibold hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
