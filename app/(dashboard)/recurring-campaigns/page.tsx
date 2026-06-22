'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Toast } from '@/components/ui'
import { Plus, RotateCcw, Pause, Play, Trash2, ChevronRight, Calendar, Send, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface RecurringCampaign {
  id: string; name: string; subject: string; status: string
  frequency: string; start_date: string; end_date: string | null
  total_sends: number; sent_count: number; next_send_at: string | null
  folder_name: string | null; created_at: string
}

const FREQ_LABEL: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly',
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-gray-100 text-gray-600',
  draft: 'bg-gray-800 text-white',
}

export default function RecurringCampaignsPage() {
  const [campaigns, setCampaigns] = useState<RecurringCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  async function load() {
    const res = await fetch('/api/recurring-campaigns')
    const data = await res.json()
    setCampaigns(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    await fetch(`/api/recurring-campaigns/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    load(); setToast({ msg: newStatus === 'active' ? 'Campaign resumed' : 'Campaign paused', type: 'success' })
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Delete this recurring campaign and all its scheduled sends?')) return
    await fetch(`/api/recurring-campaigns/${id}`, { method: 'DELETE' })
    load(); setToast({ msg: 'Recurring campaign deleted', type: 'success' })
  }

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Recurring Campaigns</h1>
          <p className="text-sm text-gray-500 mt-0.5">Automated campaigns that send on a schedule, rotating through templates.</p>
        </div>
        <Link href="/recurring-campaigns/new">
          <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> New Recurring Campaign
          </button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="px-6 py-4 animate-pulse flex items-center gap-4">
                <div className="w-40 h-4 bg-gray-200 rounded" />
                <div className="w-20 h-4 bg-gray-200 rounded" />
                <div className="ml-auto w-24 h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-900 font-semibold mb-1">No recurring campaigns yet</p>
            <p className="text-sm text-gray-500 mb-6">Set up a campaign that automatically sends on a schedule using rotating templates.</p>
            <Link href="/recurring-campaigns/new">
              <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors">
                <Plus className="w-4 h-4" /> Create your first recurring campaign
              </button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {campaigns.map(c => (
              <div key={c.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 group transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <Link href={`/recurring-campaigns/${c.id}`} className="font-semibold text-gray-900 text-sm hover:text-blue-600 transition-colors truncate">
                      {c.name}
                    </Link>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${STATUS_STYLE[c.status] || 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{c.subject}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{FREQ_LABEL[c.frequency] || c.frequency}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Started {formatDate(c.start_date)}</span>
                    {c.folder_name && <span className="text-gray-400">Folder: {c.folder_name}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-center flex-shrink-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{c.sent_count}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-0.5 justify-center"><Send className="w-3 h-3" /> Sent</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{c.total_sends - c.sent_count}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-0.5 justify-center"><Clock className="w-3 h-3" /> Remaining</p>
                  </div>
                  {c.next_send_at && c.status === 'active' && (
                    <div className="text-left">
                      <p className="text-xs text-gray-400">Next send</p>
                      <p className="text-xs font-semibold text-gray-700">{formatDate(c.next_send_at)}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {c.status !== 'completed' && (
                    <button
                      onClick={() => toggleStatus(c.id, c.status)}
                      title={c.status === 'active' ? 'Pause' : 'Resume'}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-amber-600 border border-gray-200 rounded-lg bg-white hover:bg-amber-50 transition-colors"
                    >
                      {c.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <Link href={`/recurring-campaigns/${c.id}`}>
                    <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 border border-gray-200 rounded-lg bg-white hover:bg-blue-50 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </Link>
                  <button
                    onClick={() => deleteCampaign(c.id)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 border border-gray-200 rounded-lg bg-white hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
