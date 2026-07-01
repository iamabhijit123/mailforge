'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { X, ChevronDown, ChevronUp, Calendar, Send, FlaskConical, Edit2 } from 'lucide-react'
import { ScheduleDateTimePicker } from '@/components/ui'

export interface CampaignForModal {
  id: string
  name: string
  subject: string
  status: string
  html_body: string | null
  from_name: string
  from_email: string
  reply_to: string | null
}

export interface ListForModal {
  id: string
  name: string
  contact_count: number
}

function AccSection({ title, open, onToggle, complete, children }: {
  title: string; open: boolean; onToggle: () => void; complete?: boolean; children: React.ReactNode
}) {
  return (
    <div className="border-b border-gray-100">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/80 transition-colors text-left">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-gray-900">{title}</span>
          {complete && (
            <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

export function ScheduleCampaignModal({
  campaign, lists, onClose, onSchedule, onSendNow, actionLoading,
}: {
  campaign: CampaignForModal
  lists: ListForModal[]
  onClose: () => void
  onSchedule: (scheduleAt: string, listIds: string[], autoResendHours: number) => Promise<void>
  onSendNow: (listIds: string[]) => Promise<void>
  actionLoading: boolean
}) {
  const [openSection, setOpenSection] = useState('time_audience')
  const [sendMode, setSendMode] = useState<'now' | 'later'>('later')
  const [scheduleAt, setScheduleAt] = useState('')
  const [listIds, setListIds] = useState<string[]>([])
  const [autoResend, setAutoResend] = useState(false)
  const [autoResendDays, setAutoResendDays] = useState(3)
  const [testEmail, setTestEmail] = useState('')
  const [testSending, setTestSending] = useState(false)
  const [testMsg, setTestMsg] = useState<{ text: string; ok: boolean } | null>(null)

  function toggleList(id: string) {
    setListIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }
  const recipientCount = listIds.reduce((s, lid) => s + (lists.find(l => l.id === lid)?.contact_count || 0), 0)
  const timeAudienceComplete = listIds.length > 0 && (sendMode === 'now' || !!scheduleAt)
  const canSubmit = listIds.length > 0 && (sendMode === 'now' || !!scheduleAt) && !actionLoading

  async function sendTest() {
    if (!testEmail) return
    setTestSending(true); setTestMsg(null)
    const res = await fetch(`/api/campaigns/${campaign.id}/test`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_email: testEmail }),
    })
    const d = await res.json()
    setTestSending(false)
    setTestMsg({ text: res.ok ? `Test sent to ${testEmail}` : (d.error || 'Failed'), ok: res.ok })
  }

  function toggle(s: string) { setOpenSection(o => o === s ? '' : s) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col" style={{ height: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="font-bold text-gray-900 text-base truncate">{campaign.name}</h2>
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-gray-800 text-white flex-shrink-0">Draft</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 flex-shrink-0">✉ Email</span>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors ml-4 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: Accordion */}
          <div className="w-[400px] flex-shrink-0 border-r border-gray-100 overflow-y-auto">

            {/* 1 — Send test */}
            <AccSection title="Send test" open={openSection === 'send_test'} onToggle={() => toggle('send_test')}>
              <div className="space-y-3 pt-1">
                <p className="text-xs text-gray-500">Send a preview to your own inbox before scheduling.</p>
                <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="your@email.com"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50 focus:bg-white" />
                <button onClick={sendTest} disabled={testSending || !testEmail}
                  className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                  {testSending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                  {testSending ? 'Sending…' : 'Send Test Email'}
                </button>
                {testMsg && <p className={`text-xs font-medium ${testMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{testMsg.text}</p>}
              </div>
            </AccSection>

            {/* 2 — Time and audience */}
            <AccSection title="Time and audience" open={openSection === 'time_audience'} onToggle={() => toggle('time_audience')} complete={timeAudienceComplete}>
              <div className="space-y-5 pt-1">

                {/* Send mode */}
                <div className="space-y-1">
                  {(['now', 'later'] as const).map(m => (
                    <label key={m} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer border transition-colors ${sendMode === m ? 'border-blue-300 bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}>
                      <input type="radio" checked={sendMode === m} onChange={() => setSendMode(m)} className="w-4 h-4 text-blue-600 border-gray-300" />
                      <span className="text-sm font-medium text-gray-900">{m === 'now' ? 'Send now' : 'Schedule for later'}</span>
                    </label>
                  ))}
                </div>

                {/* Date + time picker */}
                {sendMode === 'later' && (
                  <div>
                    <ScheduleDateTimePicker label="Date & time" onChange={setScheduleAt} />
                  </div>
                )}

                {/* Audience */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-900">Audience</p>
                  {lists.length === 0
                    ? <p className="text-xs text-gray-400">No lists. <Link href="/lists" className="text-blue-600 underline">Create one</Link></p>
                    : (
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {lists.map(l => (
                          <label key={l.id} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer border transition-colors ${listIds.includes(l.id) ? 'bg-blue-50 border-blue-200' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/80'}`}>
                            <input type="checkbox" checked={listIds.includes(l.id)} onChange={() => toggleList(l.id)} className="w-4 h-4 rounded border-gray-300 text-blue-600 flex-shrink-0" />
                            <span className="flex-1 text-sm font-medium text-gray-900">{l.name}</span>
                            <span className="text-xs text-gray-400 flex-shrink-0">{(l.contact_count || 0).toLocaleString()}</span>
                          </label>
                        ))}
                      </div>
                    )
                  }
                  <p className={`text-xs font-semibold pt-0.5 ${listIds.length > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
                    {listIds.length} list{listIds.length !== 1 ? 's' : ''} selected | {recipientCount.toLocaleString()} unique recipients
                  </p>
                </div>

                {/* Automatic resends */}
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Automatic resends</p>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" checked={autoResend} onChange={e => setAutoResend(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Resend to non-openers</span>
                      <p className="text-xs text-gray-400 mt-0.5">Send again to contacts who don&apos;t open the first email</p>
                    </div>
                  </label>
                  {autoResend && (
                    <div className="pl-7 space-y-1.5">
                      <select value={autoResendDays} onChange={e => setAutoResendDays(Number(e.target.value))}
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                        <option value={1}>Resend 1 day after initial send</option>
                        <option value={2}>Resend 2 days after initial send</option>
                        <option value={3}>Resend 3 days after initial send</option>
                        <option value={5}>Resend 5 days after initial send</option>
                        <option value={7}>Resend 1 week after initial send</option>
                      </select>
                      <p className="text-[11px] text-gray-400">Opens are synced from Postmark before resending</p>
                    </div>
                  )}
                </div>

              </div>
            </AccSection>

            {/* 3 — Sender details */}
            <AccSection title="Sender details" open={openSection === 'sender'} onToggle={() => toggle('sender')} complete>
              <div className="space-y-3 pt-1">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Subject line</p>
                  <p className="text-sm text-gray-900 bg-gray-50 rounded-xl px-3.5 py-2.5 border border-gray-200 leading-snug">{campaign.subject || '—'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">From name</p>
                    <p className="text-sm text-gray-900 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 truncate">{campaign.from_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">From email</p>
                    <p className="text-sm text-gray-900 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 truncate">{campaign.from_email || '—'}</p>
                  </div>
                </div>
                <Link href={`/campaigns/${campaign.id}`} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline">
                  <Edit2 className="w-3 h-3" /> Edit campaign details
                </Link>
              </div>
            </AccSection>

          </div>

          {/* Right: Email preview */}
          <div className="flex-1 overflow-auto bg-[#F0F2F5] p-6">
            <iframe
              srcDoc={campaign.html_body || '<div style="font-family:sans-serif;color:#999;padding:60px;text-align:center;font-size:14px">No preview available</div>'}
              title="Campaign Preview"
              className="w-full max-w-[640px] mx-auto block border-0 bg-white shadow-lg rounded-xl"
              style={{ minHeight: 500 }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/60">
          <div className="text-xs text-gray-400">
            {canSubmit && sendMode === 'later' && scheduleAt
              ? `Will send ${new Date(scheduleAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}${autoResend ? ` · auto-resend in ${autoResendDays}d` : ''}`
              : canSubmit && sendMode === 'now' ? 'Sends immediately after clicking' : ''}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
              Save as draft
            </button>
            <button
              disabled={!canSubmit}
              onClick={() => sendMode === 'now' ? onSendNow(listIds) : onSchedule(scheduleAt, listIds, autoResend ? autoResendDays * 24 : 0)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 shadow-sm">
              {actionLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : sendMode === 'now' ? <Send className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
              {sendMode === 'now' ? 'Send Now' : 'Schedule'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
