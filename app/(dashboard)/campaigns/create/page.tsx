'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Toast } from '@/components/ui'
import { ArrowLeft, ChevronDown, AlertCircle, Settings, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { DEFAULT_BLOCKS } from '@/lib/email-html'

interface List { id: string; name: string }
interface Settings { sender_name?: string; sender_email?: string; reply_to?: string; company_address?: string }

function IncompleteSettingsModal({ missing, onClose }: { missing: string[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 text-center mb-2">Complete your account setup first</h2>
        <p className="text-sm text-gray-500 text-center mb-5">
          Before sending campaigns, fill in your account settings so recipients know who the email is from.
        </p>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-5 space-y-2">
          {missing.map(m => (
            <div key={m} className="flex items-center gap-2 text-sm text-red-700">
              <span className="w-4 h-4 rounded-full border-2 border-red-300 flex-shrink-0" />
              {m}
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <Link href="/settings" className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <Settings className="w-4 h-4" /> Go to Settings
          </Link>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CreateCampaignPage() {
  const router = useRouter()
  const [lists, setLists] = useState<List[]>([])
  const [settings, setSettings] = useState<Settings>({})
  const [form, setForm] = useState({ name: '', subject: '', preview_text: '', from_name: '', from_email: '', reply_to: '', list_ids: [] as string[] })
  const [loading, setLoading] = useState(false)
  const [showFromEdit, setShowFromEdit] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'error' } | null>(null)
  const [incompleteModal, setIncompleteModal] = useState<string[] | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/lists').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ]).then(([ls, s]: [List[], Settings]) => {
      setLists(ls)
      setSettings(s)
      setForm(f => ({
        ...f,
        from_name: s.sender_name || '',
        from_email: s.sender_email || '',
        reply_to: s.reply_to || '',
      }))

      // Check for missing required settings
      const missing: string[] = []
      if (!s.sender_email) missing.push('Sender email address (Account details → Email settings)')
      if (!s.sender_name) missing.push('Sender name (Account details → Email settings)')
      if (!s.company_address) missing.push('Company address (Account details → Business details) — required by CAN-SPAM')
      if (missing.length > 0) setIncompleteModal(missing)
    })
  }, [])

  async function create() {
    if (!form.name || !form.subject) { setToast({ msg: 'Campaign name and subject are required', type: 'error' }); return }
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

  const hasDefaultSender = !!(settings.sender_email && settings.sender_name)

  return (
    <div className="max-w-2xl space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {incompleteModal && <IncompleteSettingsModal missing={incompleteModal} onClose={() => setIncompleteModal(null)} />}

      <div className="flex items-center gap-3">
        <Link href="/campaigns/new" className="text-gray-400 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">One-time Campaign</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 space-y-5">
        <Input label="Campaign Name *" value={form.name} onChange={set('name')} placeholder="e.g., July Newsletter" autoFocus />
        <Input label="Email Subject *" value={form.subject} onChange={set('subject')} placeholder="e.g., Exciting news inside..." />
        <Input label="Preview Text" value={form.preview_text} onChange={set('preview_text')} placeholder="Short summary shown in inbox preview…" />

        {/* From section — collapsed if settings filled */}
        <div className="border-t pt-4">
          {hasDefaultSender && !showFromEdit ? (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-0.5">From (using account defaults)</p>
                  <p className="text-sm text-gray-800 font-medium">{form.from_name} &lt;{form.from_email}&gt;</p>
                  {form.reply_to && <p className="text-xs text-gray-500 mt-0.5">Reply-To: {form.reply_to}</p>}
                </div>
              </div>
              <button onClick={() => setShowFromEdit(true)} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 ml-4">
                Edit <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">From</h3>
                {hasDefaultSender && (
                  <button onClick={() => setShowFromEdit(false)} className="text-xs text-gray-400 hover:text-gray-600">Use defaults</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="From Name" value={form.from_name} onChange={set('from_name')} placeholder="Your Name or Company" />
                <Input label="From Email" type="email" value={form.from_email} onChange={set('from_email')} placeholder="you@yourdomain.com" />
              </div>
              <Input label="Reply-To Email" type="email" value={form.reply_to} onChange={set('reply_to')} placeholder="Same as From Email" />
            </div>
          )}
        </div>

        {lists.length > 0 && (
          <div className="border-t pt-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Send To <span className="font-normal text-gray-400">(optional — you can select later)</span></h3>
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
