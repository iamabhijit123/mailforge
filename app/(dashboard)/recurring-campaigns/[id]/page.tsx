'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { Toast } from '@/components/ui'
import {
  ArrowLeft, Pause, Play, Trash2, Calendar, Clock, Send,
  Edit2, Check, X, RotateCcw, FolderOpen, AlertCircle,
} from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'

interface RecurringCampaign {
  id: string; name: string; subject: string; status: string; frequency: string
  start_date: string; end_date: string | null; send_time: string; timezone: string
  from_name: string; from_email: string; reply_to: string | null
  folder_name: string | null; template_folder_id: string | null
  rotation_index: number; created_at: string
}
interface RecurringSend {
  id: string; scheduled_date: string; scheduled_time: string; scheduled_at: string
  status: string; is_adjusted: number; campaign_id: string | null; template_name: string | null
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
  skipped: 'bg-gray-100 text-gray-500',
}

const CAMPAIGN_STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-gray-100 text-gray-600',
  draft: 'bg-gray-800 text-white',
}

const FREQ_LABEL: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly',
}

function EditSendModal({
  send,
  onClose,
  onSave,
}: {
  send: RecurringSend
  onClose: () => void
  onSave: (sendId: string, scheduledDate: string, scheduledTime: string, scheduledAt: string) => Promise<void>
}) {
  const [date, setDate] = useState(send.scheduled_date)
  const [time, setTime] = useState(send.scheduled_time)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const localDt = `${date}T${time}:00`
    const utcAt = new Date(localDt).toISOString()
    await onSave(send.id, date, time, utcAt)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Adjust Send Date</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
              {saving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
            <button onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RecurringCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [campaign, setCampaign] = useState<RecurringCampaign | null>(null)
  const [sends, setSends] = useState<RecurringSend[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSend, setEditingSend] = useState<RecurringSend | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  async function load() {
    const res = await fetch(`/api/recurring-campaigns/${id}`)
    const data = await res.json()
    setCampaign(data.campaign)
    setSends(Array.isArray(data.sends) ? data.sends : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  async function toggleStatus() {
    if (!campaign) return
    const newStatus = campaign.status === 'active' ? 'paused' : 'active'
    await fetch(`/api/recurring-campaigns/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setToast({ msg: newStatus === 'active' ? 'Campaign resumed' : 'Campaign paused', type: 'success' })
    load()
  }

  async function deleteCampaign() {
    if (!confirm('Delete this recurring campaign and all its scheduled sends?')) return
    await fetch(`/api/recurring-campaigns/${id}`, { method: 'DELETE' })
    window.location.href = '/recurring-campaigns'
  }

  async function adjustSend(sendId: string, scheduledDate: string, scheduledTime: string, scheduledAt: string) {
    await fetch(`/api/recurring-campaigns/${id}/sends`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ send_id: sendId, scheduled_at: scheduledAt, scheduled_date: scheduledDate, scheduled_time: scheduledTime }),
    })
    setToast({ msg: 'Send date updated', type: 'success' })
    load()
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
  if (!campaign) return <div className="text-center mt-20 text-gray-500">Campaign not found</div>

  const pendingSends = sends.filter(s => s.status === 'pending')
  const sentSends = sends.filter(s => s.status === 'sent')

  return (
    <div className="space-y-5 max-w-4xl">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {editingSend && (
        <EditSendModal send={editingSend} onClose={() => setEditingSend(null)} onSave={adjustSend} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link href="/recurring-campaigns" className="mt-1 text-gray-400 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">{campaign.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${CAMPAIGN_STATUS_STYLE[campaign.status] || 'bg-gray-100 text-gray-600'}`}>
                {campaign.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{campaign.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status !== 'completed' && (
            <button
              onClick={toggleStatus}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {campaign.status === 'active' ? <><Pause className="w-4 h-4 text-amber-500" /> Pause</> : <><Play className="w-4 h-4 text-green-500" /> Resume</>}
            </button>
          )}
          <button
            onClick={deleteCampaign}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* Stats + Info cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Sends', value: sends.length, icon: RotateCcw },
          { label: 'Sent', value: sentSends.length, icon: Send },
          { label: 'Remaining', value: pendingSends.length, icon: Clock },
          { label: 'Frequency', value: FREQ_LABEL[campaign.frequency] || campaign.frequency, icon: Calendar },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4 text-gray-400" />
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Campaign details */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Campaign Details</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div><span className="text-gray-400 text-xs block">From</span><span className="font-medium text-gray-900">{campaign.from_name} &lt;{campaign.from_email}&gt;</span></div>
          <div><span className="text-gray-400 text-xs block">Send Time</span><span className="font-medium text-gray-900">{campaign.send_time} ({campaign.timezone})</span></div>
          <div><span className="text-gray-400 text-xs block">Start Date</span><span className="font-medium text-gray-900">{formatDate(campaign.start_date)}</span></div>
          <div><span className="text-gray-400 text-xs block">End Date</span><span className="font-medium text-gray-900">{campaign.end_date ? formatDate(campaign.end_date) : 'Ongoing'}</span></div>
          {campaign.folder_name && <div><span className="text-gray-400 text-xs block">Template Folder</span><span className="font-medium text-gray-900 flex items-center gap-1.5"><FolderOpen className="w-3.5 h-3.5 text-gray-400" />{campaign.folder_name}</span></div>}
          <div><span className="text-gray-400 text-xs block">Created</span><span className="font-medium text-gray-900">{formatDate(campaign.created_at)}</span></div>
        </div>
      </div>

      {/* Sends table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Send Schedule ({sends.length} sends)</h2>
          {campaign.status === 'active' && pendingSends.length > 0 && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
              Click the edit icon on any pending send to adjust its date.
            </p>
          )}
        </div>
        {sends.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No sends scheduled yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sends.map((s, i) => (
              <div key={s.id} className={`flex items-center gap-4 px-5 py-3 group hover:bg-gray-50/50 ${s.status === 'sent' ? 'opacity-60' : ''}`}>
                <span className="text-xs text-gray-400 w-8 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{s.scheduled_date}</p>
                    <p className="text-xs text-gray-400">{s.scheduled_time}</p>
                    {s.is_adjusted ? <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded font-medium">adjusted</span> : null}
                  </div>
                  {s.template_name && <p className="text-xs text-gray-400 mt-0.5">{s.template_name}</p>}
                  {s.campaign_id && (
                    <Link href={`/campaigns/${s.campaign_id}/report`} className="text-xs text-blue-600 hover:underline mt-0.5 block">View report →</Link>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${STATUS_STYLE[s.status] || 'bg-gray-100 text-gray-600'}`}>
                  {s.status}
                </span>
                {s.status === 'pending' && campaign.status !== 'completed' && (
                  <button
                    onClick={() => setEditingSend(s)}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-600 border border-gray-200 rounded-lg bg-white hover:bg-blue-50 transition-all"
                    title="Adjust date"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
