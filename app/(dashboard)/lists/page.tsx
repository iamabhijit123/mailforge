'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, Input, Modal, Toast } from '@/components/ui'
import { Plus, Search, Star, MoreVertical, AlignJustify, ChevronUp, ChevronDown } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

interface List {
  id: string
  name: string
  description: string | null
  contact_count: number
  subscribed_count: number
  created_at: string
}

function ListMenu({ list, onEdit, onDelete }: { list: List; onEdit: () => void; onDelete: () => void }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!pos) return
    function handle(e: MouseEvent) {
      const el = document.getElementById(`list-menu-${list.id}`)
      if (el && !el.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setPos(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [pos, list.id])

  function open(e: React.MouseEvent) {
    e.stopPropagation()
    if (pos) { setPos(null); return }
    const rect = btnRef.current!.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
  }

  return (
    <>
      <button ref={btnRef} onClick={open} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
        <MoreVertical className="w-4 h-4" />
      </button>
      {pos && (
        <div
          id={`list-menu-${list.id}`}
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
          className="w-44 bg-white rounded-xl shadow-dropdown border border-gray-200 py-1"
        >
          <button onClick={() => { onEdit(); setPos(null) }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Edit list</button>
          <Link href="/campaigns" onClick={() => setPos(null)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Send an email</Link>
          <div className="my-1 border-t border-gray-100" />
          <button onClick={() => { onDelete(); setPos(null) }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete list</button>
        </div>
      )}
    </>
  )
}

export default function ListsPage() {
  const [lists, setLists] = useState<List[]>([])
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'all' | 'lists' | 'segments'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'contact_count' | 'created_at'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [starred, setStarred] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [editList, setEditList] = useState<List | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  async function load() {
    const res = await fetch('/api/lists')
    const data = await res.json()
    setLists(Array.isArray(data) ? data : data.lists || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function createList() {
    if (!form.name.trim()) return
    const res = await fetch('/api/lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      setShowCreate(false); setForm({ name: '', description: '' }); load()
      setToast({ msg: 'List created', type: 'success' })
    } else {
      const text = await res.text()
      let msg = `Error ${res.status}`
      try { const d = JSON.parse(text); msg = d.error || msg } catch { msg = text.slice(0, 120) || msg }
      setToast({ msg, type: 'error' })
    }
  }

  async function updateList() {
    if (!editList) return
    await fetch(`/api/lists/${editList.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setEditList(null); load(); setToast({ msg: 'List updated', type: 'success' })
  }

  async function deleteList(id: string) {
    if (!confirm('Delete this list? Contacts will not be deleted.')) return
    await fetch(`/api/lists/${id}`, { method: 'DELETE' })
    load(); setToast({ msg: 'List deleted', type: 'success' })
  }

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  function SortIcon({ col }: { col: typeof sortBy }) {
    if (sortBy !== col) return <span className="ml-1 opacity-30"><ChevronUp className="w-3 h-3 inline" /></span>
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 inline ml-1 text-blue-600" />
      : <ChevronDown className="w-3 h-3 inline ml-1 text-blue-600" />
  }

  const filtered = lists
    .filter(l => !q || l.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      let av: string | number = a[sortBy] ?? ''
      let bv: string | number = b[sortBy] ?? ''
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      const r = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? r : -r
    })

  const allSelected = filtered.length > 0 && filtered.every(l => selected.has(l.id))

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(filtered.map(l => l.id)))
  }

  function toggleOne(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleStar(id: string) {
    setStarred(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Lists and segments</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Lists and segments are groups that help you organize your contacts. Create a list manually to target specific contacts.
          </p>
        </div>
        <button
          onClick={() => { setForm({ name: '', description: '' }); setShowCreate(true) }}
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create new
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-card">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            Your lists
            <span className="inline-flex items-center justify-center min-w-[22px] h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold px-1.5">{lists.length}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50 w-52 transition-all"
                placeholder="Search by list name"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </div>

            {/* Tabs */}
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              {(['all', 'lists', 'segments'] as const).map((t, i) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                    tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  } ${i > 0 ? 'border-l border-gray-200' : ''}`}
                >
                  {t === 'all' ? 'All' : t === 'lists' ? 'Lists' : 'Segments'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-gray-500 font-medium mb-1">{lists.length === 0 ? 'No lists yet' : 'No lists match your search'}</p>
            <p className="text-sm text-gray-400 mb-4">
              {lists.length === 0 ? 'Create a list to organize your contacts.' : 'Try a different search term.'}
            </p>
            {lists.length === 0 && (
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors mx-auto">
                <Plus className="w-4 h-4" /> Create your first list
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
                </th>
                <th className="px-2 py-3 w-8" />
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort('name')} className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-800">
                    Name <SortIcon col="name" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort('contact_count')} className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-800">
                    Contacts <SortIcon col="contact_count" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SMS</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">List type</th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort('created_at')} className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-800">
                    Date created <SortIcon col="created_at" />
                  </button>
                </th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(list => (
                <tr key={list.id} className={`hover:bg-gray-50 transition-colors ${selected.has(list.id) ? 'bg-blue-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(list.id)} onChange={() => toggleOne(list.id)} className="rounded" />
                  </td>
                  <td className="px-2 py-3">
                    <button onClick={() => toggleStar(list.id)} className="text-gray-300 hover:text-yellow-400 transition-colors">
                      <Star className={`w-4 h-4 ${starred.has(list.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/lists/${list.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                      {list.name}
                    </Link>
                    {list.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{list.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-medium">{(list.contact_count || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-blue-600 font-medium">{(list.subscribed_count || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">0</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-300 bg-white text-xs font-medium text-gray-600">
                      <AlignJustify className="w-3 h-3" /> List
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(list.created_at)}</td>
                  <td className="px-4 py-3">
                    <ListMenu
                      list={list}
                      onEdit={() => { setEditList(list); setForm({ name: list.name, description: list.description || '' }) }}
                      onDelete={() => deleteList(list.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create new list" size="sm">
        <div className="space-y-4">
          <Input label="List name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Newsletter Subscribers" autoFocus onKeyDown={e => e.key === 'Enter' && createList()} />
          <Input label="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What's this list for?" />
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={createList} disabled={!form.name.trim()}>Create list</Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editList} onClose={() => setEditList(null)} title="Edit list" size="sm">
        <div className="space-y-4">
          <Input label="List name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={updateList}>Save changes</Button>
            <Button variant="secondary" onClick={() => setEditList(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
