'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Toast } from '@/components/ui'
import {
  ChevronRight, ChevronLeft, Check, RotateCcw, Users, Calendar,
  Clock, FolderOpen, Send, AlertCircle, ArrowRight, X, Settings, CheckCircle, FileText, Eye,
} from 'lucide-react'
import Link from 'next/link'
import { TIMEZONE_OPTIONS, tzLabel, todayInTz, currentTimeInTz, normalizeTimezone } from '@/lib/timezones'
import { generateWeekdaySchedule, type Frequency } from '@/lib/schedule-utils'

interface List { id: string; name: string; contact_count: number }
interface AccountSettings { sender_name?: string; sender_email?: string; reply_to?: string; timezone?: string; company_address?: string }
interface Template { id: string; name: string; subject?: string; updated_at: string; html_body?: string }

function NoListsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-amber-500" />
        </div>

        <h2 className="text-lg font-bold text-gray-900 text-center mb-2">You need a contact list first</h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Recurring campaigns require at least one contact list with subscribers. Set that up first, then come back to create your schedule.
        </p>

        <div className="space-y-2.5">
          <Link href="/lists" className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <ArrowRight className="w-4 h-4" /> Create a Contact List
          </Link>
          <Link href="/contacts" className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold rounded-xl transition-colors">
            <Users className="w-4 h-4" /> Add Contacts
          </Link>
          <button onClick={onClose} className="w-full px-4 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyListsBanner({ lists }: { lists: List[] }) {
  const allEmpty = lists.every(l => (l.contact_count || 0) === 0)
  if (!allEmpty) return null
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex gap-3 items-start">
      <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-blue-900 mb-0.5">Your lists have no contacts yet</p>
        <p className="text-xs text-blue-700 mb-2">The campaign will have nobody to send to. Add contacts to a list first.</p>
        <Link href="/contacts" className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline">
          <ArrowRight className="w-3 h-3" /> Go add contacts →
        </Link>
      </div>
    </div>
  )
}
interface FolderItem { id: string; name: string; color: string; template_count: number }

const STEPS = [
  { n: 1, label: 'Basics' },
  { n: 2, label: 'Frequency' },
  { n: 3, label: 'Schedule' },
  { n: 4, label: 'Template & Review' },
]

const FREQ_OPTIONS = [
  { value: 'daily', label: 'Daily', desc: 'Send every day' },
  { value: 'weekly', label: 'Weekly', desc: 'Send once a week' },
  { value: 'biweekly', label: 'Bi-weekly', desc: 'Send every two weeks' },
  { value: 'monthly', label: 'Monthly', desc: 'Send once a month' },
]


function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all ${
            s.n < current ? 'bg-blue-600 text-white' : s.n === current ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-100 text-gray-400'
          }`}>
            {s.n < current ? <Check className="w-4 h-4" /> : s.n}
          </div>
          <span className={`ml-2 text-sm font-medium ${s.n === current ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
          {i < STEPS.length - 1 && <div className={`w-12 h-0.5 mx-3 ${s.n < current ? 'bg-blue-600' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  )
}

function IncompleteSettingsModal({ missing, onClose }: { missing: string[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 text-center mb-2">Complete your account setup first</h2>
        <p className="text-sm text-gray-500 text-center mb-5">Fill in these settings before creating campaigns.</p>
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

export default function NewRecurringCampaignPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [lists, setLists] = useState<List[]>([])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [accountSettings, setAccountSettings] = useState<AccountSettings>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showNoListsModal, setShowNoListsModal] = useState(false)
  const [incompleteModal, setIncompleteModal] = useState<string[] | null>(null)
  const [showFromEdit, setShowFromEdit] = useState(false)
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null)
  const [removedDates, setRemovedDates] = useState<Set<string>>(new Set())

  const [form, setForm] = useState({
    name: '', subject: '', from_name: '', from_email: '', reply_to: '', cc_emails: '',
    list_ids: [] as string[],
    frequency: 'weekly', start_date: '', end_date: '',
    timezone: normalizeTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'),
    send_time: '09:00',
    template_folder_id: '',
    template_ids: [] as string[],
    template_mode: 'folder' as 'folder' | 'single',
    allow_weekends: false,
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/lists').then(r => r.json()),
      fetch('/api/template-folders').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/templates').then(r => r.json()),
    ]).then(([ls, flds, s, tmpl]: [List[], FolderItem[], AccountSettings, Template[]]) => {
      const listsData = Array.isArray(ls) ? ls : []
      setLists(listsData)
      setFolders(Array.isArray(flds) ? flds : [])
      setTemplates(Array.isArray(tmpl) ? tmpl : [])
      setAccountSettings(s)
      if (listsData.length === 0) setShowNoListsModal(true)
      // Pre-fill from settings
      setForm(f => ({
        ...f,
        from_name: s.sender_name || f.from_name,
        from_email: s.sender_email || f.from_email,
        reply_to: s.reply_to || f.reply_to,
        timezone: normalizeTimezone(s.timezone || f.timezone),
      }))
      // Check incomplete settings
      const missing: string[] = []
      if (!s.sender_email) missing.push('Sender email address (Account details → Email settings)')
      if (!s.sender_name) missing.push('Sender name (Account details → Email settings)')
      if (!s.company_address) missing.push('Company address (Account details → Business details) — required by CAN-SPAM')
      if (missing.length > 0) setIncompleteModal(missing)
    })
  }, [])

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  }
  function toggleList(id: string) {
    setForm(f => ({ ...f, list_ids: f.list_ids.includes(id) ? f.list_ids.filter(x => x !== id) : [...f.list_ids, id] }))
  }
  function toggleTemplate(id: string) {
    setForm(f => ({ ...f, template_ids: f.template_ids.includes(id) ? f.template_ids.filter(x => x !== id) : [...f.template_ids, id] }))
  }

  const scheduledSends = useMemo(() => {
    if (!form.start_date) return []
    const endDate = form.end_date || (() => {
      const d = new Date(form.start_date + 'T12:00:00Z')
      d.setUTCFullYear(d.getUTCFullYear() + 1)
      return d.toISOString().slice(0, 10)
    })()
    return generateWeekdaySchedule(form.start_date, endDate, form.frequency as Frequency, form.send_time, form.timezone, form.allow_weekends)
  }, [form.start_date, form.end_date, form.frequency, form.send_time, form.timezone, form.allow_weekends])

  function canNext() {
    if (step === 1) return form.name.trim() && form.subject.trim() && form.from_email.trim() && form.list_ids.length > 0
    if (step === 2) return form.frequency && form.start_date
    if (step === 3) return form.timezone && form.send_time
    if (step === 4) return form.template_mode === 'folder' ? !!form.template_folder_id : form.template_ids.length > 0
    return true
  }

  async function submit() {
    setSaving(true)
    try {
      const ccArray = form.cc_emails ? form.cc_emails.split(',').map(e => e.trim()).filter(Boolean) : []
      const res = await fetch('/api/recurring-campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          subject: form.subject,
          from_name: form.from_name,
          from_email: form.from_email,
          reply_to: form.reply_to || null,
          cc_emails: ccArray,
          list_ids: form.list_ids,
          frequency: form.frequency,
          start_date: form.start_date,
          end_date: form.end_date || null,
          timezone: form.timezone,
          send_time: form.send_time,
          template_folder_id: form.template_mode === 'folder' ? form.template_folder_id : null,
          template_ids: form.template_mode === 'single' ? form.template_ids : null,
          allow_weekends: form.allow_weekends,
          sends: scheduledSends.filter(s => !removedDates.has(s.date)),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setToast({ msg: data.error || 'Failed to create', type: 'error' }); setSaving(false); return }
      router.push(`/recurring-campaigns/${data.id}`)
    } catch {
      setToast({ msg: 'Something went wrong', type: 'error' }); setSaving(false)
    }
  }

  const hasDefaultSender = !!(accountSettings.sender_email && accountSettings.sender_name)

  return (
    <div className="max-w-2xl mx-auto">
      {showNoListsModal && <NoListsModal onClose={() => setShowNoListsModal(false)} />}
      {incompleteModal && <IncompleteSettingsModal missing={incompleteModal} onClose={() => setIncompleteModal(null)} />}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center gap-3 mb-6">
        <Link href="/recurring-campaigns" className="text-gray-400 hover:text-gray-700">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">New Recurring Campaign</h1>
          <p className="text-sm text-gray-500">Set up an automated campaign that sends on a schedule.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-8">
        <StepIndicator current={step} />

        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2"><RotateCcw className="w-4 h-4 text-blue-600" /> Campaign Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Campaign Name *</label>
                <input value={form.name} onChange={set('name')} placeholder="e.g., Weekly Newsletter" autoFocus
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Subject *</label>
                <input value={form.subject} onChange={set('subject')} placeholder="e.g., This week's updates from {{company}}"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              {/* From section — collapsible if settings filled */}
              <div className="col-span-2">
                {hasDefaultSender && !showFromEdit ? (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-0.5">From (account defaults)</p>
                        <p className="text-sm text-gray-800 font-medium">{form.from_name} &lt;{form.from_email}&gt;</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setShowFromEdit(true)} className="text-xs font-medium text-blue-600 hover:text-blue-800 ml-4">Edit</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">From Name *</label>
                      <input value={form.from_name} onChange={set('from_name')} placeholder="Your Name"
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">From Email *</label>
                      <input type="email" value={form.from_email} onChange={set('from_email')} placeholder="you@yourcompany.com"
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Reply-To (optional)</label>
                      <input type="email" value={form.reply_to} onChange={set('reply_to')} placeholder="replies@yourcompany.com"
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                    </div>
                    {hasDefaultSender && (
                      <div className="flex items-end">
                        <button type="button" onClick={() => setShowFromEdit(false)} className="text-xs text-gray-400 hover:text-gray-600 pb-2.5">Use defaults</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">CC (optional, comma-separated)</label>
                <input value={form.cc_emails} onChange={set('cc_emails')} placeholder="cc@example.com"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
            </div>
            <div className="space-y-3">
              {lists.length > 0 && <EmptyListsBanner lists={lists} />}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Send to Lists *</label>
                {lists.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">
                    No lists yet.{' '}
                    <button onClick={() => setShowNoListsModal(true)} className="text-blue-600 hover:underline font-semibold">Create one first →</button>
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-2">
                    {lists.map(l => (
                      <label key={l.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${form.list_ids.includes(l.id) ? 'bg-blue-50 border-blue-200' : 'border-transparent hover:bg-gray-50'}`}>
                        <input type="checkbox" checked={form.list_ids.includes(l.id)} onChange={() => toggleList(l.id)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                        <span className="flex-1 text-sm font-medium text-gray-900">{l.name}</span>
                        <span className="text-xs text-gray-400">{(l.contact_count || 0).toLocaleString()} contacts</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Frequency */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2"><RotateCcw className="w-4 h-4 text-blue-600" /> Frequency & Duration</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">How often should this campaign send?</label>
              <div className="grid grid-cols-2 gap-3">
                {FREQ_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm(f => ({ ...f, frequency: opt.value }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${form.frequency === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <p className="font-semibold text-sm text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Start Date *</label>
                <input type="date" value={form.start_date} onChange={set('start_date')} min={new Date().toISOString().slice(0, 10)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> End Date (optional)</label>
                <input type="date" value={form.end_date} onChange={set('end_date')} min={form.start_date}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                <p className="text-xs text-gray-400 mt-1">Leave blank for ongoing</p>
              </div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 flex flex-col gap-3">
              <div className="text-sm text-blue-700 flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  {form.allow_weekends
                    ? 'Sends will be generated on all days including weekends.'
                    : 'Sends that fall on a weekend are automatically moved to the next weekday.'}
                </span>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.allow_weekends}
                  onChange={e => setForm(f => ({ ...f, allow_weekends: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm font-medium text-blue-900">Also send on weekends</span>
              </label>
            </div>
          </div>
        )}

        {/* Step 3: Schedule */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-blue-600" /> Timezone & Send Time</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
              <select value={form.timezone} onChange={set('timezone')}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                {TIMEZONE_OPTIONS.map(tz => <option key={tz.iana} value={tz.iana}>{tz.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Send Time</label>
              <input type="time" value={form.send_time} onChange={set('send_time')}
                min={form.start_date === todayInTz(form.timezone) ? currentTimeInTz(form.timezone) : undefined}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              <p className="text-xs text-gray-400 mt-1">
                Emails will be sent at this time in the selected timezone.
                {form.start_date === todayInTz(form.timezone) && (
                  <span className="text-amber-500 ml-1">Times before {currentTimeInTz(form.timezone)} are in the past today.</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Template & Review */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2"><FolderOpen className="w-4 h-4 text-blue-600" /> Template & Review</h2>

            {/* Mode toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                onClick={() => setForm(f => ({ ...f, template_mode: 'folder', template_ids: [] }))}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${form.template_mode === 'folder' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <FolderOpen className="w-4 h-4" /> Template Folder
              </button>
              <button
                onClick={() => setForm(f => ({ ...f, template_mode: 'single', template_folder_id: '', template_ids: [] }))}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${form.template_mode === 'single' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <FileText className="w-4 h-4" /> Select Templates
              </button>
            </div>

            {/* Folder mode */}
            {form.template_mode === 'folder' && (
              <div>
                <p className="text-xs text-gray-500 mb-3">Each send will use the next template from this folder in rotation.</p>
                {folders.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                    <FolderOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-2">No template folders yet.</p>
                    <Link href="/templates/groups/new" target="_blank" className="text-sm text-blue-600 hover:underline">Create a folder in Templates →</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {folders.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setForm(prev => ({ ...prev, template_folder_id: f.id }))}
                        className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${form.template_folder_id === f.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: f.color }} />
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{f.name}</p>
                          <p className="text-xs text-gray-500">{f.template_count} template{f.template_count !== 1 ? 's' : ''}</p>
                        </div>
                        {form.template_folder_id === f.id && <Check className="w-4 h-4 text-blue-600 ml-auto" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Select templates mode (multi-select with preview) */}
            {form.template_mode === 'single' && (
              <div>
                <p className="text-xs text-gray-500 mb-3">
                  Select one or more templates — they rotate in order on each send.
                  {form.template_ids.length > 0 && <span className="ml-1 font-semibold text-blue-600">{form.template_ids.length} selected</span>}
                </p>
                {templates.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                    <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-2">No templates yet.</p>
                    <Link href="/templates" target="_blank" className="text-sm text-blue-600 hover:underline">Create a template →</Link>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    {/* Template list */}
                    <div className="flex-1 space-y-2 max-h-64 overflow-y-auto pr-1">
                      {templates.map(t => {
                        const selected = form.template_ids.includes(t.id)
                        const isPreviewing = previewTemplateId === t.id
                        return (
                          <div
                            key={t.id}
                            onClick={() => toggleTemplate(t.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                              {selected && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-gray-900 truncate">{t.name}</p>
                              {t.subject && <p className="text-xs text-gray-500 truncate">{t.subject}</p>}
                            </div>
                            <button
                              onClick={e => { e.stopPropagation(); setPreviewTemplateId(isPreviewing ? null : t.id) }}
                              title="Preview template"
                              className={`p-1.5 rounded-lg flex-shrink-0 transition-all ${isPreviewing ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    {/* Preview panel */}
                    {previewTemplateId && (() => {
                      const pt = templates.find(t => t.id === previewTemplateId)
                      return (
                        <div className="w-52 flex-shrink-0 border border-gray-200 rounded-xl overflow-hidden flex flex-col">
                          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-1">
                            <p className="text-xs font-semibold text-gray-700 truncate">{pt?.name}</p>
                            <button onClick={() => setPreviewTemplateId(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="relative overflow-hidden bg-white" style={{ height: 176 }}>
                            <iframe
                              key={previewTemplateId}
                              srcDoc={pt?.html_body || '<div style="padding:20px;color:#9ca3af;font-family:sans-serif;font-size:13px;">No preview</div>'}
                              style={{ width: 800, height: 680, transform: 'scale(0.26)', transformOrigin: 'top left', pointerEvents: 'none', border: 'none' }}
                              sandbox="allow-same-origin"
                            />
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Schedule preview — shown once template is chosen */}
            {(form.template_folder_id || form.template_ids.length > 0) && scheduledSends.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Send Schedule
                    <span className="text-xs font-normal text-gray-500 ml-1">
                      ({scheduledSends.filter(s => !removedDates.has(s.date)).length} of {scheduledSends.length} sends)
                    </span>
                  </p>
                  {removedDates.size > 0 && (
                    <button onClick={() => setRemovedDates(new Set())} className="text-xs text-blue-600 hover:underline">
                      Restore all
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {scheduledSends.map(send => {
                    const removed = removedDates.has(send.date)
                    const d = new Date(send.date + 'T12:00:00Z')
                    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                    return (
                      <div key={send.date} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${removed ? 'opacity-40 bg-red-50 line-through' : 'bg-white border border-gray-100'}`}>
                        <span className="font-medium text-gray-900">{label} · {send.time}</span>
                        <button
                          onClick={() => setRemovedDates(prev => { const n = new Set(prev); removed ? n.delete(send.date) : n.add(send.date); return n })}
                          className={`ml-2 flex-shrink-0 transition-colors ${removed ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 hover:text-red-500'}`}
                          title={removed ? 'Restore' : 'Remove this date'}
                        >
                          {removed ? <span className="text-sm">↩</span> : <X className="w-3 h-3" />}
                        </button>
                      </div>
                    )
                  })}
                </div>
                {removedDates.size === 0 && (
                  <p className="text-xs text-gray-400 mt-2">Click × to remove any specific date from the schedule.</p>
                )}
              </div>
            )}

            {/* Review summary */}
            {(form.template_folder_id || form.template_ids.length > 0) && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <p className="font-semibold text-gray-900 mb-3">Campaign Summary</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <span className="text-gray-400">Name</span><span className="font-medium text-gray-900">{form.name}</span>
                  <span className="text-gray-400">Subject</span><span className="font-medium text-gray-900">{form.subject}</span>
                  <span className="text-gray-400">From</span><span className="font-medium text-gray-900">{form.from_name} &lt;{form.from_email}&gt;</span>
                  <span className="text-gray-400">Frequency</span><span className="font-medium text-gray-900 capitalize">{form.frequency}</span>
                  <span className="text-gray-400">Start</span><span className="font-medium text-gray-900">{form.start_date}</span>
                  <span className="text-gray-400">End</span><span className="font-medium text-gray-900">{form.end_date || 'Ongoing'}</span>
                  <span className="text-gray-400">Send time</span><span className="font-medium text-gray-900">{form.send_time} ({tzLabel(form.timezone)})</span>
                  <span className="text-gray-400">Lists</span><span className="font-medium text-gray-900">{form.list_ids.length} selected</span>
                  <span className="text-gray-400">Template</span>
                  <span className="font-medium text-gray-900">
                    {form.template_mode === 'folder'
                      ? `Folder: ${folders.find(f => f.id === form.template_folder_id)?.name}`
                      : form.template_ids.length === 1
                        ? templates.find(t => t.id === form.template_ids[0])?.name
                        : `${templates.find(t => t.id === form.template_ids[0])?.name} + ${form.template_ids.length - 1} more (rotating)`}
                  </span>
                  <span className="text-gray-400">Weekends</span><span className="font-medium text-gray-900">{form.allow_weekends ? 'Included' : 'Skipped (weekday only)'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step < 4 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl transition-colors"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!canNext() || saving}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl transition-colors"
            >
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
              {saving ? 'Creating…' : 'Create Campaign'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

