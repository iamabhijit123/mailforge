'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { StatCard } from '@/components/ui'
import { Users, Send, MousePointer, TrendingUp, RefreshCw } from 'lucide-react'
import { formatPercent, formatDate } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface AnalyticsData {
  totalContacts: number
  totalCampaigns: number
  sentCampaigns: number
  totals: { total_sent: number; total_opens: number; total_clicks: number; total_bounces: number; total_unsubscribes: number } | null
  recentCampaigns: Array<{ id: string; name: string; sent_at: string; status: string; sent: number; unique_opens: number; unique_clicks: number }>
  contactGrowth: Array<{ date: string; new_contacts: number }>
  opensByDay: Array<{ date: string; opens: number }>
}

export default function DashboardPage() {
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
    } catch (e) {
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const totals = data?.totals
  const totalSent = totals?.total_sent || 0
  const totalOpens = totals?.total_opens || 0
  const totalClicks = totals?.total_clicks || 0
  const openRate = formatPercent(totalOpens, totalSent)
  const clickRate = formatPercent(totalClicks, totalSent)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Overview of your email marketing performance</p>
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
        <div className="flex items-center justify-center h-48 text-gray-400">Loading…</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Subscribers" value={(data.totalContacts || 0).toLocaleString()} icon={<Users className="w-5 h-5" />} color="blue" />
            <StatCard label="Campaigns Sent" value={(data.sentCampaigns || 0).toLocaleString()} icon={<Send className="w-5 h-5" />} color="green" />
            <StatCard label="Avg. Open Rate" value={openRate} icon={<TrendingUp className="w-5 h-5" />} color="yellow" />
            <StatCard label="Avg. Click Rate" value={clickRate} icon={<MousePointer className="w-5 h-5" />} color="purple" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Opens (Last 30 Days)</h2>
              {(data.opensByDay || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.opensByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="opens" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-gray-400 text-sm">
                  <p>No open data yet</p>
                  <p className="text-xs mt-1">Data appears after you send campaigns and set up Postmark webhooks</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Contact Growth (Last 30 Days)</h2>
              {(data.contactGrowth || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.contactGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} />
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
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Recent Campaigns</h2>
              <Link href="/campaigns" className="text-sm text-brand-600 hover:underline">View all</Link>
            </div>
            {(data.recentCampaigns || []).length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400 text-sm">
                No campaigns yet.{' '}
                <Link href="/campaigns/new" className="text-brand-600 hover:underline">Create your first campaign</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Campaign', 'Status', 'Sent', 'Opens', 'Clicks', 'Date'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.recentCampaigns.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/campaigns/${c.id}`} className="text-sm font-medium text-brand-600 hover:underline">{c.name}</Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{(c.sent || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{formatPercent(c.unique_opens || 0, c.sent || 0)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{formatPercent(c.unique_clicks || 0, c.sent || 0)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(c.sent_at)}</td>
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
