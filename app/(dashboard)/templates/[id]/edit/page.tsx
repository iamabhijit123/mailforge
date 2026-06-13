'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button, Input, Modal, Toast } from '@/components/ui'
import { ArrowLeft, Save, FlaskConical } from 'lucide-react'
import Link from 'next/link'
import { EmailBuilder } from '@/components/email-builder/EmailBuilder'
import { EmailBlock } from '@/lib/email-html'
import { parseJsonSafe } from '@/lib/utils'

interface Template { id: string; name: string; subject: string | null; blocks: string; html_body: string | null }

export default function EditTemplatePage() {
  const { id } = useParams<{ id: string }>()
  const [template, setTemplate] = useState<Template | null>(null)
  const [blocks, setBlocks] = useState<EmailBlock[]>([])
  const [htmlBody, setHtmlBody] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [showTest, setShowTest] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testSending, setTestSending] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetch(`/api/templates/${id}`).then(r => r.json()).then(t => {
      setTemplate(t)
      setName(t.name)
      setBlocks(parseJsonSafe<EmailBlock[]>(t.blocks, []))
      setHtmlBody(t.html_body || '')
    })
  }, [id])

  const handleChange = useCallback((newBlocks: EmailBlock[], html: string) => {
    setBlocks(newBlocks)
    setHtmlBody(html)
  }, [])

  async function sendTest() {
    if (!testEmail) return
    setTestSending(true)
    const res = await fetch(`/api/templates/${id}/test`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_email: testEmail }),
    })
    setTestSending(false)
    const data = await res.json()
    if (res.ok) { setShowTest(false); setToast({ msg: `Test sent to ${testEmail}`, type: 'success' }) }
    else setToast({ msg: data.error || 'Failed to send test', type: 'error' })
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/templates/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, blocks, html_body: htmlBody }),
    })
    setSaving(false)
    if (res.ok) setToast({ msg: 'Template saved', type: 'success' })
    else setToast({ msg: 'Failed to save', type: 'error' })
  }

  if (!template) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Link href="/templates" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-4 h-4" /></Link>
          <Input value={name} onChange={e => setName(e.target.value)} className="w-64 border-transparent hover:border-gray-300 focus:border-brand-400" />
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowTest(true)}><FlaskConical className="w-3.5 h-3.5" /> Test</Button>
        <Button size="sm" onClick={save} loading={saving}><Save className="w-3.5 h-3.5" /> Save Template</Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <EmailBuilder key={id} blocks={blocks} initialHtml={template.html_body || ''} onChange={handleChange} />
      </div>

      <Modal open={showTest} onClose={() => setShowTest(false)} title="Send Test Email" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Send a test of this template to preview how it looks in an inbox.</p>
          <Input label="Send to" type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="your@email.com" autoFocus />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={sendTest} loading={testSending}><FlaskConical className="w-3.5 h-3.5" /> Send Test</Button>
            <Button variant="secondary" onClick={() => setShowTest(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
