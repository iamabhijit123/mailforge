'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import { Button, Badge, Modal, Toast } from '@/components/ui'
import {
  Search, AlignJustify, MoreHorizontal, ChevronLeft, ChevronRight,
  Mail, UserMinus, UserPlus, X
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface List { id: string; name: string; description: string | null; contact_count: number; subscribed_count: number; created_at: string }
interface Contact { id: string; email: string; first_name: string | null; last_name: string | null; company: string | null; status: string; created_at: string }

function AddContactsModal({ listId, onClose, onAdded }: { listId: string; onClose: () => void; onAdded: () => void }) {
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/contacts?limit=500').then(r => r.json()).then(d => setAllContacts(Array.isArray(d.contacts) ? d.contacts : []))
  }, [])

  const filtered = allContacts.filter(c =>
    !q ||
    c.email.toLowerCase().includes(q.toLowerCase()) ||
    (c.first_name || '').toLowerCase().includes(q.toLowerCase()) ||
    (c.last_name || '').toLowerCase().includes(q.toLowerCase())
  )

  function toggle(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function addToList() {
    if (!selected.size) return
    setSaving(true)
    await fetch(`/api/lists/${listId}/contacts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_ids: Array.from(selected) }),
    })
    setSaving(false)
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '80vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-900">Add Contacts to List</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {allContacts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500 mb-3">No contacts yet.</p>
              <Link href="/contacts" onClick={onClose} className="text-sm text-blue-600 hover:underline font-semibold">Go to Contacts page to add some →</Link>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No contacts match your search.</p>
          ) : (
            <div className="space-y-1">
              {filtered.map(c => (
                <label key={c.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${selected.has(c.id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{c.email}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <span className="text-sm text-gray-500">{selected.size} selected</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
            <button
              onClick={addToList}
              disabled={!selected.size || saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5"
            >
              {saving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              Add {selected.size > 0 ? selected.size : ''} to list
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  subscribed: 'success', unsubscribed: 'warning', bounced: 'danger', spam: 'danger',
}

function ListMoreMenu({ list, onEdit, onDelete }: { list: List; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="p-2 text-gray-500 hover:text-gray-800 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-dropdown border border-gray-200 py-1 z-30">
          <button onClick={() => { onEdit(); setOpen(false) }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Edit list name</button>
          <div className="my-1 border-t border-gray-100" />
          <button onClick={() => { onDelete(); setOpen(false) }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete list</button>
        </div>
      )}
    </div>
  )
}

export default function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [list, setList] = useState<List | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '' })
  const [showEdit, setShowEdit] = useState(false)
  const [showAddContacts, setShowAddContacts] = useState(false)
  const [removing, setRemoving] = useState(false)

  async function loadList() {
    const res = await fetch(`/api/lists/${id}`)
    if (!res.ok) { router.push('/lists'); return }
    const data = await res.json()
    setList(data)
    setEditForm({ name: data.name, description: data.description || '' })
  }

  const loadContacts = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams({ page: String(page), ...(q && { q }), ...(statusFilter && { status: statusFilter }) })
    const res = await fetch(`/api/lists/${id}/contacts?${p}`)
    const data = await res.json()
    setContacts(data.contacts || [])
    setTotal(data.total || 0)
    setPages(data.pages || 1)
    setSelected(new Set())
    setLoading(false)
  }, [id, page, q, statusFilter])

  useEffect(() => { loadList() }, [id])
  useEffect(() => { loadContacts() }, [loadContacts])
  useEffect(() => {
    const t = setTimeout(() => setPage(1), 350)
    return () => clearTimeout(t)
  }, [q, statusFilter])

  async function saveEdit() {
    if (!editForm.name.trim()) return
    await fetch(`/api/lists/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) })
    setShowEdit(false)
    loadList()
    setToast({ msg: 'List updated', type: 'success' })
  }

  async function deleteList() {
    if (!confirm('Delete this list? Contacts will not be deleted.')) return
    await fetch(`/api/lists/${id}`, { method: 'DELETE' })
    router.push('/lists')
  }

  async function removeSelected() {
    if (!selected.size) return
    if (!confirm(`Remove ${selected.size} contact${selected.size !== 1 ? 's' : ''} from this list?`)) return
    setRemoving(true)
    await fetch(`/api/lists/${id}/contacts`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_ids: Array.from(selected) }),
    })
    setRemoving(false)
    setToast({ msg: `${selected.size} contacts removed from list`, type: 'success' })
    loadList()
    loadContacts()
  }

  const allSelected = contacts.length > 0 && contacts.every(c => selected.has(c.id))
  function toggleAll() { allSelected ? setSelected(new Set()) : setSelected(new Set(contacts.map(c => c.id))) }
  function toggleOne(cid: string) { setSelected(s => { const n = new Set(s); n.has(cid) ? n.delete(cid) : n.add(cid); return n }) }

  if (!list) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {showAddContacts && (
        <AddContactsModal
          listId={id}
          onClose={() => setShowAddContacts(false)}
          onAdded={() => { loadList(); loadContacts(); }}
        />
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/lists" className="hover:text-blue-600 transition-colors">Lists</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">List view</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-300 bg-white text-xs font-semibold text-gray-600">
              <AlignJustify className="w-3 h-3" /> List
            </span>
            <h1 className="text-xl font-bold text-gray-900">{list.name}</h1>
          </div>
          <p className="text-sm text-gray-500">Date created {formatDate(list.created_at)}</p>
          {list.description && <p className="text-sm text-gray-500 mt-0.5">{list.description}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowAddContacts(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add Contacts
          </button>
          <Link href="/campaigns">
            <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
              <Mail className="w-3.5 h-3.5" /> Send an email
            </button>
          </Link>
          <ListMoreMenu list={list} onEdit={() => setShowEdit(true)} onDelete={deleteList} />
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            All list contacts
            <span className="inline-flex items-center justify-center min-w-[22px] h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold px-1.5">{total.toLocaleString()}</span>
          </div>

          {selected.size > 0 && (
            <button
              onClick={removeSelected}
              disabled={removing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              <UserMinus className="w-3.5 h-3.5" />
              Remove {selected.size} from list
            </button>
          )}

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-gray-400" />
                <input
                  className="pl-9 pr-3 py-1.5 text-sm bg-transparent focus:outline-none w-52"
                  placeholder="Search by name or email"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                />
              </div>
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            >
              <option value="">All statuses</option>
              <option value="subscribed">Subscribed</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="bounced">Bounced</option>
              <option value="spam">Spam</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading…</div>
        ) : contacts.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-gray-900 font-semibold mb-1">No contacts found</p>
            <p className="text-sm text-gray-400 mb-5">
              {q || statusFilter ? 'Try adjusting your search or filters.' : 'Add contacts to this list to start sending emails.'}
            </p>
            {!q && !statusFilter && (
              <button
                onClick={() => setShowAddContacts(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <UserPlus className="w-4 h-4" /> Add Contacts
              </button>
            )}
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Company name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">First name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map(c => (
                <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${selected.has(c.id) ? 'bg-blue-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} className="rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${c.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                      {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.company || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.first_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.last_name || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_COLORS[c.status] || 'default'}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">Page {page} of {pages} · {total.toLocaleString()} contacts</span>
            <div className="flex gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                disabled={page === pages}
                onClick={() => setPage(p => p + 1)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit list" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">List name *</label>
            <input
              value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && saveEdit()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={saveEdit} disabled={!editForm.name.trim()}>Save changes</Button>
            <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
