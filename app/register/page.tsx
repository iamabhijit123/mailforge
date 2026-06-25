'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Input } from '@/components/ui'
import { Mail, Gift } from 'lucide-react'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteValid, setInviteValid] = useState<{ email: string; role: string } | null>(null)
  const [inviteError, setInviteError] = useState('')

  useEffect(() => {
    if (!inviteToken) return
    fetch(`/api/admin/invite/validate?token=${inviteToken}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setInviteError(d.error); return }
        setInviteValid(d)
        setForm(f => ({ ...f, email: d.email }))
      })
  }, [inviteToken])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, inviteToken }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Registration failed'); return }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-600 rounded-xl mb-4">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {inviteToken ? 'Accept your invitation' : 'Create your account'}
          </h1>
          <p className="text-gray-500 mt-1">
            {inviteToken ? 'Set up your MailForge workspace' : 'Start sending email campaigns today'}
          </p>
        </div>

        {inviteToken && inviteError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl text-center">
            {inviteError} — This invite link may have already been used or expired.
          </div>
        )}

        {inviteToken && inviteValid && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Gift className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">You&apos;ve been invited!</p>
              <p className="text-xs text-blue-700">
                Your account will be created as a{inviteValid.role === 'admin' ? 'n admin' : ' workspace owner'}.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
            <Input label="Full name" value={form.name} onChange={set('name')} required autoFocus />
            <Input
              label="Email address"
              type="email"
              value={form.email}
              onChange={set('email')}
              required
              disabled={!!inviteValid}
            />
            <Input label="Password" type="password" value={form.password} onChange={set('password')} required hint="At least 8 characters" />
            <Input label="Confirm password" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} required />
            <Button type="submit" className="w-full" loading={loading}>
              {inviteToken ? 'Create account & join' : 'Create account'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <RegisterForm />
    </Suspense>
  )
}
