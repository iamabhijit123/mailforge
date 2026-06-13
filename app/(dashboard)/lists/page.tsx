'use client'

import { useEffect, useState } from 'react'
import { Button, Input, Modal, Toast } from '@/components/ui'
import { Plus, Users, Trash2, Edit2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

interface List { id: string; name: string; description: string | null; contact_count: number; created_at: string }

export default function ListsPage() {
  const [lists, setLists] = useState<List[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [editList, setEditList] = useState<List | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  async function load() {
    const res = await fetch('/api/lists')
    setLists(await res.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function createList() {
    if (!form.name.trim()) return
    const res = await fetch('/api/lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { setShowCreate(false); setForm({ name: '', description: '' }); load(); setToast({ msg: 'List created', type: 'success' }) }
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

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contact Lists</h1>
          <p className="text-sm text-gray-500 mt-1">Organize contacts into lists for targeted campaigns</p>
        </div>
        <Button size="sm" onClick={() => { setForm({ name: '', description: '' }); setShowCreate(true) }}><Plus className="w-3.5 h-3.5" /> Create List</Button>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> :
        lists.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No lists yet. Create one to organize your contacts.</p>
            <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-3.5 h-3.5" /> Create your first list</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map(list => (
              <div key={list.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{list.name}</h3>
                    {list.description && <p className="text-sm text-gray-500 mt-0.5">{list.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditList(list); setForm({ name: list.name, description: list.description || '' }) }} className="p-1 text-gray-400 hover:text-brand-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteList(list.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Users className="w-4 h-4 text-gray-400" />
                  {(list.contact_count || 0).toLocaleString()} contacts
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <span className="text-xs text-gray-400">Created {formatDate(list.created_at)}</span>
                  <Link href={`/contacts?list_id=${list.id}`} className="text-xs text-brand-600 hover:underline">View contacts</Link>
                </div>
              </div>
            ))}
          </div>
        )
      }

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create List" size="sm">
        <div className="space-y-4">
          <Input label="List Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Newsletter Subscribers" autoFocus />
          <Input label="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-2 pt-1">
            <Button className="flex-1" onClick={createList}>Create List</Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editList} onClose={() => setEditList(null)} title="Edit List" size="sm">
        <div className="space-y-4">
          <Input label="List Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-2 pt-1">
            <Button className="flex-1" onClick={updateList}>Save</Button>
            <Button variant="secondary" onClick={() => setEditList(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
