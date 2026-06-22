'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Input, Badge, Modal, Toast, ScheduleDateTimePicker } from '@/components/ui'
import { ArrowLeft, Send, FlaskConical, Save, ChevronDown, Calendar } from 'lucide-react'
import Link from 'next/link'
import { EmailBuilder } from '@/components/email-builder/EmailBuilder'
import { EmailBlock } from '@/lib/email-html'
import { parseJsonSafe as parse } from '@/lib/utils'

interface Campaign {
  id: string; name: string; subject: string; preview_text: string | null
  from_name: string; from_email: string; reply_to: string | null; cc_emails: string | null
  list_ids: string; blocks: string; html_body: string | null; status: string
}
interface List { id: string; name: string; contact_count: number }

export default function CampaignEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [lists, setLists] = useState<List[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [blocks, setBlocks] = useState<EmailBlock[]>([])
  const [htmlBody, setHtmlBody] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [showTest, setShowTest] = useState(false)
  const [showSend, setShowSend] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [form, setForm] = useState({ name: '', subject: '', preview_text: '', from_name: '', from_email: '', reply_to: '', cc_emails: '', list_ids: [] as string[] })

  useEffect(() => {
    Promise.all([
      fetch(`/api/campaigns/${id}`).then(r => r.json()),
      fetch('/api/lists').then(r => r.json()),
    ]).then(([c, ls]) => {
      setCampaign(c)
      setLists(ls)
      const parsedBlocks = parse<EmailBlock[]>(c.blocks, [])
      setBlocks(Array.isArray(parsedBlocks) ? parsedBlocks : [])
      setHtmlBody(c.html_body || '')
      setForm({
        name: c.name, subject: c.subject, preview_text: c.preview_text || '',
        from_name: c.from_name, from_email: c.from_email, reply_to: c.reply_to || '',
        cc_emails: (parse<string[]>(c.cc_emails, [])).join(', '),
        list_ids: parse<string[]>(c.list_ids, []),
      })
      setLoading(false)
    })
  }, [id])

  const handleBuilderChange = useCallback((newBlocks: EmailBlock[], html: string) => {
    setBlocks(newBlocks)
    setHtmlBody(html)
  }, [])

  async function save() {
    setSaving(true)
    const ccArray = form.cc_emails ? form.cc_emails.split(',').map(e => e.trim()).filter(Boolean) : []
    await fetch(`/api/campaigns/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, cc_emails: ccArray, blocks, html_body: htmlBody }),
    })
    setSaving(false)
    setToast({ msg: 'Saved', type: 'success' })
  }

  async function sendTest() {
    if (!testEmail) return
    const res = await fetch(`/api/campaigns/${id}/test`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_email: testEmail }),
    })
    if (res.ok) { setShowTest(false); setToast({ msg: `Test email sent to ${testEmail}`, type: 'success' }) }
    else { const d = await res.json(); setToast({ msg: d.error || 'Failed to send', type: 'error' }) }
  }

  async function sendCampaign() {
    setShowSend(false)
    setToast({ msg: 'Sending…', type: 'info' })
    const res = await fetch(`/api/campaigns/${id}/send`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setToast({ msg: `Campaign sent to ${data.sent} contacts!`, type: 'success' })
      setTimeout(() => router.push(`/campaigns/${id}/report`), 2000)
    } else {
      setToast({ msg: data.error || 'Send failed', type: 'error' })
    }
  }

  async function scheduleCampaign() {
    if (!scheduleAt) return
    await save()
    const res = await fetch('/api/scheduled-campaigns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: id, scheduled_at: scheduleAt }),
    })
    if (res.ok) {
      setShowSchedule(false)
      setToast({ msg: `Campaign scheduled for ${new Date(scheduleAt).toLocaleString()}`, type: 'success' })
      setScheduleAt('')
    } else {
      const d = await res.json()
      setToast({ msg: d.error || 'Scheduling failed', type: 'error' })
    }
  }

  const toggleList = (lid: string) => setForm(f => ({ ...f, list_ids: f.list_ids.includes(lid) ? f.list_ids.filter(x => x !== lid) : [...f.list_ids, lid] }))
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
  if (!campaign) return <div className="text-center mt-20 text-gray-500">Campaign not found</div>

  const isSent = campaign.status === 'sent'

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/campaigns" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">{form.name}</h1>
            <p className="text-xs text-gray-500">{form.subject}</p>
          </div>
          <Badge variant={isSent ? 'success' : 'default'}>{campaign.status}</Badge>
        </div>

        <div className="flex items-center gap-2">
          {!isSent && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setShowTest(true)}><FlaskConical className="w-3.5 h-3.5" /> Test</Button>
              <Button variant="outline" size="sm" onClick={save} loading={saving}><Save className="w-3.5 h-3.5" /> Save</Button>
              <Button variant="outline" size="sm" onClick={() => setShowSchedule(true)}><Calendar className="w-3.5 h-3.5" /> Schedule</Button>
              <Button size="sm" onClick={() => setShowSend(true)}><Send className="w-3.5 h-3.5" /> Send Now</Button>
            </>
          )}
          {isSent && <Link href={`/campaigns/${id}/report`}><Button variant="secondary" size="sm"><ChevronDown className="w-3.5 h-3.5" /> View Report</Button></Link>}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto p-4 space-y-4">
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaign Details</h2>
            <Input label="Campaign Name" value={form.name} onChange={set('name')} disabled={isSent} />
            <Input label="Subject Line" value={form.subject} onChange={set('subject')} disabled={isSent} />
            <Input label="Preview Text" value={form.preview_text} onChange={set('preview_text')} disabled={isSent} />
          </div>

          <div className="space-y-3 border-t pt-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">From</h2>
            <Input label="From Name" value={form.from_name} onChange={set('from_name')} disabled={isSent} />
            <Input label="From Email" type="email" value={form.from_email} onChange={set('from_email')} disabled={isSent} />
            <Input label="Reply-To" type="email" value={form.reply_to} onChange={set('reply_to')} disabled={isSent} />
            <Input label="CC (optional, comma-separated)" value={form.cc_emails} onChange={set('cc_emails')} disabled={isSent} placeholder="cc1@example.com, cc2@example.com" />
          </div>

          <div className="space-y-2 border-t pt-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Send To</h2>
            {lists.length === 0 ? (
              <p className="text-xs text-gray-400">No lists. <Link href="/lists" className="text-brand-600 hover:underline">Create a list first.</Link></p>
            ) : (
              <div className="space-y-1">
                {lists.map(l => (
                  <label key={l.id} className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer ${form.list_ids.includes(l.id) ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'} ${isSent ? 'opacity-50 cursor-default' : ''}`}>
                    <input type="checkbox" checked={form.list_ids.includes(l.id)} onChange={() => !isSent && toggleList(l.id)} className="rounded" />
                    <div>
                      <div className="font-medium">{l.name}</div>
                      <div className="text-gray-400">{(l.contact_count || 0).toLocaleString()} contacts</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <EmailBuilder key={id} blocks={blocks} initialHtml={campaign.html_body || ''} onChange={handleBuilderChange} />
        </div>
      </div>

      <Modal open={showTest} onClose={() => setShowTest(false)} title="Send Test Email" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Send a test version of this campaign to preview how it looks.</p>
          <Input label="Send to email" type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="your@email.com" autoFocus />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={sendTest}><FlaskConical className="w-3.5 h-3.5" /> Send Test</Button>
            <Button variant="secondary" onClick={() => setShowTest(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showSchedule} onClose={() => setShowSchedule(false)} title="Schedule Campaign" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Choose a date, time, and timezone to automatically send this campaign.</p>
          <ScheduleDateTimePicker label="Send Date & Time" onChange={setScheduleAt} />
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Lists:</strong> {form.list_ids.length === 0 ? 'None selected' : lists.filter(l => form.list_ids.includes(l.id)).map(l => l.name).join(', ')}</p>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={scheduleCampaign} disabled={!scheduleAt}><Calendar className="w-3.5 h-3.5" /> Schedule</Button>
            <Button variant="secondary" onClick={() => setShowSchedule(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showSend} onClose={() => setShowSend(false)} title="Send Campaign" size="sm">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            <strong>Ready to send?</strong> This will send your campaign to all subscribed contacts in the selected lists. This cannot be undone.
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Subject:</strong> {form.subject}</p>
            <p><strong>From:</strong> {form.from_name} &lt;{form.from_email}&gt;</p>
            <p><strong>Lists:</strong> {form.list_ids.length === 0 ? 'None selected' : lists.filter(l => form.list_ids.includes(l.id)).map(l => l.name).join(', ')}</p>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={sendCampaign}><Send className="w-3.5 h-3.5" /> Send Now</Button>
            <Button variant="secondary" onClick={() => setShowSend(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
