'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button, Badge, Toast } from '@/components/ui'
import { Plus, Send, BarChart2, Trash2, Edit2 } from 'lucide-react'
import { formatDate, formatPercent } from '@/lib/utils'
import { TemplatePreviewThumbnail } from '@/components/email-builder/TemplatePreviewThumbnail'

interface Campaign {
  id: string; name: string; subject: string; status: string; sent_at: string | null
  created_at: string; total_recipients: number; sent: number; opens: number; unique_opens: number
  clicks: number; unique_clicks: number; html_body: string | null
}

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  sent: 'success', draft: 'default', scheduled: 'info', sending: 'warning',
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  async function load() {
    const res = await fetch('/api/campaigns')
    setCampaigns(await res.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function deleteCampaign(id: string) {
    if (!confirm('Delete this campaign?')) return
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    load()
    setToast({ msg: 'Campaign deleted', type: 'success' })
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage your email campaigns</p>
        </div>
        <Link href="/campaigns/new"><Button size="sm"><Plus className="w-3.5 h-3.5" /> New Campaign</Button></Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400">Loading…</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
          <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No campaigns yet. Create your first campaign.</p>
          <Link href="/campaigns/new"><Button size="sm"><Plus className="w-3.5 h-3.5" /> Create Campaign</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(c => (
            <div key={c.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <Link href={c.status === 'sent' ? `/campaigns/${c.id}/report` : `/campaigns/${c.id}`} className="block">
                <TemplatePreviewThumbnail html={c.html_body} height={140} />
              </Link>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link href={c.status === 'sent' ? `/campaigns/${c.id}/report` : `/campaigns/${c.id}`} className="font-semibold text-gray-900 hover:text-brand-600 truncate block">{c.name}</Link>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{c.subject}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {c.status === 'sent' && (
                      <Link href={`/campaigns/${c.id}/report`} className="p-1 text-gray-400 hover:text-brand-600 rounded" title="Report">
                        <BarChart2 className="w-4 h-4" />
                      </Link>
                    )}
                    {c.status !== 'sent' && (
                      <Link href={`/campaigns/${c.id}`} className="p-1 text-gray-400 hover:text-brand-600 rounded" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </Link>
                    )}
                    <button onClick={() => deleteCampaign(c.id)} className="p-1 text-gray-400 hover:text-red-600 rounded" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_COLORS[c.status] || 'default'}>{c.status}</Badge>
                  <span className="text-xs text-gray-400">{formatDate(c.sent_at || c.created_at)}</span>
                </div>

                {c.status === 'sent' && (
                  <div className="flex gap-4 text-xs text-gray-500 border-t pt-2 mt-1">
                    <span><span className="font-medium text-gray-700">{(c.sent || 0).toLocaleString()}</span> sent</span>
                    <span><span className="font-medium text-gray-700">{formatPercent(c.unique_opens || 0, c.sent || 0)}</span> opens</span>
                    <span><span className="font-medium text-gray-700">{formatPercent(c.unique_clicks || 0, c.sent || 0)}</span> clicks</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
