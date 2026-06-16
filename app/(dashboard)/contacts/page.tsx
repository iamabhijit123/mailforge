'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button, Input, Badge, Modal, Select, Toast } from '@/components/ui'
import { Plus, Upload, Search, Trash2, Eye, Download, X, ListPlus, Send, Mail, MousePointer, AlertCircle, MoreHorizontal } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Papa from 'papaparse'
import Link from 'next/link'

interface Contact { id: string; email: string; first_name: string | null; last_name: string | null; company: string | null; status: string; tags: string; created_at: string }
interface List { id: string; name: string }

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  subscribed: 'success', unsubscribed: 'warning', bounced: 'danger', spam: 'danger',
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')
  function add() {
    const val = input.trim().toLowerCase()
    if (val && !tags.includes(val)) onChange([...tags, val])
    setInput('')
  }
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
      <div className="flex flex-wrap gap-1 min-h-[40px] border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
        {tags.map(t => (
          <span key={t} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
            {t}<button type="button" onClick={() => onChange(tags.filter(x => x !== t))}><X className="w-3 h-3" /></button>
          </span>
        ))}
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
          onBlur={add} placeholder={tags.length === 0 ? 'Type tag, press Enter…' : ''}
          className="flex-1 min-w-[80px] outline-none text-sm bg-transparent" />
      </div>
      <p className="text-xs text-gray-400 mt-1">Press Enter or comma to add a tag</p>
    </div>
  )
}

// ─── Quick Preview Panel ──────────────────────────────────────────────────────
interface ActivityItem { campaign_id: string; campaign_name: string; event_type: string; occurred_at: string; link_url?: string }
interface Insights { emails_sent: number; open_rate: number; click_rate: number; bounces: number }
interface Note { id: string; body: string; created_at: string }

function EventIcon({ type }: { type: string }) {
  const base = 'w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center'
  if (type === 'open') return <div className={`${base} bg-blue-50 border border-blue-100`}><Mail className="w-3.5 h-3.5 text-blue-500" /></div>
  if (type === 'click') return <div className={`${base} bg-purple-50 border border-purple-100`}><MousePointer className="w-3.5 h-3.5 text-purple-500" /></div>
  if (type === 'bounce') return <div className={`${base} bg-red-50 border border-red-100`}><AlertCircle className="w-3.5 h-3.5 text-red-500" /></div>
  return <div className={`${base} bg-gray-50 border border-gray-200`}><Send className="w-3.5 h-3.5 text-gray-400" /></div>
}

const EVENT_LABELS: Record<string, string> = {
  sent: 'Email sent', open: 'Opened email', click: 'Clicked link',
  bounce: 'Email bounced', unsubscribe: 'Unsubscribed', spam: 'Marked as spam',
}

function ContactPreviewPanel({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [insights, setInsights] = useState<Insights | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [noteBody, setNoteBody] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/contacts/${contact.id}/activity`).then(r => r.json()),
      fetch(`/api/contacts/${contact.id}/notes`).then(r => r.json()),
    ]).then(([a, n]) => {
      setActivity((a.activity || []).slice(0, 4))
      setInsights(a.insights || null)
      setNotes(Array.isArray(n) ? n : [])
      setLoading(false)
    })
  }, [contact.id])

  async function saveNote() {
    if (!noteBody.trim()) return
    setSavingNote(true)
    const res = await fetch(`/api/contacts/${contact.id}/notes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: noteBody }),
    })
    setSavingNote(false)
    if (res.ok) { const n = await res.json(); setNotes(prev => [n, ...prev]); setNoteBody('') }
  }

  const initials = (() => {
    const parts = [contact.first_name, contact.last_name].filter(Boolean)
    if (parts.length) return parts.map(p => p![0].toUpperCase()).join('')
    return contact.email[0].toUpperCase()
  })()

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />
      {/* Panel */}
      <div className="relative ml-auto w-[360px] bg-white shadow-2xl flex flex-col h-full border-l border-gray-200 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {initials}
          </div>
          <p className="text-sm font-medium text-gray-800 truncate flex-1">{contact.email}</p>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Recent Activity */}
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Activity</p>
                {activity.length === 0 ? (
                  <p className="text-xs text-gray-400">No activity yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {activity.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <EventIcon type={item.event_type} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-gray-800">{EVENT_LABELS[item.event_type] || item.event_type}</span>
                            <span className="text-xs text-gray-400">{Math.round((Date.now() - new Date(item.occurred_at).getTime()) / 86400000)} days ago</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.event_type === 'open' ? 'Opened' : 'Received'}{' '}
                            <Link href={`/campaigns/${item.campaign_id}`} className="text-blue-600 hover:underline font-medium">{item.campaign_name}</Link> email
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Notes</p>
                <textarea
                  value={noteBody}
                  onChange={e => setNoteBody(e.target.value)}
                  rows={3}
                  placeholder="Add a note…"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none transition-all"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setNoteBody('')} className="flex-1 py-1.5 text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Discard</button>
                  <button onClick={saveNote} disabled={savingNote || !noteBody.trim()} className="flex-1 py-1.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors">
                    {savingNote ? 'Saving…' : 'Save'}
                  </button>
                </div>
                {notes.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {notes.slice(0, 2).map(n => (
                      <div key={n.id} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                        <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{formatDate(n.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Insights */}
              {insights && (
                <div className="px-5 py-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Insights (30 days)</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: 'Emails sent', value: insights.emails_sent.toLocaleString() },
                      { label: 'Email open rate', value: insights.emails_sent > 0 ? `${insights.open_rate}%` : '—' },
                      { label: 'Email click rate', value: insights.emails_sent > 0 ? `${insights.click_rate}%` : '—' },
                      { label: 'Emails bounced', value: insights.bounces > 0 ? `${insights.bounces}` : '—' },
                    ].map(s => (
                      <div key={s.label} className="border border-gray-200 rounded-xl p-3">
                        <p className="text-xs text-gray-500 mb-1 leading-tight">{s.label}</p>
                        <p className="text-lg font-bold text-gray-900">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-2 flex-shrink-0">
          <button className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <Link href={`/contacts/${contact.id}`} className="flex-1">
            <button className="w-full py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 text-sm font-bold rounded-xl transition-colors">
              View full details
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function ContactsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialListId = searchParams.get('list_id') || ''

  const [contacts, setContacts] = useState<Contact[]>([])
  const [lists, setLists] = useState<List[]>([])
  const [activeList, setActiveList] = useState<List | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [listFilter, setListFilter] = useState(initialListId)
  const [loading, setLoading] = useState(true)

  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showAddToList, setShowAddToList] = useState(false)
  const [addToListId, setAddToListId] = useState('')
  const [addingToList, setAddingToList] = useState(false)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectAllPages, setSelectAllPages] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [previewContact, setPreviewContact] = useState<Contact | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [addForm, setAddForm] = useState({ email: '', first_name: '', last_name: '', company: '', phone: '', list_ids: [] as string[], tags: [] as string[] })

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      ...(q && { q }),
      ...(statusFilter && { status: statusFilter }),
      ...(listFilter && { list_id: listFilter }),
    })
    try {
      const res = await fetch(`/api/contacts?${params}`)
      const data = await res.json()
      setContacts(data.contacts || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
    } catch { setContacts([]) }
    setSelected(new Set())
    setSelectAllPages(false)
    setLoading(false)
  }, [page, q, statusFilter, listFilter])

  useEffect(() => {
    fetch('/api/lists').then(r => r.json()).then(d => {
      const all: List[] = d.lists || d || []
      setLists(all)
      if (initialListId) setActiveList(all.find(l => l.id === initialListId) || null)
    }).catch(() => setLists([]))
  }, [])

  useEffect(() => {
    if (listFilter && lists.length > 0) {
      setActiveList(lists.find(l => l.id === listFilter) || null)
    } else if (!listFilter) {
      setActiveList(null)
    }
  }, [listFilter, lists])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setTimeout(() => { setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [q, statusFilter, listFilter])

  function clearListFilter() {
    setListFilter('')
    setPage(1)
    router.push('/contacts')
  }

  async function addContact() {
    const res = await fetch('/api/contacts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...addForm, tags: addForm.tags }),
    })
    if (res.ok) {
      setShowAdd(false)
      setAddForm({ email: '', first_name: '', last_name: '', company: '', phone: '', list_ids: [], tags: [] })
      load()
      setToast({ msg: 'Contact added', type: 'success' })
    } else {
      const d = await res.json()
      setToast({ msg: d.error || 'Failed', type: 'error' })
    }
  }

  async function deleteContact(id: string) {
    if (!confirm('Delete this contact?')) return
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    load()
    setToast({ msg: 'Contact deleted', type: 'success' })
  }

  async function deleteSelected() {
    const count = selectAllPages ? total : selected.size
    if (!confirm(`Delete ${count.toLocaleString()} contacts? This cannot be undone.`)) return
    if (selectAllPages) {
      setToast({ msg: 'Deleting all contacts…', type: 'info' })
      let pg = 1
      let done = 0
      while (true) {
        const params = new URLSearchParams({ page: String(pg), ...(q && { q }), ...(statusFilter && { status: statusFilter }), ...(listFilter && { list_id: listFilter }) })
        const res = await fetch(`/api/contacts?${params}`)
        const data = await res.json()
        if (!data.contacts?.length) break
        await Promise.all(data.contacts.map((c: Contact) => fetch(`/api/contacts/${c.id}`, { method: 'DELETE' })))
        done += data.contacts.length
        if (pg >= data.pages) break
        pg++
      }
      setToast({ msg: `${done} contacts deleted`, type: 'success' })
    } else {
      await Promise.all(Array.from(selected).map(id => fetch(`/api/contacts/${id}`, { method: 'DELETE' })))
      setToast({ msg: `${selected.size} contacts deleted`, type: 'success' })
    }
    setSelected(new Set())
    setSelectAllPages(false)
    load()
  }

  async function handleAddToList() {
    if (!addToListId) return
    setAddingToList(true)
    let contactIds = Array.from(selected)
    if (selectAllPages) {
      // Collect all contact IDs from all pages
      let pg = 1
      contactIds = []
      while (true) {
        const params = new URLSearchParams({ page: String(pg), ...(q && { q }), ...(statusFilter && { status: statusFilter }), ...(listFilter && { list_id: listFilter }) })
        const res = await fetch(`/api/contacts?${params}`)
        const data = await res.json()
        if (!data.contacts?.length) break
        contactIds.push(...data.contacts.map((c: Contact) => c.id))
        if (pg >= data.pages) break
        pg++
      }
    }
    const res = await fetch(`/api/lists/${addToListId}/contacts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_ids: contactIds }),
    })
    setAddingToList(false)
    setShowAddToList(false)
    setAddToListId('')
    if (res.ok) {
      const data = await res.json()
      const listName = lists.find(l => l.id === addToListId)?.name || 'list'
      setToast({ msg: `Added ${data.added || contactIds.length} contacts to "${listName}"`, type: 'success' })
    } else {
      setToast({ msg: 'Failed to add to list', type: 'error' })
    }
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (result) => {
        const rows = result.data as Record<string, string>[]
        const contacts = rows.map(r => ({
          email: r.email || r.Email || r.EMAIL || '',
          first_name: r.first_name || r['First Name'] || r.firstname || '',
          last_name: r.last_name || r['Last Name'] || r.lastname || '',
          company: r.company || r.Company || '',
          phone: r.phone || r.Phone || '',
        })).filter(c => c.email)
        const res = await fetch('/api/contacts/import', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts }),
        })
        const data = await res.json()
        setShowImport(false)
        load()
        setToast({ msg: `Imported ${data.imported}, updated ${data.updated}, skipped ${data.skipped}`, type: 'success' })
      },
    })
  }

  function exportCsv() {
    const csv = Papa.unparse(contacts.map(c => ({
      email: c.email, first_name: c.first_name || '', last_name: c.last_name || '',
      company: c.company || '', status: c.status,
      tags: (() => { try { return JSON.parse(c.tags || '[]').join(', ') } catch { return '' } })(),
    })))
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'contacts.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const allPageSelected = contacts.length > 0 && contacts.every(c => selected.has(c.id))
  const someSelected = selected.size > 0 || selectAllPages
  const selectedCount = selectAllPages ? total : selected.size

  function togglePageSelect() {
    if (allPageSelected) {
      setSelected(new Set())
      setSelectAllPages(false)
    } else {
      setSelected(new Set(contacts.map(c => c.id)))
    }
  }

  function toggleOne(id: string) {
    setSelectAllPages(false)
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {previewContact && <ContactPreviewPanel contact={previewContact} onClose={() => setPreviewContact(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString()} {activeList ? `contacts in "${activeList.name}"` : 'contacts total'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="w-3.5 h-3.5" /> Export</Button>
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}><Upload className="w-3.5 h-3.5" /> Import CSV</Button>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" /> Add Contact</Button>
        </div>
      </div>

      {/* Active list filter banner */}
      {activeList && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
          <span className="text-sm text-blue-800 font-medium">Viewing list: <strong>{activeList.name}</strong></span>
          <button onClick={clearListFilter} className="ml-auto flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg px-2.5 py-1 hover:bg-blue-100">
            <X className="w-3 h-3" /> Show all contacts
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-card px-4 py-3 flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-3 py-2 w-full border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" placeholder="Search contacts…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          options={[{ value: '', label: 'All statuses' }, { value: 'subscribed', label: 'Subscribed' }, { value: 'unsubscribed', label: 'Unsubscribed' }, { value: 'bounced', label: 'Bounced' }]}
          className="w-44" />
        <Select value={listFilter} onChange={e => { setListFilter(e.target.value); setPage(1) }}
          options={[{ value: '', label: 'All lists' }, ...lists.map(l => ({ value: l.id, label: l.name }))]}
          className="w-48" />
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 bg-blue-600 text-white rounded-xl px-4 py-3 flex-wrap shadow-sm">
          <span className="text-sm font-semibold">
            {selectAllPages ? `All ${total.toLocaleString()} contacts selected` : `${selectedCount} contact${selectedCount !== 1 ? 's' : ''} selected`}
          </span>
          {!selectAllPages && allPageSelected && total > contacts.length && (
            <button onClick={() => setSelectAllPages(true)} className="text-sm text-blue-100 hover:text-white underline">
              Select all {total.toLocaleString()} contacts →
            </button>
          )}
          <div className="ml-auto flex gap-2 flex-wrap">
            <button onClick={() => setShowAddToList(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-lg transition-colors">
              <ListPlus className="w-3.5 h-3.5" /> Add to List
            </button>
            <button onClick={deleteSelected} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete ({selectAllPages ? total.toLocaleString() : selected.size})
            </button>
            <button onClick={() => { setSelected(new Set()); setSelectAllPages(false) }} className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/20 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading…</div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">{activeList ? `No contacts in "${activeList.name}"` : 'No contacts found'}</p>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" /> Add contact</Button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox"
                    checked={allPageSelected}
                    ref={el => { if (el) el.indeterminate = selected.size > 0 && !allPageSelected && !selectAllPages }}
                    onChange={togglePageSelect}
                    className="rounded"
                    title={allPageSelected ? 'Deselect page' : `Select this page (${contacts.length})`}
                  />
                </th>
                {['Name / Email', 'Company', 'Tags', 'Status', 'Added', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map(c => {
                let parsedTags: string[] = []
                try { parsedTags = JSON.parse(c.tags || '[]') } catch { parsedTags = [] }
                const isChecked = selectAllPages || selected.has(c.id)
                return (
                  <tr key={c.id} className={`hover:bg-gray-50 ${isChecked ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-4 py-3"><input type="checkbox" checked={isChecked} onChange={() => toggleOne(c.id)} className="rounded" /></td>
                    <td className="px-4 py-3">
                      <Link href={`/contacts/${c.id}`} className="text-sm font-medium text-gray-900 hover:text-brand-600">
                        {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                      </Link>
                      <p className="text-xs text-gray-500">{c.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.company || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {parsedTags.slice(0, 3).map(t => <span key={t} className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">{t}</span>)}
                        {parsedTags.length > 3 && <span className="text-xs text-gray-400">+{parsedTags.length - 3}</span>}
                        {parsedTags.length === 0 && <span className="text-xs text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant={STATUS_COLORS[c.status] || 'default'}>{c.status}</Badge></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setPreviewContact(c)} className="p-1 text-gray-400 hover:text-brand-600 rounded"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => deleteContact(c.id)} className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {pages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">Page {page} of {pages} · {total.toLocaleString()} contacts</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Add to List modal */}
      <Modal open={showAddToList} onClose={() => setShowAddToList(false)} title="Add to List" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Adding <strong>{selectAllPages ? total.toLocaleString() : selected.size}</strong> contact{(selectAllPages ? total : selected.size) !== 1 ? 's' : ''} to a list.
          </p>
          <div className="space-y-2">
            {lists.length === 0 ? (
              <p className="text-sm text-gray-400">No lists yet. <Link href="/lists" className="text-blue-600 underline">Create a list first.</Link></p>
            ) : lists.map(l => (
              <label key={l.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${addToListId === l.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="list" value={l.id} checked={addToListId === l.id} onChange={() => setAddToListId(l.id)} className="text-blue-600" />
                <span className="text-sm font-medium text-gray-900">{l.name}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Button className="flex-1" onClick={handleAddToList} disabled={!addToListId} loading={addingToList}>
              <ListPlus className="w-3.5 h-3.5" /> Add to List
            </Button>
            <Button variant="secondary" onClick={() => setShowAddToList(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Add Contact modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Contact" size="sm">
        <div className="space-y-4">
          <Input label="Email *" type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={addForm.first_name} onChange={e => setAddForm(f => ({ ...f, first_name: e.target.value }))} />
            <Input label="Last Name" value={addForm.last_name} onChange={e => setAddForm(f => ({ ...f, last_name: e.target.value }))} />
          </div>
          <Input label="Company" value={addForm.company} onChange={e => setAddForm(f => ({ ...f, company: e.target.value }))} />
          <Input label="Phone" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} />
          <TagInput tags={addForm.tags} onChange={tags => setAddForm(f => ({ ...f, tags }))} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Add to Lists</label>
            {lists.length === 0 ? (
              <p className="text-xs text-gray-400 border border-gray-200 rounded-xl p-2.5">No lists yet. <Link href="/lists" className="text-blue-600 hover:underline">Create a list first.</Link></p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-gray-50">
                {lists.map(l => (
                  <label key={l.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white px-2 py-1 rounded-lg transition-colors">
                    <input type="checkbox" checked={addForm.list_ids.includes(l.id)} onChange={e => setAddForm(f => ({ ...f, list_ids: e.target.checked ? [...f.list_ids, l.id] : f.list_ids.filter(id => id !== l.id) }))} className="rounded" />
                    {l.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={addContact} disabled={!addForm.email}>Add Contact</Button>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Import modal */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title="Import Contacts from CSV" size="sm">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            Your CSV should have columns: <code>email</code>, <code>first_name</code>, <code>last_name</code>, <code>company</code>, <code>phone</code>
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} />
          <Button className="w-full" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" /> Choose CSV File</Button>
          <Button variant="secondary" className="w-full" onClick={() => setShowImport(false)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  )
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-400">Loading…</div>}>
      <ContactsPageInner />
    </Suspense>
  )
}
