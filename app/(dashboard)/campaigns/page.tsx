'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Toast } from '@/components/ui'
import { Plus, Send, BarChart2, Trash2, Edit2, FlaskConical, Calendar, X, Settings, Search, Copy, MoreHorizontal, RefreshCw, Users, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ScheduleDateTimePicker } from '@/components/ui'
import { TemplatePreviewThumbnail } from '@/components/email-builder/TemplatePreviewThumbnail'

interface Campaign {
  id: string; name: string; subject: string; status: string; sent_at: string | null
  created_at: string; scheduled_at: string | null; sent: number; unique_opens: number; unique_clicks: number
  bounces: number; unsubscribes: number; html_body: string | null; list_ids: string | null
}

interface List { id: string; name: string; contact_count: number }

const STATUS_STYLE: Record<string, string> = {
  sent: 'bg-green-100 text-green-700',
  draft: 'bg-gray-800 text-white',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-yellow-100 text-yellow-700',
}

function pct(num: number, denom: number) {
  if (!denom) return '0%'
  return `${Math.round((num / denom) * 100)}%`
}

function MoreMenu({ campaign, onDelete, onDuplicate, onCancelSchedule }: {
  campaign: Campaign; onDelete: () => void; onDuplicate: () => void; onCancelSchedule: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-gray-200 shadow-dropdown z-50 py-1">
          {campaign.status === 'scheduled' ? (
            <button onClick={() => { onCancelSchedule(); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 transition-colors">
              <X className="w-3.5 h-3.5" /> Cancel Schedule
            </button>
          ) : (
            <Link href={`/campaigns/${campaign.id}`} onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <Edit2 className="w-3.5 h-3.5 text-gray-400" /> Edit
            </Link>
          )}
          {campaign.status === 'sent' && (
            <Link href={`/campaigns/${campaign.id}/report`} onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <BarChart2 className="w-3.5 h-3.5 text-gray-400" /> View report
            </Link>
          )}
          <button onClick={() => { onDuplicate(); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Copy className="w-3.5 h-3.5 text-gray-400" /> Duplicate
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button onClick={() => { onDelete(); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

// List selector component used in schedule & send now forms
function ListSelector({ lists, selected, onChange }: { lists: List[]; selected: string[]; onChange: (ids: string[]) => void }) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }
  if (!lists.length) return <p className="text-xs text-gray-400">No contact lists found. <Link href="/lists" className="text-blue-600 underline">Create one first.</Link></p>
  return (
    <div className="space-y-1.5 max-h-40 overflow-y-auto">
      {lists.map(l => (
        <label key={l.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${selected.includes(l.id) ? 'bg-blue-50 border-blue-200' : 'border-transparent hover:bg-gray-50'}`}>
          <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggle(l.id)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600" />
          <span className="flex-1 text-sm font-medium text-gray-900">{l.name}</span>
          <span className="text-xs text-gray-400">{(l.contact_count || 0).toLocaleString()} contacts</span>
        </label>
      ))}
    </div>
  )
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [filtered, setFiltered] = useState<Campaign[]>([])
  const [lists, setLists] = useState<List[]>([])
  const [loading, setLoading] = useState(true)
  const [upcomingRecurring, setUpcomingRecurring] = useState<Array<{ id: string; name: string; frequency: string; next_send_at: string; status: string; list_ids: string | null }>>([])

  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [testSending, setTestSending] = useState(false)
  const [showTestForm, setShowTestForm] = useState(false)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [showSendNowConfirm, setShowSendNowConfirm] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const [scheduleListIds, setScheduleListIds] = useState<string[]>([])
  const [sendListIds, setSendListIds] = useState<string[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  const [syncingStats, setSyncingStats] = useState(false)

  // Resend to non-openers
  const [resendData, setResendData] = useState<{ waves: Array<{ id: string; wave_number: number; sent_count: number; unique_opens: number; unique_clicks: number; sent_at: string }>; nonOpenerCount: number; totalRecipients: number; totalOpened: number } | null>(null)
  const [resending, setResending] = useState(false)
  const [showResendHistory, setShowResendHistory] = useState(false)

  // Auto-resend when scheduling
  const [autoResend, setAutoResend] = useState(false)
  const [autoResendDays, setAutoResendDays] = useState(3)

  async function load(syncId?: string) {
    const [cRes, lRes, rRes] = await Promise.all([fetch('/api/campaigns'), fetch('/api/lists'), fetch('/api/recurring-campaigns')])
    const cs = await cRes.json()
    setCampaigns(cs)
    setLists(await lRes.json())
    if (rRes.ok) {
      const rc = await rRes.json()
      setUpcomingRecurring(Array.isArray(rc) ? rc.filter((r: { status: string; next_send_at: string }) => r.status === 'active' && r.next_send_at) : [])
    }
    setLoading(false)
    if (syncId) setPreviewCampaign(cs.find((c: Campaign) => c.id === syncId) ?? null)
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    let list = campaigns
    if (q) list = list.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || c.subject?.toLowerCase().includes(q.toLowerCase()))
    if (statusFilter !== 'all') list = list.filter(c => c.status === statusFilter)
    setFiltered(list)
    setSelected(new Set())
  }, [campaigns, q, statusFilter])

  async function deleteCampaign(id: string) {
    if (!confirm('Delete this campaign?')) return
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    load(); setToast({ msg: 'Campaign deleted', type: 'success' })
  }

  async function duplicateCampaign(c: Campaign) {
    const res = await fetch('/api/campaigns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `${c.name} (copy)`, subject: c.subject, html_body: c.html_body }),
    })
    if (res.ok) { load(); setToast({ msg: 'Campaign duplicated', type: 'success' }) }
  }

  async function syncStats(id: string) {
    setSyncingStats(true)
    try {
      const res = await fetch(`/api/campaigns/${id}/refresh-stats`, { method: 'POST' })
      const d = await res.json()
      if (d.ok) {
        await load(id)
        const dbg = d.debug
        let msg = `Synced from Postmark — ${d.stats?.uniqueOpens ?? 0} opens, ${d.stats?.uniqueClicks ?? 0} clicks`
        if (dbg?.apiErrors?.length) msg = `Postmark API error: ${dbg.apiErrors[0]}`
        else if (d.synced === 0) msg = d.error || 'No message IDs found — resend the campaign to enable tracking'
        else if (dbg?.eventTypesFromPostmark?.length === 0) msg = `Synced (no events yet — Postmark shows: delivered only)`
        else if (dbg?.eventTypesFromPostmark) msg += ` · Events: ${dbg.eventTypesFromPostmark.join(', ')}`
        setToast({ msg, type: d.stats?.uniqueOpens > 0 ? 'success' : 'info' })
      } else {
        setToast({ msg: d.error || 'Sync failed', type: 'error' })
      }
    } finally {
      setSyncingStats(false)
    }
  }

  async function cancelSchedule(id: string) {
    if (!confirm('Cancel scheduled send? The campaign will go back to draft.')) return
    const res = await fetch(`/api/campaigns/${id}/cancel-schedule`, { method: 'POST' })
    if (res.ok) { load(); setToast({ msg: 'Schedule cancelled — campaign is now a draft', type: 'success' }); setPreviewCampaign(null) }
    else setToast({ msg: 'Failed to cancel schedule', type: 'error' })
  }

  async function deleteSelected() {
    const count = selected.size
    if (!count) return
    if (!confirm(`Delete ${count} campaign${count !== 1 ? 's' : ''}? This cannot be undone.`)) return

    // When all visible campaigns are selected, use server-side subquery (no SQL variable limit)
    const allVisible = count === filtered.length && filtered.length > 0
    const res = await fetch('/api/campaigns', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        allVisible
          ? { delete_all: true, status_filter: statusFilter === 'all' ? '' : statusFilter }
          : { ids: Array.from(selected) }
      ),
    })
    const data = await res.json()
    setSelected(new Set())
    load()
    if (res.ok) setToast({ msg: `${data.deleted} campaign${data.deleted !== 1 ? 's' : ''} deleted`, type: 'success' })
    else setToast({ msg: data.error || 'Delete failed', type: 'error' })
  }

  async function sendTest() {
    if (!testEmail || !previewCampaign) return
    setTestSending(true)
    const res = await fetch(`/api/campaigns/${previewCampaign.id}/test`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_email: testEmail }),
    })
    setTestSending(false)
    const data = await res.json()
    if (res.ok) { setShowTestForm(false); setToast({ msg: `Test sent to ${testEmail}`, type: 'success' }) }
    else setToast({ msg: data.error || 'Failed to send test', type: 'error' })
  }

  async function scheduleCampaign() {
    if (!scheduleAt || !previewCampaign) return
    if (!scheduleListIds.length) { setToast({ msg: 'Please select at least one contact list', type: 'error' }); return }
    setActionLoading(true)
    const res = await fetch('/api/scheduled-campaigns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: previewCampaign.id, scheduled_at: scheduleAt, list_ids: scheduleListIds, auto_resend_after_hours: autoResend ? autoResendDays * 24 : 0 }),
    })
    setActionLoading(false)
    if (res.ok) {
      setShowScheduleForm(false)
      const resendNote = autoResend ? ` · Auto-resend in ${autoResendDays}d` : ''
      setToast({ msg: `Scheduled for ${new Date(scheduleAt).toLocaleString()}${resendNote}`, type: 'success' })
      setScheduleAt(''); setAutoResend(false)
      setPreviewCampaign(null); load()
    } else {
      const d = await res.json()
      setToast({ msg: d.error || 'Scheduling failed', type: 'error' })
    }
  }

  async function sendNow() {
    if (!previewCampaign) return
    if (!sendListIds.length) { setToast({ msg: 'Please select at least one contact list', type: 'error' }); return }
    setActionLoading(true)
    setToast({ msg: 'Sending…', type: 'info' })
    const res = await fetch(`/api/campaigns/${previewCampaign.id}/send`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list_ids: sendListIds }),
    })
    const data = await res.json()
    setActionLoading(false)
    if (res.ok) { setToast({ msg: `Sent to ${data.sent} contacts!`, type: 'success' }); setPreviewCampaign(null); load() }
    else setToast({ msg: data.error || 'Send failed', type: 'error' })
  }

  async function loadResendData(campaignId: string) {
    const res = await fetch(`/api/campaigns/${campaignId}/resend`)
    if (res.ok) setResendData(await res.json())
  }

  async function triggerResend(campaignId: string) {
    if (!confirm('This will sync opens from Postmark and immediately send to all non-openers. Continue?')) return
    setResending(true)
    const res = await fetch(`/api/campaigns/${campaignId}/resend`, { method: 'POST' })
    const data = await res.json()
    setResending(false)
    if (data.ok) {
      setToast({ msg: `Wave ${data.wave} sent to ${data.sent} non-openers!`, type: 'success' })
      loadResendData(campaignId)
    } else {
      setToast({ msg: data.message || data.error || 'Resend failed', type: data.message ? 'info' : 'error' })
    }
  }

  function openPreview(c: Campaign) {
    setPreviewCampaign(c)
    setShowTestForm(false); setShowScheduleForm(false); setShowSendNowConfirm(false)
    setTestEmail(''); setScheduleAt('')
    setScheduleListIds([]); setSendListIds([])
    setResendData(null); setShowResendHistory(false)
    if (c.status === 'sent') loadResendData(c.id)
  }

  function toggleSelect(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const allPageSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id))
  function toggleAll() {
    if (allPageSelected) setSelected(new Set())
    else setSelected(new Set(filtered.map(c => c.id)))
  }

  const STATUS_TABS = [
    { key: 'all', label: 'All campaigns' },
    { key: 'draft', label: 'Draft' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'sent', label: 'Sent' },
  ]

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Campaigns</h1>
        <div className="flex items-center gap-2">
          <Link href="/settings">
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-card">
              <Settings className="w-4 h-4" /> Settings
            </button>
          </Link>
          <Link href="/campaigns/new">
            <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Create a campaign
            </button>
          </Link>
        </div>
      </div>

      {/* Tabs + filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-card">
        {/* Status tabs */}
        <div className="flex items-center gap-0 border-b border-gray-100 px-4">
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-all ${
                statusFilter === t.key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50 w-52"
                placeholder="Search campaigns…"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 bg-blue-600 text-white px-4 py-2.5">
            <span className="text-sm font-semibold">{selected.size} selected</span>
            <button onClick={deleteSelected} className="flex items-center gap-1.5 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors ml-2">
              <Trash2 className="w-3.5 h-3.5" /> Delete selected
            </button>
            <button onClick={() => setSelected(new Set())} className="ml-auto p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/20 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Campaign list */}
        {loading ? (
          <div className="divide-y divide-gray-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 flex gap-4 animate-pulse items-center">
                <div className="w-4 h-4 bg-gray-200 rounded flex-shrink-0" />
                <div className="w-20 h-16 bg-gray-200 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-64" />
                  <div className="flex gap-2"><div className="h-5 bg-gray-200 rounded-full w-12" /><div className="h-5 bg-gray-100 rounded-full w-24" /></div>
                  <div className="h-3 bg-gray-100 rounded w-80" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-900 font-semibold mb-1">
              {campaigns.length === 0 ? 'No campaigns yet' : 'No campaigns match your search'}
            </p>
            <p className="text-sm text-gray-500 mb-5">
              {campaigns.length === 0 ? 'Create your first email campaign to get started.' : 'Try adjusting your filters.'}
            </p>
            {campaigns.length === 0 && (
              <Link href="/campaigns/new">
                <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors mx-auto">
                  <Plus className="w-4 h-4" /> Create Campaign
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Header row */}
            <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100">
              <input
                type="checkbox"
                checked={allPageSelected}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaign</span>
            </div>

            {filtered.map(c => {
              const isSent = c.status === 'sent'
              const isScheduled = c.status === 'scheduled'
              const isSelected = selected.has(c.id)
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50/60'}`}
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(c.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Thumbnail */}
                  <div
                    className="w-[84px] h-[72px] flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                    onClick={() => openPreview(c)}
                  >
                    <TemplatePreviewThumbnail html={c.html_body} height={72} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openPreview(c)}>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900 text-[14px] hover:text-blue-600 truncate max-w-[380px]">
                        {c.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${STATUS_STYLE[c.status] || 'bg-gray-100 text-gray-600'}`}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                        ✉ Email
                      </span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">
                        {isSent && c.sent_at ? `Sent ${formatDate(c.sent_at)}` : isScheduled ? `Scheduled ${c.scheduled_at ? formatDateTime(c.scheduled_at) : ''}` : `Created ${formatDate(c.created_at)}`}
                      </span>
                      {!isSent && (() => {
                        const ids: string[] = JSON.parse(c.list_ids || '[]')
                        const count = ids.reduce((s, lid) => s + (lists.find(l => l.id === lid)?.contact_count || 0), 0)
                        return ids.length > 0 ? (
                          <>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Users className="w-3 h-3" />{count.toLocaleString()} contacts
                            </span>
                          </>
                        ) : null
                      })()}
                    </div>
                    {isSent && (c.sent || 0) > 0 && (
                      <div className="flex items-center flex-wrap gap-x-0 text-xs text-blue-600">
                        <span>{(c.sent || 0).toLocaleString()} sends</span>
                        <span className="text-gray-300 mx-1.5">·</span>
                        <span>{(c.unique_opens || 0).toLocaleString()} ({pct(c.unique_opens || 0, c.sent || 0)}) opens</span>
                        <span className="text-gray-300 mx-1.5">·</span>
                        <span>{(c.unique_clicks || 0).toLocaleString()} ({pct(c.unique_clicks || 0, c.sent || 0)}) clicks</span>
                        <span className="text-gray-300 mx-1.5">·</span>
                        <span>{(c.bounces || 0).toLocaleString()} ({pct(c.bounces || 0, c.sent || 0)}) bounces</span>
                        <span className="text-gray-300 mx-1.5">·</span>
                        <span>{(c.unsubscribes || 0).toLocaleString()} ({pct(c.unsubscribes || 0, c.sent || 0)}) unsubscribes</span>
                      </div>
                    )}
                    {!isSent && c.subject && (
                      <p className="text-xs text-gray-400 truncate">{c.subject}</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {isSent ? (
                      <button
                        onClick={() => duplicateCampaign(c)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Copy
                      </button>
                    ) : isScheduled ? (
                      <button
                        onClick={() => cancelSchedule(c.id)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                      >
                        Cancel
                      </button>
                    ) : (
                      <Link href={`/campaigns/${c.id}`}>
                        <button className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                          Edit
                        </button>
                      </Link>
                    )}
                    <MoreMenu campaign={c} onDelete={() => deleteCampaign(c.id)} onDuplicate={() => duplicateCampaign(c)} onCancelSchedule={() => cancelSchedule(c.id)} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recurring campaign schedules — shown in Scheduled or All tab */}
      {(statusFilter === 'scheduled' || statusFilter === 'all') && upcomingRecurring.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-500" />
            <p className="text-sm font-semibold text-gray-700">Recurring Campaigns — Upcoming Sends</p>
          </div>
          <div className="divide-y divide-gray-100">
            {upcomingRecurring.map(rc => {
              const rcListIds: string[] = JSON.parse(rc.list_ids || '[]')
              const rcContactCount = rcListIds.reduce((s, lid) => s + (lists.find(l => l.id === lid)?.contact_count || 0), 0)
              return (
              <div key={rc.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{rc.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize flex items-center gap-1.5 flex-wrap">
                    {rc.frequency} · Next: <span className="font-medium text-gray-700">{formatDateTime(rc.next_send_at)}</span>
                    {rcContactCount > 0 && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="flex items-center gap-1 text-gray-500"><Users className="w-3 h-3" />{rcContactCount.toLocaleString()} contacts</span>
                      </>
                    )}
                  </p>
                </div>
                <Link href={`/recurring-campaigns/${rc.id}`}>
                  <button className="px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                    View schedule
                  </button>
                </Link>
              </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Campaign Preview Modal */}
      {previewCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col" style={{ height: '90vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`px-2.5 py-0.5 rounded text-xs font-bold flex-shrink-0 ${STATUS_STYLE[previewCampaign.status] || 'bg-gray-100 text-gray-600'}`}>
                  {previewCampaign.status.charAt(0).toUpperCase() + previewCampaign.status.slice(1)}
                </span>
                <div className="min-w-0">
                  <h2 className="font-bold text-gray-900 text-base truncate">{previewCampaign.name}</h2>
                  <p className="text-xs text-gray-500 truncate">{previewCampaign.subject}</p>
                </div>
              </div>
              <button onClick={() => setPreviewCampaign(null)} className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors ml-4 flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Preview */}
              <div className="flex-1 overflow-auto bg-[#F0F2F5] p-6">
                <iframe
                  srcDoc={previewCampaign.html_body || '<div style="font-family:sans-serif;color:#999;padding:60px;text-align:center;font-size:14px">No preview available</div>'}
                  title="Campaign Preview"
                  className="w-full max-w-[640px] mx-auto block border-0 bg-white shadow-lg rounded-xl"
                  style={{ minHeight: 500 }}
                  sandbox="allow-same-origin"
                />
              </div>

              {/* Action panel */}
              <div className="w-64 flex-shrink-0 border-l border-gray-100 bg-gray-50 flex flex-col overflow-y-auto">
                <div className="p-4 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Campaign Actions</p>
                </div>

                <div className="p-4 flex flex-col gap-2.5">
                  {/* SENT: report + sync + resend + copy */}
                  {previewCampaign.status === 'sent' && (
                    <>
                      <Link href={`/campaigns/${previewCampaign.id}/report`} className="block">
                        <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                          <BarChart2 className="w-3.5 h-3.5 text-gray-400" /> View Report
                        </button>
                      </Link>
                      <button onClick={() => syncStats(previewCampaign.id)} disabled={syncingStats}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm">
                        {syncingStats ? <span className="w-3.5 h-3.5 border-2 border-gray-400/30 border-t-gray-500 rounded-full animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-gray-400" />}
                        Sync Stats from Postmark
                      </button>

                      {/* Resend to non-openers section */}
                      <div className="border border-orange-200 rounded-xl bg-orange-50/60 p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-orange-800 flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> Resend to Non-Openers</p>
                          {resendData && (
                            <button onClick={() => setShowResendHistory(h => !h)} className="text-[10px] text-orange-600 hover:text-orange-800 flex items-center gap-0.5">
                              History {showResendHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>

                        {resendData ? (
                          <>
                            {/* Wave 1 stats */}
                            <div className="text-[11px] text-orange-700 space-y-0.5">
                              <div className="flex justify-between">
                                <span>Wave 1 (original)</span>
                                <span className="font-semibold">{(resendData.totalRecipients).toLocaleString()} sent · {resendData.totalOpened.toLocaleString()} opened</span>
                              </div>
                              {showResendHistory && resendData.waves.map(w => (
                                <div key={w.id} className="flex justify-between text-orange-600 pl-2 border-l border-orange-200">
                                  <span>Wave {w.wave_number} resend</span>
                                  <span className="font-semibold">{w.sent_count.toLocaleString()} sent · {w.unique_opens.toLocaleString()} opened</span>
                                </div>
                              ))}
                            </div>
                            <div className="text-[11px] text-orange-700 font-semibold bg-orange-100 rounded-lg px-2 py-1.5">
                              {resendData.nonOpenerCount.toLocaleString()} contacts haven&apos;t opened yet
                            </div>
                            {resendData.nonOpenerCount > 0 ? (
                              <button onClick={() => triggerResend(previewCampaign.id)} disabled={resending}
                                className="w-full py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5">
                                {resending ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                {resending ? 'Syncing & Sending…' : `Resend to ${resendData.nonOpenerCount.toLocaleString()} Non-Openers`}
                              </button>
                            ) : (
                              <p className="text-[11px] text-green-700 bg-green-50 rounded-lg px-2 py-1.5 font-medium">Everyone has opened! 🎉</p>
                            )}
                          </>
                        ) : (
                          <p className="text-[11px] text-orange-600">Loading opens data…</p>
                        )}
                      </div>

                      <button onClick={() => duplicateCampaign(previewCampaign)} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                        <Copy className="w-3.5 h-3.5 text-gray-400" /> Duplicate Campaign
                      </button>
                    </>
                  )}

                  {/* SCHEDULED: cancel option */}
                  {previewCampaign.status === 'scheduled' && (
                    <>
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                        <p className="font-semibold mb-0.5">Scheduled</p>
                        <p>This campaign is queued to send. Cancel if you need to make changes.</p>
                      </div>
                      <button onClick={() => cancelSchedule(previewCampaign.id)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors">
                        <X className="w-3.5 h-3.5" /> Cancel Schedule
                      </button>
                    </>
                  )}

                  {/* DRAFT: full action set */}
                  {previewCampaign.status !== 'sent' && previewCampaign.status !== 'scheduled' && (
                    <>
                      <Link href={`/campaigns/${previewCampaign.id}`} className="block">
                        <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                          <Edit2 className="w-3.5 h-3.5 text-gray-400" /> Edit Campaign
                        </button>
                      </Link>
                      <div className="border-t border-gray-200 pt-2.5 space-y-2">
                        {/* Test email */}
                        {!showTestForm && !showScheduleForm && !showSendNowConfirm && (
                          <button onClick={() => setShowTestForm(true)} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                            <FlaskConical className="w-3.5 h-3.5 text-gray-400" /> Send Test Email
                          </button>
                        )}
                        {showTestForm && (
                          <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2.5">
                            <p className="text-xs font-semibold text-gray-700">Send test to:</p>
                            <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="your@email.com" autoFocus
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                            <button onClick={sendTest} disabled={testSending || !testEmail}
                              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                              {testSending ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                              {testSending ? 'Sending…' : 'Send Test'}
                            </button>
                            <button onClick={() => setShowTestForm(false)} className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                          </div>
                        )}

                        {/* Schedule */}
                        {!showTestForm && !showScheduleForm && !showSendNowConfirm && (
                          <button onClick={() => setShowScheduleForm(true)} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" /> Schedule Send
                          </button>
                        )}
                        {showScheduleForm && (
                          <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2.5">
                            <p className="text-xs font-semibold text-gray-700">Send to (contact lists):</p>
                            <ListSelector lists={lists} selected={scheduleListIds} onChange={setScheduleListIds} />
                            <p className="text-xs font-semibold text-gray-700 pt-1">Send date & time:</p>
                            <ScheduleDateTimePicker compact onChange={setScheduleAt} />
                            {/* Auto-resend to non-openers */}
                            <div className="border border-gray-200 rounded-lg p-2.5 space-y-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={autoResend} onChange={e => setAutoResend(e.target.checked)} className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600" />
                                <span className="text-xs font-medium text-gray-700 flex items-center gap-1"><RotateCcw className="w-3 h-3 text-gray-400" /> Resend to non-openers</span>
                              </label>
                              {autoResend && (
                                <div className="pl-5">
                                  <select value={autoResendDays} onChange={e => setAutoResendDays(Number(e.target.value))}
                                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                                    <option value={1}>1 day after initial send</option>
                                    <option value={2}>2 days after initial send</option>
                                    <option value={3}>3 days after initial send</option>
                                    <option value={5}>5 days after initial send</option>
                                    <option value={7}>1 week after initial send</option>
                                  </select>
                                  <p className="text-[10px] text-gray-400 mt-1">Opens will be synced from Postmark before resending</p>
                                </div>
                              )}
                            </div>
                            <button onClick={scheduleCampaign} disabled={actionLoading || !scheduleAt || !scheduleListIds.length}
                              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                              {actionLoading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                              Confirm Schedule
                            </button>
                            <button onClick={() => setShowScheduleForm(false)} className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                          </div>
                        )}

                        {/* Send now */}
                        {!showTestForm && !showScheduleForm && !showSendNowConfirm && (
                          <button onClick={() => setShowSendNowConfirm(true)} disabled={actionLoading}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
                            <Send className="w-3.5 h-3.5" /> Send Now
                          </button>
                        )}
                        {showSendNowConfirm && (
                          <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2.5">
                            <p className="text-xs font-semibold text-gray-700">Send to (contact lists):</p>
                            <ListSelector lists={lists} selected={sendListIds} onChange={setSendListIds} />
                            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-2 text-xs text-yellow-700">
                              This will send immediately and cannot be undone.
                            </div>
                            <button onClick={sendNow} disabled={actionLoading || !sendListIds.length}
                              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                              {actionLoading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              Send Now
                            </button>
                            <button onClick={() => setShowSendNowConfirm(false)} className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Stats summary for sent */}
                  {previewCampaign.status === 'sent' && (
                    <div className="mt-auto border-t border-gray-200 pt-3 space-y-2">
                      {[
                        { label: 'Sent', value: (previewCampaign.sent || 0).toLocaleString() },
                        { label: 'Opens', value: `${(previewCampaign.unique_opens || 0).toLocaleString()} (${pct(previewCampaign.unique_opens || 0, previewCampaign.sent || 0)})` },
                        { label: 'Clicks', value: `${(previewCampaign.unique_clicks || 0).toLocaleString()} (${pct(previewCampaign.unique_clicks || 0, previewCampaign.sent || 0)})` },
                        { label: 'Bounces', value: `${(previewCampaign.bounces || 0).toLocaleString()} (${pct(previewCampaign.bounces || 0, previewCampaign.sent || 0)})` },
                        { label: 'Unsubscribes', value: `${(previewCampaign.unsubscribes || 0).toLocaleString()} (${pct(previewCampaign.unsubscribes || 0, previewCampaign.sent || 0)})` },
                      ].map(s => (
                        <div key={s.label} className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">{s.label}</span>
                          <span className="text-sm font-bold text-gray-900">{s.value}</span>
                        </div>
                      ))}
                      <p className="text-xs text-gray-400 pt-1">{formatDate(previewCampaign.sent_at || previewCampaign.created_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

