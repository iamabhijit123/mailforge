'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { StatCard } from '@/components/ui'
import { Send, Eye, MousePointer, UserX, Users, TrendingUp, RefreshCw } from 'lucide-react'
import { formatPercent, formatDate } from '@/lib/utils'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface AnalyticsData {
  totalContacts: number
  totalCampaigns: number
  sentCampaigns: number
  totals: { total_sent: number; total_opens: number; total_clicks: number; total_bounces: number; total_unsubscribes: number } | null
  recentCampaigns: Array<{ id: string; name: string; sent_at: string; status: string; sent: number; unique_opens: number; unique_clicks: number; bounces: number }>
  contactGrowth: Array<{ date: string; new_contacts: number }>
  opensByDay: Array<{ date: string; opens: number }>
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/analytics')
      if (!res.ok) { setError(`Error ${res.status}: ${res.statusText}`); return }
      const json = await res.json()
      if (json.error) { setError(json.error); return }
      setData(json)
    } catch { setError('Failed to load analytics') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const t = data?.totals
  const openRate = formatPercent(t?.total_opens || 0, t?.total_sent || 0)
  const clickRate = formatPercent(t?.total_clicks || 0, t?.total_sent || 0)
  const bounceRate = formatPercent(t?.total_bounces || 0, t?.total_sent || 0)
  const unsubRate = formatPercent(t?.total_unsubscribes || 0, t?.total_sent || 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">All-time performance across your campaigns</p>
        </div>
        <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error} — <button onClick={load} className="underline">Retry</button>
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Contacts" value={(data.totalContacts || 0).toLocaleString()} icon={<Users className="w-5 h-5" />} color="blue" />
            <StatCard label="Emails Sent (all time)" value={(t?.total_sent || 0).toLocaleString()} icon={<Send className="w-5 h-5" />} color="green" />
            <StatCard label="Overall Open Rate" value={openRate} sub={`${(t?.total_opens || 0).toLocaleString()} opens`} icon={<Eye className="w-5 h-5" />} color="yellow" />
            <StatCard label="Overall Click Rate" value={clickRate} sub={`${(t?.total_clicks || 0).toLocaleString()} clicks`} icon={<MousePointer className="w-5 h-5" />} color="purple" />
            <StatCard label="Bounce Rate" value={bounceRate} sub={`${(t?.total_bounces || 0).toLocaleString()} bounces`} icon={<TrendingUp className="w-5 h-5" />} color="red" />
            <StatCard label="Unsubscribe Rate" value={unsubRate} sub={`${(t?.total_unsubscribes || 0).toLocaleString()} unsubscribes`} icon={<UserX className="w-5 h-5" />} color="red" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Opens Per Day (30d)</h2>
              {(data.opensByDay || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.opensByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="opens" fill="#2563eb" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-gray-400 text-sm">
                  <p>No open data yet</p>
                  <p className="text-xs mt-1">Set up Postmark webhooks to track opens</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Contact Growth (30d)</h2>
              {(data.contactGrowth || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.contactGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="new_contacts" stroke="#16a34a" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-gray-400 text-sm">
                  <p>No contact data yet</p>
                  <Link href="/contacts" className="text-brand-600 hover:underline text-xs mt-1">Add contacts to get started</Link>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">All Campaigns Performance</h2>
            </div>
            {(data.recentCampaigns || []).filter(c => c.status === 'sent').length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400 text-sm">
                No campaigns sent yet.{' '}
                <Link href="/campaigns/new" className="text-brand-600 hover:underline">Create your first campaign</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Campaign', 'Sent', 'Open Rate', 'Click Rate', 'Bounces', 'Date'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(data.recentCampaigns || []).filter(c => c.status === 'sent').map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/campaigns/${c.id}/report`} className="text-sm font-medium text-brand-600 hover:underline">{c.name}</Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{(c.sent || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{formatPercent(c.unique_opens || 0, c.sent || 0)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{formatPercent(c.unique_clicks || 0, c.sent || 0)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{c.bounces || 0}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{formatDate(c.sent_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
