'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Toast } from '@/components/ui'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { DEFAULT_BLOCKS } from '@/lib/email-html'

interface List { id: string; name: string }
interface Settings { sender_name?: string; sender_email?: string; reply_to?: string }

export default function CreateCampaignPage() {
  const router = useRouter()
  const [lists, setLists] = useState<List[]>([])
  const [form, setForm] = useState({ name: '', subject: '', preview_text: '', from_name: '', from_email: '', reply_to: '', list_ids: [] as string[] })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'error' } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/lists').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ]).then(([ls, s]: [List[], Settings]) => {
      setLists(ls)
      setForm(f => ({ ...f, from_name: s.sender_name || '', from_email: s.sender_email || '', reply_to: s.reply_to || '' }))
    })
  }, [])

  async function create() {
    if (!form.name || !form.subject) { setToast({ msg: 'Name and subject are required', type: 'error' }); return }
    setLoading(true)
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, blocks: DEFAULT_BLOCKS }),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/campaigns/${data.id}`)
    } else {
      const d = await res.json()
      setToast({ msg: d.error || 'Failed to create', type: 'error' })
      setLoading(false)
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const toggleList = (id: string) => setForm(f => ({ ...f, list_ids: f.list_ids.includes(id) ? f.list_ids.filter(x => x !== id) : [...f.list_ids, id] }))

  return (
    <div className="max-w-2xl space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center gap-3">
        <Link href="/campaigns/new" className="text-gray-400 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">One-time Campaign</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 space-y-5">
        <Input label="Campaign Name *" value={form.name} onChange={set('name')} placeholder="e.g., July Newsletter" autoFocus />
        <Input label="Email Subject *" value={form.subject} onChange={set('subject')} placeholder="e.g., Exciting news inside..." />
        <Input label="Preview Text" value={form.preview_text} onChange={set('preview_text')} placeholder="Short summary shown in inbox preview…" />

        <div className="border-t pt-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">From</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="From Name" value={form.from_name} onChange={set('from_name')} placeholder="Your Name or Company" />
            <Input label="From Email" type="email" value={form.from_email} onChange={set('from_email')} placeholder="you@yourdomain.com" />
          </div>
          <Input label="Reply-To Email" type="email" value={form.reply_to} onChange={set('reply_to')} placeholder="Same as From Email" />
        </div>

        {lists.length > 0 && (
          <div className="border-t pt-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Send To (optional — you can select later)</h3>
            <div className="grid grid-cols-2 gap-2">
              {lists.map(l => (
                <label key={l.id} className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 text-sm transition-colors">
                  <input type="checkbox" checked={form.list_ids.includes(l.id)} onChange={() => toggleList(l.id)} className="rounded" />
                  {l.name}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button onClick={create} loading={loading}>Create & Design Campaign</Button>
        <Link href="/campaigns/new"><Button variant="secondary">Back</Button></Link>
      </div>
    </div>
  )
}
