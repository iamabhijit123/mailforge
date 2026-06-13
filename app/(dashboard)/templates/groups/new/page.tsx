'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@/components/ui'

interface List { id: string; name: string }

export default function NewGroupPage() {
  const router = useRouter()
  const [lists, setLists] = useState<List[]>([])
  const [form, setForm] = useState({ name: '', description: '', list_id: '', from_name: '', from_email: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/lists').then(r => r.json()).then(d => setLists(d.lists || d || [])).catch(() => setLists([]))
  }, [])

  async function save() {
    if (!form.name) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/template-groups', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/templates/groups/${data.id}`)
    } else {
      const d = await res.json()
      setError(d.error || 'Failed to create group')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Template Group</h1>
        <p className="text-sm text-gray-500 mt-1">Group multiple templates to send on different scheduled dates</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-5">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">{error}</div>}

        <Input label="Group Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Monthly Newsletter Series" autoFocus />
        <Input label="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of this group" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Send to List</label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            value={form.list_id}
            onChange={e => setForm(f => ({ ...f, list_id: e.target.value }))}
          >
            <option value="">Select a list (required to auto-send)</option>
            {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-600 mb-3">Sender info (leave blank to use Settings defaults)</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="From Name" value={form.from_name} onChange={e => setForm(f => ({ ...f, from_name: e.target.value }))} placeholder="Your Name" />
            <Input label="From Email" type="email" value={form.from_email} onChange={e => setForm(f => ({ ...f, from_email: e.target.value }))} placeholder="you@domain.com" />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button className="flex-1" onClick={save} disabled={saving}>{saving ? 'Creating…' : 'Create Group & Add Templates'}</Button>
          <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
