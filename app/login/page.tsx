'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@/components/ui'
import { Mail, Shield } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Admin quick-login state
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login failed'); return }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setAdminError('')
    setAdminLoading(true)
    try {
      const res = await fetch('/api/admin/quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setAdminError(data.error || 'Admin login failed'); return }
      router.push('/admin')
      router.refresh()
    } catch {
      setAdminError('Network error')
    } finally {
      setAdminLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 60%, #F0FDF4 100%)' }}>
      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] p-12 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <Mail className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">MailForge</span>
        </div>

        <div>
          <h2 className="text-3xl font-bold leading-snug mb-4">
            Email marketing that actually delivers.
          </h2>
          <p className="text-blue-200 text-base leading-relaxed">
            Send beautiful campaigns, grow your contact list, and track every open and click — all from one place.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { icon: '✦', text: 'AI-powered email templates' },
              { icon: '✦', text: 'Drag & drop visual builder' },
              { icon: '✦', text: 'Real-time analytics & reports' },
              { icon: '✦', text: 'Smart contact list management' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3">
                <span className="text-blue-300 text-lg">{f.icon}</span>
                <span className="text-blue-100 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-300 text-xs">© 2026 ApartmentNetwork.com · MailForge</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)' }}>
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">MailForge</span>
          </div>

          {!showAdminLogin ? (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
                <p className="text-gray-500 mt-1">Sign in to your MailForge account</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl font-medium">
                      {error}
                    </div>
                  )}
                  <Input label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus placeholder="you@example.com" />
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline font-medium">Forgot password?</Link>
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                  </div>
                  <Button type="submit" className="w-full py-3 text-base" loading={loading}>
                    Sign in to MailForge
                  </Button>
                </form>
                <p className="mt-5 text-center text-sm text-gray-500">
                  Don&apos;t have an account?{' '}
                  <Link href="/register" className="text-blue-600 font-semibold hover:underline">Register free</Link>
                </p>
                <p className="mt-2 text-center text-xs text-gray-400">
                  Account not working after a server restart?{' '}
                  <Link href="/register" className="text-blue-500 hover:underline">Re-register</Link>{' '}to restore access.
                </p>
              </div>

              {/* Admin access */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowAdminLogin(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Shield className="w-3 h-3" />
                  Admin access
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8">
                <button onClick={() => { setShowAdminLogin(false); setAdminError('') }} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
                  ← Back to login
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin access</h1>
                    <p className="text-gray-500 text-sm">MailForge master dashboard</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-8">
                <form onSubmit={handleAdminLogin} className="space-y-5">
                  {adminError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl font-medium">
                      {adminError}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin password</label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      required
                      autoFocus
                      placeholder="Enter admin password"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-700"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">Set via <code className="bg-gray-100 px-1 rounded">ADMIN_PASSWORD</code> environment variable</p>
                  </div>
                  <button
                    type="submit"
                    disabled={adminLoading || !adminPassword}
                    className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    {adminLoading ? 'Signing in…' : 'Sign in as Admin'}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
