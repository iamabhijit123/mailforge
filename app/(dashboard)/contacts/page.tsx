'use client'

import { useEffect, useState, useRef } from 'react'
import { Button, Input, Badge, Modal, Select, Toast } from '@/components/ui'
import { Plus, Upload, Search, Trash2, Eye, Download, X } from 'lucide-react'
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
      <div className="flex flex-wrap gap-1 min-h-[36px] border border-gray-300 rounded-md px-2 py-1.5 focus-within:ring-1 focus-within:ring-brand-500">
        {tags.map(t => (
          <span key={t} className="inline-flex items-center gap-1 bg-brand-100 text-brand-700 text-xs px-2 py-0.5 rounded-full">
            {t}
            <button type="button" onClick={() => onChange(tags.filter(x => x !== t))}><X className="w-3 h-3" /></button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
          onBlur={add}
          placeholder={tags.length === 0 ? 'Type tag, press Enter…' : ''}
          className="flex-1 min-w-[80px] outline-none text-sm bg-transparent"
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">Press Enter or comma to add a tag</p>
    </div>
  )
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [lists, setLists] = useState<List[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [addForm, setAddForm] = useState({
    email: '', first_name: '', last_name: '', company: '', phone: '',
    list_ids: [] as string[], tags: [] as string[],
  })

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), ...(q && { q }), ...(statusFilter && { status: statusFilter }) })
    try {
      const res = await fetch(`/api/contacts?${params}`)
      const data = await res.json()
      setContacts(data.contacts || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
    } catch { setContacts([]) }
    setLoading(false)
  }

  useEffect(() => { fetch('/api/lists').then(r => r.json()).then(d => setLists(d.lists || d || [])).catch(() => setLists([])) }, [])
  useEffect(() => { load() }, [page, statusFilter])
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load() }, 400)
    return () => clearTimeout(t)
  }, [q])

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
    if (!confirm(`Delete ${selected.size} contacts?`)) return
    await Promise.all(Array.from(selected).map(id => fetch(`/api/contacts/${id}`, { method: 'DELETE' })))
    setSelected(new Set())
    load()
    setToast({ msg: `${selected.size} contacts deleted`, type: 'success' })
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

  const toggleSelect = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(s => s.size === contacts.length ? new Set() : new Set(contacts.map(c => c.id)))

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">{total.toLocaleString()} contacts total</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && <Button variant="danger" size="sm" onClick={deleteSelected}><Trash2 className="w-3.5 h-3.5" /> Delete ({selected.size})</Button>}
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="w-3.5 h-3.5" /> Export</Button>
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}><Upload className="w-3.5 h-3.5" /> Import CSV</Button>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" /> Add Contact</Button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" placeholder="Search contacts…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <Select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          options={[{ value: '', label: 'All statuses' }, { value: 'subscribed', label: 'Subscribed' }, { value: 'unsubscribed', label: 'Unsubscribed' }, { value: 'bounced', label: 'Bounced' }]}
          className="w-44"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading…</div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">No contacts found</p>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" /> Add your first contact</Button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3"><input type="checkbox" checked={selected.size === contacts.length && contacts.length > 0} onChange={toggleAll} className="rounded" /></th>
                {['Name / Email', 'Company', 'Tags', 'Status', 'Added', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map(c => {
                let parsedTags: string[] = []
                try { parsedTags = JSON.parse(c.tags || '[]') } catch { parsedTags = [] }
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded" /></td>
                    <td className="px-4 py-3">
                      <Link href={`/contacts/${c.id}`} className="text-sm font-medium text-gray-900 hover:text-brand-600">
                        {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                      </Link>
                      <p className="text-xs text-gray-500">{c.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.company || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {parsedTags.slice(0, 3).map(t => (
                          <span key={t} className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                        {parsedTags.length > 3 && <span className="text-xs text-gray-400">+{parsedTags.length - 3}</span>}
                        {parsedTags.length === 0 && <span className="text-xs text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant={STATUS_COLORS[c.status] || 'default'}>{c.status}</Badge></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link href={`/contacts/${c.id}`} className="p-1 text-gray-400 hover:text-brand-600 rounded"><Eye className="w-4 h-4" /></Link>
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
            <span className="text-sm text-gray-500">Page {page} of {pages}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

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
              <p className="text-xs text-gray-400 border border-gray-200 rounded p-2">
                No lists yet. <Link href="/lists" className="text-brand-600 hover:underline">Create a list first</Link> to add contacts to it.
              </p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
                {lists.map(l => (
                  <label key={l.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
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

      <Modal open={showImport} onClose={() => setShowImport(false)} title="Import Contacts from CSV" size="sm">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            Your CSV should have columns: <code>email</code>, <code>first_name</code>, <code>last_name</code>, <code>company</code>, <code>phone</code>
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} />
          <Button className="w-full" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4" /> Choose CSV File
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => setShowImport(false)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  )
}
