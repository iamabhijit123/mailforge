'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, Eye, MousePointer, UserX, AlertCircle } from 'lucide-react'
import { formatDateTime, formatPercent, formatDate } from '@/lib/utils'
import { StatCard, Badge } from '@/components/ui'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface ReportData {
  campaign: { id: string; name: string; subject: string; sent_at: string; from_name: string; from_email: string }
  stats: { sent: number; unique_opens: number; unique_clicks: number; bounces: number; unsubscribes: number; spam_complaints: number }
  topLinks: Array<{ link_url: string; clicks: number }>
  opensByDay: Array<{ date: string; opens: number }>
  recentActivity: Array<{ id: string; event_type: string; contact_email: string; occurred_at: string; link_url: string | null }>
}

const EVENT_BADGES: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
  open: 'success', click: 'info', bounce: 'danger', unsubscribe: 'warning', spam: 'danger', delivery: 'default',
}

export default function CampaignReportPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/campaigns/${id}/report`).then(r => r.json()).then(setData).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
  if (!data) return <div className="text-center mt-20 text-gray-500">Report not found</div>

  const { campaign, stats } = data
  const s = stats || {}

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/campaigns" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{campaign.name}</h1>
          <p className="text-sm text-gray-500">Sent {formatDateTime(campaign.sent_at)} · {campaign.from_name} &lt;{campaign.from_email}&gt;</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Emails Sent" value={(s.sent || 0).toLocaleString()} icon={<Send className="w-5 h-5" />} color="blue" />
        <StatCard label="Open Rate" value={formatPercent(s.unique_opens || 0, s.sent || 0)} sub={`${(s.unique_opens || 0).toLocaleString()} unique opens`} icon={<Eye className="w-5 h-5" />} color="green" />
        <StatCard label="Click Rate" value={formatPercent(s.unique_clicks || 0, s.sent || 0)} sub={`${(s.unique_clicks || 0).toLocaleString()} unique clicks`} icon={<MousePointer className="w-5 h-5" />} color="yellow" />
        <StatCard label="Unsubscribes" value={(s.unsubscribes || 0).toLocaleString()} sub={`${(s.bounces || 0)} bounces`} icon={<UserX className="w-5 h-5" />} color="red" />
      </div>

      {data.opensByDay.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Opens Over Time</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.opensByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="opens" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.topLinks.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Top Clicked Links</h2>
          <div className="space-y-2">
            {data.topLinks.map((link, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                <a href={link.link_url} target="_blank" rel="noopener" className="flex-1 text-sm text-brand-600 hover:underline truncate">{link.link_url}</a>
                <span className="text-sm font-medium text-gray-700">{link.clicks} clicks</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {data.recentActivity.length === 0 ? (
          <p className="text-sm text-gray-400">No activity recorded yet. Make sure Postmark webhooks are set up.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr>
                  {['Contact', 'Event', 'Link', 'Time'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recentActivity.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-700">{e.contact_email}</td>
                    <td className="px-3 py-2"><Badge variant={EVENT_BADGES[e.event_type] || 'default'}>{e.event_type}</Badge></td>
                    <td className="px-3 py-2 text-xs text-gray-500 max-w-xs truncate">{e.link_url || '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{formatDateTime(e.occurred_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {s.spam_complaints > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">{s.spam_complaints} spam complaint{s.spam_complaints !== 1 ? 's' : ''}</p>
            <p className="text-xs text-red-600 mt-0.5">Review your content and sending frequency to reduce spam reports.</p>
          </div>
        </div>
      )}
    </div>
  )
}
