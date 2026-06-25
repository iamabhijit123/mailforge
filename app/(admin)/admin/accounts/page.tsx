'use client'

import { Fragment, useEffect, useState } from 'react'
import { Shield, Users, Globe, Search, ChevronDown, ChevronRight, Crown, KeyRound, Eye, EyeOff, X, UserPlus, LogIn, Copy, Check as CheckIcon, Trash2 } from 'lucide-react'

interface TeamMember {
  id: string; email: string; name: string | null; role: string
  status: 'pending' | 'active'; invited_at: string; is_disabled: number
}

interface Account {
  id: string; name: string; email: string; created_at: string
  is_disabled: number; api_access_enabled: number; is_admin: number
  contacts_count: number; campaigns_count: number; emails_sent: number
  team_count: number; verified_domains: number
  team_members: TeamMember[]
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative w-10 h-6 rounded-full transition-colors disabled:opacity-40 ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  )
}

function Avatar({ name, size = 'md', color }: { name: string; size?: 'sm' | 'md'; color?: string }) {
  const cls = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  const bg = color || 'from-blue-500 to-blue-700'
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br ${bg} flex items-center justify-center flex-shrink-0`}>
      <span className="text-white font-bold">{name[0]?.toUpperCase()}</span>
    </div>
  )
}

interface PendingInvite { id: string; email: string; role: string; created_at: string }

function InviteModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleCreate() {
    if (!email.trim()) { setErr('Email is required'); return }
    setSaving(true); setErr('')
    const res = await fetch('/api/admin/invite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), role }),
    })
    setSaving(false)
    if (res.ok) {
      const d = await res.json()
      setInviteUrl(d.url)
      onDone(`Invite created for ${email}`)
    } else {
      const d = await res.json(); setErr(d.error || 'Failed to create invite')
    }
  }

  function copyUrl() {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Invite New User</h3>
            <p className="text-xs text-gray-500 mt-0.5">They&apos;ll get their own workspace</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          {!inviteUrl ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <input
                  type="email" value={email} onChange={e => { setEmail(e.target.value); setErr('') }}
                  placeholder="client@example.com" autoFocus
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
                {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                <div className="flex gap-2">
                  {(['user', 'admin'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border-2 transition-all capitalize ${role === r ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      {r === 'admin' ? '🛡 Admin' : '👤 User'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {role === 'admin' ? 'Admin can access this admin panel.' : 'User gets their own workspace, no admin access.'}
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleCreate} disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
                  {saving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  Generate invite link
                </button>
                <button onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancel</button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
                Invite link created! Share this link with <strong>{email}</strong>.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Invite link</label>
                <div className="flex gap-2">
                  <input readOnly value={inviteUrl} className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-gray-50 text-gray-700 focus:outline-none" />
                  <button onClick={copyUrl} className={`px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all flex items-center gap-1.5 ${copied ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                    {copied ? <><CheckIcon className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400">This link can only be used once. The user will set their own name and password.</p>
              <button onClick={onClose} className="w-full py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Done</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ResetPasswordModal({
  account,
  onClose,
  onDone,
}: {
  account: Account
  onClose: () => void
  onDone: (msg: string) => void
}) {
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function handleSave() {
    if (pw.length < 8) { setErr('Password must be at least 8 characters'); return }
    setSaving(true); setErr('')
    const res = await fetch(`/api/admin/accounts/${account.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: pw }),
    })
    setSaving(false)
    if (res.ok) { onDone(`Password reset for ${account.name}`); onClose() }
    else { const d = await res.json(); setErr(d.error || 'Failed to reset password') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Reset Password</h3>
            <p className="text-xs text-gray-500 mt-0.5">{account.name} · {account.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={pw}
                onChange={e => { setPw(e.target.value); setErr('') }}
                placeholder="Min. 8 characters"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                autoFocus
              />
              <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2"
            >
              {saving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              Set password
            </button>
            <button onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [resetTarget, setResetTarget] = useState<Account | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [impersonating, setImpersonating] = useState<string | null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    fetch('/api/admin/accounts')
      .then(r => r.json())
      .then(d => { setAccounts(d.accounts || []); setLoading(false) })
    fetch('/api/admin/invite')
      .then(r => r.json())
      .then(d => setPendingInvites(d.invites || []))
  }, [])

  async function update(id: string, patch: Partial<Account>) {
    setSaving(id)
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
    const res = await fetch(`/api/admin/accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setSaving(null)
    if (res.ok) showToast('Account updated')
    else showToast('Update failed')
  }

  async function revokeInvite(id: string) {
    await fetch('/api/admin/invite', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setPendingInvites(prev => prev.filter(i => i.id !== id))
    showToast('Invite revoked')
  }

  async function loginAs(accountId: string) {
    setImpersonating(accountId)
    const res = await fetch(`/api/admin/impersonate/${accountId}`, { method: 'POST' })
    setImpersonating(null)
    if (res.ok) window.location.href = '/dashboard'
    else showToast('Failed to switch account')
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = accounts.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-20 right-6 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg z-50 animate-in fade-in">{toast}</div>
      )}
      {resetTarget && (
        <ResetPasswordModal
          account={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={msg => showToast(msg)}
        />
      )}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onDone={msg => {
            showToast(msg)
            fetch('/api/admin/invite').then(r => r.json()).then(d => setPendingInvites(d.invites || []))
          }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-500 mt-1">Manage workspace owners, access, and permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text" placeholder="Search accounts…" value={search} onChange={e => setSearch(e.target.value)}
              className="text-sm outline-none bg-transparent w-48"
            />
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Invite User
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full" style={{ minWidth: 860 }}>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="pl-4 pr-1 py-3 w-8" />
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usage</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Team / Domains</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">Account active</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">API access</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Admin</th>
              <th className="px-5 py-3 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400 text-sm">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400 text-sm">No accounts found</td></tr>
            ) : filtered.map(acc => (
              <Fragment key={acc.id}>
                {/* Main account row */}
                <tr
                  className={`group hover:bg-gray-50 transition-colors cursor-pointer ${acc.is_disabled ? 'opacity-60' : ''}`}
                  onClick={() => toggleExpand(acc.id)}
                >
                  <td className="pl-4 pr-1 py-4">
                    <div className="text-gray-400">
                      {expanded.has(acc.id)
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </td>
                  <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-3">
                      <Avatar name={acc.name} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                          {acc.name}
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          {acc.is_admin ? <Shield className="w-3.5 h-3.5 text-blue-500" /> : null}
                        </p>
                        <p className="text-xs text-gray-500">{acc.email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Joined {new Date(acc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3" /> {acc.contacts_count.toLocaleString()} contacts</p>
                      <p className="text-xs text-gray-500">{acc.campaigns_count} campaigns · {acc.emails_sent.toLocaleString()} sent</p>
                    </div>
                  </td>
                  <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {acc.team_count > 0
                          ? <button onClick={() => toggleExpand(acc.id)} className="text-blue-600 font-medium hover:underline">{acc.team_count} member{acc.team_count !== 1 ? 's' : ''}</button>
                          : <span>0 members</span>}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Globe className="w-3 h-3" />
                        {acc.verified_domains > 0
                          ? <span className="text-green-600 font-medium">{acc.verified_domains} verified</span>
                          : <span className="text-amber-600">No verified domain</span>}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                    <div className="flex flex-col items-start gap-1">
                      <Toggle
                        checked={!acc.is_disabled}
                        disabled={saving === acc.id}
                        onChange={() => update(acc.id, { is_disabled: acc.is_disabled ? 0 : 1 })}
                      />
                      <span className={`text-xs font-medium ${acc.is_disabled ? 'text-red-600' : 'text-green-600'}`}>
                        {acc.is_disabled ? 'Disabled' : 'Active'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                    <div className="flex flex-col items-start gap-1">
                      <Toggle
                        checked={!!acc.api_access_enabled}
                        disabled={saving === acc.id}
                        onChange={() => update(acc.id, { api_access_enabled: acc.api_access_enabled ? 0 : 1 })}
                      />
                      <span className={`text-xs font-medium ${acc.api_access_enabled ? 'text-green-600' : 'text-gray-500'}`}>
                        {acc.api_access_enabled ? 'On' : 'Revoked'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                    <Toggle
                      checked={!!acc.is_admin}
                      disabled={saving === acc.id}
                      onChange={() => update(acc.id, { is_admin: acc.is_admin ? 0 : 1 })}
                    />
                  </td>
                  <td className="px-3 py-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => loginAs(acc.id)}
                        disabled={impersonating === acc.id}
                        title="Login as this user"
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-green-600 border border-gray-200 rounded-lg bg-white hover:bg-green-50 hover:border-green-300 transition-all disabled:opacity-40"
                      >
                        {impersonating === acc.id
                          ? <span className="w-3 h-3 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin" />
                          : <LogIn className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => setResetTarget(acc)}
                        title="Reset password"
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 border border-gray-200 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-300 transition-all"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Expanded team members */}
                {expanded.has(acc.id) && (
                  <tr className="bg-gray-50/70">
                    <td />
                    <td colSpan={7} className="px-5 pb-4 pt-2">
                      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Team members under {acc.name}&apos;s account</p>
                        </div>
                        {acc.team_members.length === 0 ? (
                          <div className="px-4 py-4 text-xs text-gray-400 text-center">No team members yet</div>
                        ) : (
                          <table className="min-w-full">
                            <thead>
                              <tr className="bg-gray-50">
                                {['Member', 'Role', 'Status', 'Invited'].map(h => (
                                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {acc.team_members.map(m => (
                                <tr key={m.id} className="hover:bg-gray-50/50">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                      <Avatar name={m.name || m.email} size="sm" color="from-slate-400 to-slate-600" />
                                      <div>
                                        <p className="text-xs font-medium text-gray-800">{m.name || '—'}</p>
                                        <p className="text-xs text-gray-500">{m.email}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${m.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                      {m.role}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                      {m.status === 'active' ? 'Active' : 'Pending'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-gray-500">
                                    {new Date(m.invited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {pendingInvites.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-700">Pending Invites ({pendingInvites.length})</p>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingInvites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                  <p className="text-xs text-gray-400">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold mr-1.5 ${inv.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{inv.role}</span>
                    Invited {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <button onClick={() => revokeInvite(inv.id)} title="Revoke invite" className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <strong>Account active:</strong> Disabled accounts cannot log in or send campaigns.{' '}
        <strong>API access:</strong> Revoking blocks campaign sends but does not log the user out.{' '}
        <strong>Admin:</strong> Grants access to this admin panel.{' '}
        Click any row to expand and see team members.
      </div>
    </div>
  )
}
