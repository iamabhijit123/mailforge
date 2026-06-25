'use client'

import { Fragment, useEffect, useState } from 'react'
import { Shield, Users, Globe, Search, ChevronDown, ChevronRight, Crown, KeyRound, Eye, EyeOff, X } from 'lucide-react'

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

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    fetch('/api/admin/accounts')
      .then(r => r.json())
      .then(d => { setAccounts(d.accounts || []); setLoading(false) })
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-500 mt-1">Manage workspace owners, access, and permissions</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search accounts…" value={search} onChange={e => setSearch(e.target.value)}
            className="text-sm outline-none bg-transparent w-48"
          />
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
                    <button
                      onClick={() => setResetTarget(acc)}
                      title="Reset password"
                      className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 border border-gray-200 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-300 transition-all"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
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

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <strong>Account active:</strong> Disabled accounts cannot log in or send campaigns.{' '}
        <strong>API access:</strong> Revoking blocks campaign sends but does not log the user out.{' '}
        <strong>Admin:</strong> Grants access to this admin panel.{' '}
        Click any row to expand and see team members.
      </div>
    </div>
  )
}
