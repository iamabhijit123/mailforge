'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Users, Send, MousePointer, TrendingUp, RefreshCw, Mail, FileText, Plus, ArrowRight, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatPercent, formatDate } from '@/lib/utils'
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts'
import { TemplatePreviewThumbnail } from '@/components/email-builder/TemplatePreviewThumbnail'

interface AnalyticsData {
  totalContacts: number
  totalCampaigns: number
  sentCampaigns: number
  totals: { total_sent: number; total_opens: number; total_clicks: number; total_bounces: number; total_unsubscribes: number } | null
  recentCampaigns: Array<{ id: string; name: string; sent_at: string | null; status: string; sent: number; unique_opens: number; unique_clicks: number; bounces: number; html_body?: string | null }>
  contactGrowth: Array<{ date: string; new_contacts: number }>
  opensByDay: Array<{ date: string; opens: number }>
  userName?: string
}

const STATUS_STYLE: Record<string, string> = {
  sent: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-yellow-100 text-yellow-700',
}

function pct(num: number, denom: number) {
  if (!denom) return '0%'
  return `${Math.round((num / denom) * 100)}%`
}

function StatCard({ label, value, sub, icon, accent }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 shadow-card">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function RecentCampaigns({ campaigns }: { campaigns: AnalyticsData['recentCampaigns'] }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scroll(dir: 'left' | 'right') {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-card">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Recent campaigns</h2>
        <div className="flex items-center gap-2">
          <Link href="/campaigns" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all
          </Link>
          <div className="flex gap-1 ml-2">
            <button onClick={() => scroll('left')} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => scroll('right')} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Send className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">No campaigns yet</p>
          <Link href="/campaigns/new" className="text-sm text-blue-600 hover:underline">
            Create your first campaign →
          </Link>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-none p-4"
          style={{ scrollbarWidth: 'none' }}
        >
          {campaigns.map(c => (
            <Link key={c.id} href={`/campaigns/${c.id}`} className="block flex-shrink-0 w-[260px]">
              <div className="border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-card-hover transition-all overflow-hidden group">
                {/* Campaign name + meta */}
                <div className="px-4 pt-3.5 pb-2">
                  <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">{c.name}</p>
                  {c.sent_at && <p className="text-xs text-gray-400 mt-0.5">{formatDate(c.sent_at)}</p>}
                </div>
                {/* Status + type badges */}
                <div className="flex items-center gap-1.5 px-4 pb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLE[c.status] || 'bg-gray-100 text-gray-600'}`}>
                    {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                    ✉ Email
                  </span>
                </div>
                {/* Thumbnail + stats row */}
                <div className="flex items-center gap-3 px-3 pb-3.5 border-t border-gray-100 pt-2.5">
                  {/* Small thumbnail */}
                  <div className="w-14 h-12 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    <TemplatePreviewThumbnail html={c.html_body} height={48} />
                  </div>
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 flex-1 min-w-0">
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-tight">{(c.sent || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-400">Sent</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-tight">{pct(c.unique_opens || 0, c.sent || 0)}</p>
                      <p className="text-xs text-gray-400">Open rate</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-tight">{pct(c.unique_clicks || 0, c.sent || 0)}</p>
                      <p className="text-xs text-gray-400">Click rate</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-tight">{(c.bounces || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-400">Bounced</p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

const QUICK_ACTIONS = [
  { href: '/templates', icon: FileText, label: 'View email templates', color: 'text-blue-600', bg: 'bg-blue-50' },
  { href: '/contacts', icon: Users, label: 'Add contacts', color: 'text-green-600', bg: 'bg-green-50' },
  { href: '/campaigns/new', icon: Plus, label: 'Create a campaign', color: 'text-purple-600', bg: 'bg-purple-50' },
  { href: '/templates/ai-maker', icon: TrendingUp, label: 'AI Template Maker', color: 'text-orange-600', bg: 'bg-orange-50' },
]

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
    } catch { setError('Failed to load analytics') }
    finally { setLoading(false) }
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

      {/* Welcome banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">
            Welcome back{data?.userName ? `, ${data.userName}!` : '!'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Here's what's happening with your email marketing.</p>
        </div>
        <button
          onClick={load}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-all"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error} — <button onClick={load} className="underline font-medium">Retry</button>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(a => (
            <Link key={a.href} href={a.href}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:shadow-card-hover hover:border-gray-300 transition-all group shadow-card"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${a.bg} group-hover:scale-110 transition-transform`}>
                <a.icon className={`w-4.5 h-4.5 ${a.color}`} />
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-24 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-7 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      ) : data ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Subscribers"
              value={(data.totalContacts || 0).toLocaleString()}
              sub="All-time contacts"
              icon={<Users className="w-5 h-5 text-blue-600" />}
              accent="bg-blue-50"
            />
            <StatCard
              label="Campaigns Sent"
              value={(data.sentCampaigns || 0).toLocaleString()}
              sub={`of ${data.totalCampaigns} total`}
              icon={<Send className="w-5 h-5 text-green-600" />}
              accent="bg-green-50"
            />
            <StatCard
              label="Avg. Open Rate"
              value={openRate}
              sub={`${totalOpens.toLocaleString()} total opens`}
              icon={<Eye className="w-5 h-5 text-orange-500" />}
              accent="bg-orange-50"
            />
            <StatCard
              label="Avg. Click Rate"
              value={clickRate}
              sub={`${totalClicks.toLocaleString()} total clicks`}
              icon={<MousePointer className="w-5 h-5 text-purple-600" />}
              accent="bg-purple-50"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Opens — Last 30 Days</h2>
              </div>
              {(data.opensByDay || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={data.opensByDay}>
                    <defs>
                      <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} width={30} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }} />
                    <Area type="monotone" dataKey="opens" stroke="#2563EB" strokeWidth={2} fill="url(#blueGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                    <Eye className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">No open data yet</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Data appears after you send campaigns with tracking enabled</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Contact Growth — Last 30 Days</h2>
              </div>
              {(data.contactGrowth || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={data.contactGrowth}>
                    <defs>
                      <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16A34A" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} width={30} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }} />
                    <Area type="monotone" dataKey="new_contacts" stroke="#16A34A" strokeWidth={2} fill="url(#greenGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">No contact data yet</p>
                  <Link href="/contacts" className="text-xs text-blue-600 hover:underline mt-1">Import contacts to get started →</Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent campaigns — CC-style horizontal cards */}
          <RecentCampaigns campaigns={data.recentCampaigns || []} />
        </>
      ) : null}
    </div>
  )
}
