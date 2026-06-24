'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Mail, Send, Shield, TrendingUp, ChevronRight, CheckCircle, XCircle } from 'lucide-react'

interface Account {
  id: string; name: string; email: string; created_at: string
  is_disabled: number; api_access_enabled: number; is_admin: number
  contacts_count: number; campaigns_count: number; emails_sent: number
  team_count: number; verified_domains: number
}
interface Stats { total_contacts: number; total_emails: number; total_campaigns: number }

export default function AdminOverviewPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/accounts')
      .then(r => r.json())
      .then(d => { setAccounts(d.accounts || []); setStats(d.stats || null); setLoading(false) })
  }, [])

  const activeAccounts = accounts.filter(a => !a.is_disabled).length

  const statCards = [
    { label: 'Total accounts', value: accounts.length, sub: `${activeAccounts} active`, icon: Users, color: 'blue' },
    { label: 'Total contacts', value: stats?.total_contacts ?? '—', icon: Mail, color: 'green' },
    { label: 'Emails sent', value: stats?.total_emails ?? '—', icon: Send, color: 'purple' },
    { label: 'Total campaigns', value: stats?.total_campaigns ?? '—', icon: TrendingUp, color: 'orange' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
        <p className="text-gray-500 mt-1">Platform-wide statistics and recent accounts</p>
      </div>

      <div className="grid grid-cols-4 gap-5">
        {statCards.map(card => {
          const Icon = card.icon
          const colorMap: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
            purple: 'bg-purple-50 text-purple-600', orange: 'bg-orange-50 text-orange-600',
          }
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorMap[card.color]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
              {card.sub && <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>}
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">All accounts</h2>
          <Link href="/admin/accounts" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
            Manage all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Account', 'Contacts', 'Campaigns', 'Emails sent', 'Status', 'API access'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.slice(0, 10).map(acc => (
                <tr key={acc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{acc.name[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                          {acc.name}
                          {acc.is_admin ? <Shield className="w-3 h-3 text-blue-500" title="Admin" /> : null}
                        </p>
                        <p className="text-xs text-gray-500">{acc.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">{acc.contacts_count.toLocaleString()}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">{acc.campaigns_count}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">{acc.emails_sent.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    {acc.is_disabled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold"><XCircle className="w-3 h-3" /> Disabled</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold"><CheckCircle className="w-3 h-3" /> Active</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {acc.api_access_enabled ? (
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Enabled</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">Revoked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
