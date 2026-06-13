'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button, Badge, Toast, Input } from '@/components/ui'
import { Plus, Send, BarChart2, Trash2, Edit2, FlaskConical, Calendar, X } from 'lucide-react'
import { formatDate, formatPercent } from '@/lib/utils'
import { TemplatePreviewThumbnail } from '@/components/email-builder/TemplatePreviewThumbnail'

interface Campaign {
  id: string; name: string; subject: string; status: string; sent_at: string | null
  created_at: string; sent: number; unique_opens: number; unique_clicks: number; html_body: string | null
}

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  sent: 'success', draft: 'default', scheduled: 'info', sending: 'warning',
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Preview modal state
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [testSending, setTestSending] = useState(false)
  const [showTestForm, setShowTestForm] = useState(false)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

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
    setActionLoading(true)
    const res = await fetch('/api/scheduled-campaigns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: previewCampaign.id, scheduled_at: new Date(scheduleAt).toISOString() }),
    })
    setActionLoading(false)
    if (res.ok) {
      setShowScheduleForm(false)
      setToast({ msg: `Scheduled for ${new Date(scheduleAt).toLocaleString()}`, type: 'success' })
      setPreviewCampaign(null)
      load()
    } else {
      const d = await res.json()
      setToast({ msg: d.error || 'Scheduling failed', type: 'error' })
    }
  }

  async function sendNow() {
    if (!previewCampaign) return
    if (!confirm('Send this campaign now? This cannot be undone.')) return
    setActionLoading(true)
    setToast({ msg: 'Sending…', type: 'info' })
    const res = await fetch(`/api/campaigns/${previewCampaign.id}/send`, { method: 'POST' })
    const data = await res.json()
    setActionLoading(false)
    if (res.ok) {
      setToast({ msg: `Sent to ${data.sent} contacts!`, type: 'success' })
      setPreviewCampaign(null)
      load()
    } else {
      setToast({ msg: data.error || 'Send failed', type: 'error' })
    }
  }

  function openPreview(c: Campaign) {
    setPreviewCampaign(c)
    setShowTestForm(false)
    setShowScheduleForm(false)
    setTestEmail('')
    setScheduleAt('')
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
              <div className="cursor-pointer" onClick={() => openPreview(c)}>
                <TemplatePreviewThumbnail html={c.html_body} height={140} />
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openPreview(c)}>
                    <span className="font-semibold text-gray-900 hover:text-brand-600 truncate block">{c.name}</span>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{c.subject}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
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

      {/* ── Campaign Preview Modal ── */}
      {previewCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col" style={{ height: '90vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{previewCampaign.name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{previewCampaign.subject}</p>
                </div>
                <Badge variant={STATUS_COLORS[previewCampaign.status] || 'default'}>{previewCampaign.status}</Badge>
              </div>
              <button onClick={() => setPreviewCampaign(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Email preview */}
              <div className="flex-1 overflow-auto bg-gray-100 p-4">
                <iframe
                  srcDoc={previewCampaign.html_body || '<p style="font-family:sans-serif;color:#999;padding:40px;text-align:center">No preview available</p>'}
                  title="Campaign Preview"
                  className="w-full max-w-2xl mx-auto block border-0 bg-white shadow rounded"
                  style={{ minHeight: 500 }}
                  sandbox="allow-same-origin"
                />
              </div>

              {/* Action panel */}
              <div className="w-56 flex-shrink-0 border-l bg-gray-50 p-4 flex flex-col gap-3 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</p>

                {previewCampaign.status !== 'sent' && (
                  <Link href={`/campaigns/${previewCampaign.id}`}>
                    <Button variant="outline" size="sm" className="w-full"><Edit2 className="w-3.5 h-3.5" /> Edit Campaign</Button>
                  </Link>
                )}
                {previewCampaign.status === 'sent' && (
                  <Link href={`/campaigns/${previewCampaign.id}/report`}>
                    <Button variant="outline" size="sm" className="w-full"><BarChart2 className="w-3.5 h-3.5" /> View Report</Button>
                  </Link>
                )}

                {previewCampaign.status !== 'sent' && (<>
                  <hr className="border-gray-200" />

                  {/* Test send */}
                  {!showTestForm && !showScheduleForm && (
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => setShowTestForm(true)}>
                      <FlaskConical className="w-3.5 h-3.5" /> Send Test Email
                    </Button>
                  )}
                  {showTestForm && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-700">Test email address</p>
                      <Input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="your@email.com" autoFocus />
                      <Button size="sm" className="w-full" onClick={sendTest} loading={testSending}>
                        <FlaskConical className="w-3.5 h-3.5" /> Send Test
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowTestForm(false)}>Cancel</Button>
                    </div>
                  )}

                  {/* Schedule */}
                  {!showTestForm && !showScheduleForm && (
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => setShowScheduleForm(true)}>
                      <Calendar className="w-3.5 h-3.5" /> Schedule Send
                    </Button>
                  )}
                  {showScheduleForm && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-700">Send date & time</p>
                      <input
                        type="datetime-local"
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                        value={scheduleAt}
                        min={new Date().toISOString().slice(0, 16)}
                        onChange={e => setScheduleAt(e.target.value)}
                      />
                      <Button size="sm" className="w-full" onClick={scheduleCampaign} loading={actionLoading} disabled={!scheduleAt}>
                        <Calendar className="w-3.5 h-3.5" /> Confirm Schedule
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowScheduleForm(false)}>Cancel</Button>
                    </div>
                  )}

                  {/* Send now */}
                  {!showTestForm && !showScheduleForm && (
                    <Button size="sm" className="w-full" onClick={sendNow} loading={actionLoading}>
                      <Send className="w-3.5 h-3.5" /> Send Now
                    </Button>
                  )}
                </>)}

                <hr className="border-gray-200 mt-auto" />
                {previewCampaign.status === 'sent' && (
                  <div className="text-xs text-gray-500 space-y-1">
                    <p><span className="font-medium">{(previewCampaign.sent || 0).toLocaleString()}</span> sent</p>
                    <p><span className="font-medium">{formatPercent(previewCampaign.unique_opens || 0, previewCampaign.sent || 0)}</span> open rate</p>
                    <p><span className="font-medium">{formatPercent(previewCampaign.unique_clicks || 0, previewCampaign.sent || 0)}</span> click rate</p>
                  </div>
                )}
                <p className="text-xs text-gray-400">{formatDate(previewCampaign.sent_at || previewCampaign.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
