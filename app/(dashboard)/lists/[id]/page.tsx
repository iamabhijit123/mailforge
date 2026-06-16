'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import { Button, Badge, Modal, Toast } from '@/components/ui'
import {
  Search, AlignJustify, MoreHorizontal, ChevronLeft, ChevronRight,
  Mail, UserMinus
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface List { id: string; name: string; description: string | null; contact_count: number; subscribed_count: number; created_at: string }
interface Contact { id: string; email: string; first_name: string | null; last_name: string | null; company: string | null; status: string; created_at: string }

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
            <p className="text-gray-500 font-medium mb-1">No contacts found</p>
            <p className="text-sm text-gray-400">
              {q || statusFilter ? 'Try adjusting your search or filters.' : 'Add contacts to this list from the Contacts page.'}
            </p>
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
