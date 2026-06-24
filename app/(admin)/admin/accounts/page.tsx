'use client'

import { useEffect, useState } from 'react'
import { Shield, CheckCircle, XCircle, Users, Globe, Search } from 'lucide-react'

interface Account {
  id: string; name: string; email: string; created_at: string
  is_disabled: number; api_access_enabled: number; is_admin: number
  contacts_count: number; campaigns_count: number; emails_sent: number
  team_count: number; verified_domains: number
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

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState('')

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

  const filtered = accounts.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-20 right-6 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg z-50 animate-in fade-in">{toast}</div>
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

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Account', 'Usage', 'Team / Domains', 'Account active', 'API access', 'Admin'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No accounts found</td></tr>
            ) : filtered.map(acc => (
              <tr key={acc.id} className={`hover:bg-gray-50 transition-colors ${acc.is_disabled ? 'opacity-60' : ''}`}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">{acc.name[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                        {acc.name}
                        {acc.is_admin ? <Shield className="w-3.5 h-3.5 text-blue-500" /> : null}
                      </p>
                      <p className="text-xs text-gray-500">{acc.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Joined {new Date(acc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3" /> {acc.contacts_count.toLocaleString()} contacts</p>
                    <p className="text-xs text-gray-500">{acc.campaigns_count} campaigns · {acc.emails_sent.toLocaleString()} sent</p>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <p className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3" /> {acc.team_count} members</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Globe className="w-3 h-3" />
                    {acc.verified_domains > 0 ? (
                      <span className="text-green-600 font-medium">{acc.verified_domains} verified</span>
                    ) : (
                      <span className="text-amber-600">No verified domain</span>
                    )}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Toggle
                      checked={!acc.is_disabled}
                      disabled={saving === acc.id}
                      onChange={() => update(acc.id, { is_disabled: acc.is_disabled ? 0 : 1 })}
                    />
                    {acc.is_disabled ? (
                      <span className="text-xs text-red-600 font-medium">Disabled</span>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">Active</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Toggle
                      checked={!!acc.api_access_enabled}
                      disabled={saving === acc.id}
                      onChange={() => update(acc.id, { api_access_enabled: acc.api_access_enabled ? 0 : 1 })}
                    />
                    {acc.api_access_enabled ? (
                      <span className="text-xs text-green-600 font-medium">On</span>
                    ) : (
                      <span className="text-xs text-gray-500 font-medium">Revoked</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <Toggle
                    checked={!!acc.is_admin}
                    disabled={saving === acc.id}
                    onChange={() => update(acc.id, { is_admin: acc.is_admin ? 0 : 1 })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <strong>Account active:</strong> Disabled accounts cannot log in or send campaigns. <strong>API access:</strong> Revoking blocks campaign sends but does not log the user out. <strong>Admin:</strong> Grants access to this admin panel.
      </div>
    </div>
  )
}
