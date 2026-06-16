'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { Toast } from '@/components/ui'
import { ArrowLeft, Send, Mail, MousePointer, AlertCircle, Save, Plus, Trash2, X } from 'lucide-react'

interface Contact {
  id: string; email: string; first_name: string | null; last_name: string | null
  company: string | null; phone: string | null; status: string; tags: string
  created_at: string; updated_at: string | null
  lists?: Array<{ id: string; name: string }>
}
interface ActivityItem { campaign_id: string; campaign_name: string; event_type: string; occurred_at: string; link_url?: string }
interface Insights { emails_sent: number; open_rate: number; click_rate: number; bounces: number }
interface Note { id: string; body: string; created_at: string }
interface List { id: string; name: string }
type Tab = 'details' | 'activity' | 'notes'

const STATUS_OPTS = ['subscribed', 'unsubscribed', 'bounced', 'spam']
const STATUS_COLORS: Record<string, string> = {
  subscribed: 'bg-green-100 text-green-700', unsubscribed: 'bg-yellow-100 text-yellow-700',
  bounced: 'bg-red-100 text-red-700', spam: 'bg-red-100 text-red-700',
}

function initials(c: Contact) {
  const parts = [c.first_name, c.last_name].filter(Boolean)
  if (parts.length) return parts.map(p => p![0].toUpperCase()).join('')
  return c.email[0].toUpperCase()
}

function EventIcon({ type }: { type: string }) {
  const base = 'w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center'
  if (type === 'open') return <div className={`${base} bg-blue-50 border border-blue-100`}><Mail className="w-4 h-4 text-blue-500" /></div>
  if (type === 'click') return <div className={`${base} bg-purple-50 border border-purple-100`}><MousePointer className="w-4 h-4 text-purple-500" /></div>
  if (type === 'bounce') return <div className={`${base} bg-red-50 border border-red-100`}><AlertCircle className="w-4 h-4 text-red-500" /></div>
  return <div className={`${base} bg-gray-50 border border-gray-200`}><Send className="w-4 h-4 text-gray-400" /></div>
}

const EVENT_LABELS: Record<string, string> = {
  sent: 'Email sent', open: 'Opened email', click: 'Clicked link',
  bounce: 'Email bounced', unsubscribe: 'Unsubscribed', spam: 'Marked as spam',
}

function groupByMonth(items: ActivityItem[]) {
  const groups: Array<{ label: string; items: ActivityItem[] }> = []
  for (const item of items) {
    const label = new Date(item.occurred_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const last = groups[groups.length - 1]
    if (last?.label === label) last.items.push(item)
    else groups.push({ label, items: [item] })
  }
  return groups
}

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [contact, setContact] = useState<Contact | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [insights, setInsights] = useState<Insights | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [allLists, setAllLists] = useState<List[]>([])
  const [tab, setTab] = useState<Tab>('details')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const [form, setForm] = useState({ first_name: '', last_name: '', company: '', phone: '', status: 'subscribed' })
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [dirty, setDirty] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showAddList, setShowAddList] = useState(false)
  const [addListId, setAddListId] = useState('')

  async function loadAll() {
    setLoading(true)
    const [cRes, aRes, nRes, lRes] = await Promise.all([
      fetch(`/api/contacts/${id}`),
      fetch(`/api/contacts/${id}/activity`),
      fetch(`/api/contacts/${id}/notes`),
      fetch('/api/lists'),
    ])
    const c = await cRes.json()
    const a = await aRes.json()
    const n = await nRes.json()
    const l = await lRes.json()
    setContact(c)
    setForm({ first_name: c.first_name || '', last_name: c.last_name || '', company: c.company || '', phone: c.phone || '', status: c.status })
    try { setTags(JSON.parse(c.tags || '[]')) } catch { setTags([]) }
    setActivity(a.activity || [])
    setInsights(a.insights || null)
    setNotes(Array.isArray(n) ? n : [])
    setAllLists(Array.isArray(l) ? l : (l.lists || []))
    setLoading(false); setDirty(false)
  }

  useEffect(() => { loadAll() }, [id])

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/contacts/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tags }),
    })
    setSaving(false)
    if (res.ok) { setDirty(false); setToast({ msg: 'Contact saved', type: 'success' }); loadAll() }
    else setToast({ msg: 'Save failed', type: 'error' })
  }

  async function addNote() {
    if (!newNote.trim()) return
    setSavingNote(true)
    const res = await fetch(`/api/contacts/${id}/notes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: newNote }),
    })
    setSavingNote(false)
    if (res.ok) { const n = await res.json(); setNotes(prev => [n, ...prev]); setNewNote('') }
  }

  async function deleteNote(noteId: string) {
    await fetch(`/api/contacts/${id}/notes/${noteId}`, { method: 'DELETE' })
    setNotes(prev => prev.filter(n => n.id !== noteId))
  }

  async function addToList() {
    if (!addListId || !contact) return
    const currentIds = (contact.lists || []).map(l => l.id)
    await fetch(`/api/contacts/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list_ids: [...currentIds, addListId] }),
    })
    setShowAddList(false); setAddListId(''); loadAll()
  }

  async function removeFromList(listId: string) {
    if (!contact) return
    const newIds = (contact.lists || []).filter(l => l.id !== listId).map(l => l.id)
    await fetch(`/api/contacts/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list_ids: newIds }),
    })
    loadAll()
  }

  function addTag() {
    const v = tagInput.trim().toLowerCase()
    if (v && !tags.includes(v)) { setTags(t => [...t, v]); setDirty(true) }
    setTagInput('')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!contact) return (
    <div className="text-center py-20">
      <p className="text-gray-500 mb-2">Contact not found.</p>
      <Link href="/contacts" className="text-blue-600 hover:underline text-sm">← Back to contacts</Link>
    </div>
  )

  const memberLists = contact.lists || []
  const nonMemberLists = allLists.filter(l => !memberLists.some(m => m.id === l.id))
  const grouped = groupByMonth(activity)

  const InsightsPanel = () => insights ? (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-3">Insights (30 days)</h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Emails sent', value: insights.emails_sent.toLocaleString() },
          { label: 'Email open rate', value: insights.emails_sent > 0 ? `${insights.open_rate}%` : '—' },
          { label: 'Email click rate', value: insights.emails_sent > 0 ? `${insights.click_rate}%` : '—' },
          { label: 'Emails bounced', value: insights.bounces > 0 ? `${insights.bounces}` : '—' },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1 leading-tight">{s.label}</p>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  ) : null

  return (
    <div className="space-y-5 max-w-[1100px]">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/contacts" className="hover:text-gray-800 transition-colors">Contacts</Link>
        {memberLists[0] && <>
          <span>/</span>
          <Link href={`/contacts?list_id=${memberLists[0].id}`} className="hover:text-gray-800">{memberLists[0].name}</Link>
        </>}
        <span>/</span>
        <span className="text-gray-900 font-medium truncate max-w-[200px]">{contact.email}</span>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {initials(contact)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900 truncate">{contact.email}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[contact.status] || 'bg-gray-100 text-gray-600'}`}>
                  {contact.status === 'subscribed' ? 'Email subscribed' : contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Added by you on {new Date(contact.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {contact.updated_at && contact.updated_at !== contact.created_at && ` · Last edit ${new Date(contact.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {dirty && (
              <button onClick={save} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60">
                {saving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save changes
              </button>
            )}
            <Link href="/contacts">
              <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-100 mt-5 -mb-5">
          {(['details', 'activity', 'notes'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-all capitalize ${tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {t}{t === 'notes' && notes.length > 0 ? ` (${notes.length})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* ── DETAILS TAB ── */}
      {tab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            {/* Basic details */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-card">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900">Basic details</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">First name</label>
                    <input value={form.first_name} onChange={e => { setForm(f => ({ ...f, first_name: e.target.value })); setDirty(true) }} placeholder="First name"
                      className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Last name</label>
                    <input value={form.last_name} onChange={e => { setForm(f => ({ ...f, last_name: e.target.value })); setDirty(true) }} placeholder="Last name"
                      className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Company</label>
                  <input value={form.company} onChange={e => { setForm(f => ({ ...f, company: e.target.value })); setDirty(true) }} placeholder="Company name"
                    className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
                </div>
              </div>
            </div>

            {/* Campaign channels */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-card">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900">Campaign channels</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <div className="px-3.5 py-2.5 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl truncate">{contact.email}</div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Email status</label>
                    <select value={form.status} onChange={e => { setForm(f => ({ ...f, status: e.target.value })); setDirty(true) }}
                      className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                      {STATUS_OPTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input value={form.phone} onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setDirty(true) }} placeholder="+1 (000) 000-0000"
                    className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
                </div>
              </div>
            </div>

            {dirty && (
              <div className="flex gap-2">
                <button onClick={save} disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60">
                  {saving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save changes
                </button>
                <button onClick={() => { setForm({ first_name: contact!.first_name || '', last_name: contact!.last_name || '', company: contact!.company || '', phone: contact!.phone || '', status: contact!.status }); try { setTags(JSON.parse(contact!.tags || '[]')) } catch { setTags([]) } setDirty(false) }}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Discard</button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <InsightsPanel />

            {/* List membership */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900">List membership</h3>
                <button onClick={() => setShowAddList(v => !v)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold">
                  <Plus className="w-3.5 h-3.5" /> Add to list
                </button>
              </div>
              {memberLists.length === 0 && <p className="text-xs text-gray-400">Not a member of any list.</p>}
              <div className="space-y-1.5">
                {memberLists.map(l => (
                  <div key={l.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 group">
                    <Link href={`/contacts?list_id=${l.id}`} className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">{l.name}</Link>
                    <button onClick={() => removeFromList(l.id)} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {showAddList && nonMemberLists.length > 0 && (
                <div className="mt-3 border-t border-gray-100 pt-3 space-y-1.5">
                  {nonMemberLists.map(l => (
                    <label key={l.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-colors ${addListId === l.id ? 'border-blue-400 bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}>
                      <input type="radio" name="addList" value={l.id} checked={addListId === l.id} onChange={() => setAddListId(l.id)} className="text-blue-600" />
                      <span className="text-sm text-gray-800">{l.name}</span>
                    </label>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button onClick={addToList} disabled={!addListId}
                      className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors">Add</button>
                    <button onClick={() => { setShowAddList(false); setAddListId('') }}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
                  </div>
                </div>
              )}
              {showAddList && nonMemberLists.length === 0 && (
                <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">Already a member of all lists.</p>
              )}
            </div>

            {/* Tags */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-1.5 min-h-[36px] border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
                {tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    {t}
                    <button onClick={() => { setTags(prev => prev.filter(x => x !== t)); setDirty(true) }}><X className="w-3 h-3" /></button>
                  </span>
                ))}
                <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
                  onBlur={addTag} placeholder={tags.length === 0 ? 'Add a tag…' : ''}
                  className="flex-1 min-w-[80px] outline-none text-sm bg-transparent" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTIVITY TAB ── */}
      {tab === 'activity' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-card p-6">
            <h2 className="text-base font-bold text-gray-900 mb-5">Recent Activity</h2>
            {activity.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 font-medium">No activity yet</p>
                <p className="text-xs text-gray-400 mt-1">Appears after this contact receives emails.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {grouped.map(group => (
                  <div key={group.label}>
                    <h3 className="text-sm font-bold text-gray-600 mb-3">{group.label}</h3>
                    <div className="space-y-2">
                      {group.items.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                          <EventIcon type={item.event_type} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-gray-900">{EVENT_LABELS[item.event_type] || item.event_type}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(item.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                {' | '}{new Date(item.occurred_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {item.event_type === 'open' ? 'Opened' : item.event_type === 'click' ? 'Clicked in' : item.event_type === 'bounce' ? 'Bounced from' : 'Received'}{' '}
                              <Link href={`/campaigns/${item.campaign_id}`} className="text-blue-600 hover:underline font-medium">{item.campaign_name}</Link>
                              {' email'}
                            </p>
                            {item.link_url && <p className="text-xs text-blue-500 mt-0.5 truncate">{item.link_url}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div><InsightsPanel /></div>
        </div>
      )}

      {/* ── NOTES TAB ── */}
      {tab === 'notes' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 max-w-2xl">
          <h2 className="text-base font-bold text-gray-900 mb-4">Notes</h2>
          <div className="space-y-2 mb-6">
            <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={3} placeholder="Add a note…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none transition-all" />
            <div className="flex gap-2">
              <button onClick={addNote} disabled={savingNote || !newNote.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
                {savingNote ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setNewNote('')} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Discard</button>
            </div>
          </div>
          {notes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No notes yet. Add one above.</p>
          ) : (
            <div className="space-y-3">
              {notes.map(n => (
                <div key={n.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 group">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{n.body}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-400">{formatDate(n.created_at)}</p>
                    <button onClick={() => deleteNote(n.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
