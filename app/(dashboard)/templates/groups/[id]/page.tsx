'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { Button, Input, Toast, Badge } from '@/components/ui'
import { Plus, Trash2, ArrowLeft, Clock, CheckCircle, AlertCircle, Send } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Template { id: string; name: string; subject: string | null }
interface List { id: string; name: string }
interface GroupItem {
  id: string; template_id: string; template_name: string | null; template_subject: string | null
  subject: string | null; scheduled_at: string; sent_at: string | null; status: string; position: number
}
interface Group {
  id: string; name: string; description: string | null; list_id: string | null; list_name: string | null
  from_name: string | null; from_email: string | null; status: string; created_at: string; items: GroupItem[]
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4 text-yellow-500" />,
  sent: <CheckCircle className="w-4 h-4 text-green-500" />,
  error: <AlertCircle className="w-4 h-4 text-red-500" />,
}

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [group, setGroup] = useState<Group | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [lists, setLists] = useState<List[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ template_id: '', subject: '', scheduled_at: '' })
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '', list_id: '', from_name: '', from_email: '', status: 'active' })

  async function load() {
    const [gRes, tRes, lRes] = await Promise.all([
      fetch(`/api/template-groups/${id}`),
      fetch('/api/templates'),
      fetch('/api/lists'),
    ])
    if (gRes.ok) {
      const g = await gRes.json()
      setGroup(g)
      setEditForm({ name: g.name, description: g.description || '', list_id: g.list_id || '', from_name: g.from_name || '', from_email: g.from_email || '', status: g.status })
    }
    const tplData = await tRes.json()
    setTemplates(Array.isArray(tplData) ? tplData.filter((t: Template & { is_system?: number }) => !t.is_system) : [])
    const lData = await lRes.json()
    setLists(lData.lists || lData || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function addItem() {
    if (!addForm.template_id || !addForm.scheduled_at) { setToast({ msg: 'Template and date required', type: 'error' }); return }
    setSaving(true)
    const res = await fetch(`/api/template-groups/${id}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...addForm, position: (group?.items.length ?? 0) + 1 }),
    })
    if (res.ok) {
      setAddForm({ template_id: '', subject: '', scheduled_at: '' })
      setShowAdd(false)
      setToast({ msg: 'Template scheduled', type: 'success' })
      load()
    } else {
      const d = await res.json()
      setToast({ msg: d.error || 'Failed', type: 'error' })
    }
    setSaving(false)
  }

  async function saveGroup() {
    const res = await fetch(`/api/template-groups/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) { setEditMode(false); load(); setToast({ msg: 'Group updated', type: 'success' }) }
    else setToast({ msg: 'Failed to save', type: 'error' })
  }

  async function removeItem(itemId: string) {
    if (!confirm('Remove this scheduled template?')) return
    // Use the PUT endpoint to replace with filtered list
    const remaining = (group?.items || []).filter(i => i.id !== itemId && i.status === 'pending')
    await fetch(`/api/template-groups/${id}/items`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: remaining }),
    })
    load()
    setToast({ msg: 'Removed', type: 'success' })
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
  if (!group) return <div className="text-center py-12 text-gray-500">Group not found</div>

  return (
    <div className="space-y-6 max-w-3xl">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center gap-4">
        <Link href="/templates" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          {group.description && <p className="text-sm text-gray-500 mt-0.5">{group.description}</p>}
        </div>
        <Badge variant={group.status === 'active' ? 'success' : 'default'}>{group.status}</Badge>
        <Button variant="secondary" size="sm" onClick={() => setEditMode(!editMode)}>{editMode ? 'Cancel' : 'Edit Group'}</Button>
      </div>

      {editMode && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 text-sm">Group Settings</h2>
          <Input label="Name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Description" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Send to List</label>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" value={editForm.list_id} onChange={e => setEditForm(f => ({ ...f, list_id: e.target.value }))}>
              <option value="">— No list selected —</option>
              {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="From Name" value={editForm.from_name} onChange={e => setEditForm(f => ({ ...f, from_name: e.target.value }))} />
            <Input label="From Email" value={editForm.from_email} onChange={e => setEditForm(f => ({ ...f, from_email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">Active (auto-sends when due)</option>
              <option value="paused">Paused (skip scheduled sends)</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveGroup}>Save Changes</Button>
            <Button variant="secondary" onClick={() => setEditMode(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Scheduled Templates</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {group.list_name ? `Sending to: ${group.list_name}` : 'No list selected — edit group to add one'}
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" /> Schedule Template</Button>
        </div>

        {!showAdd && (group.items || []).length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            No templates scheduled yet.
            <br />
            <button onClick={() => setShowAdd(true)} className="mt-2 text-brand-600 hover:underline text-sm">Schedule your first template →</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {(group.items || []).map((item, i) => (
              <div key={item.id} className="px-5 py-4 flex items-center gap-4">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{item.template_name || 'Unknown template'}</p>
                  <p className="text-xs text-gray-500">{item.subject || item.template_subject || 'No subject override'}</p>
                </div>
                <div className="text-xs text-gray-500 text-right flex-shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    {STATUS_ICON[item.status] || <Clock className="w-4 h-4 text-gray-400" />}
                    <span className="capitalize">{item.status}</span>
                  </div>
                  <div>{item.status === 'sent' && item.sent_at ? `Sent ${formatDate(item.sent_at)}` : `Scheduled ${formatDate(item.scheduled_at)}`}</div>
                </div>
                {item.status === 'pending' && (
                  <button onClick={() => removeItem(item.id)} className="p-1 text-gray-300 hover:text-red-500 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>
        )}

        {showAdd && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Add Scheduled Template</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Template *</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={addForm.template_id}
                onChange={e => setAddForm(f => ({ ...f, template_id: e.target.value }))}
              >
                <option value="">Select template…</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}{t.subject ? ` — ${t.subject}` : ''}</option>)}
              </select>
            </div>
            <Input
              label="Subject Override (optional)"
              value={addForm.subject}
              onChange={e => setAddForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Leave blank to use template's subject"
            />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Send Date & Time *</label>
              <input
                type="datetime-local"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={addForm.scheduled_at}
                onChange={e => setAddForm(f => ({ ...f, scheduled_at: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addItem} disabled={saving}>{saving ? 'Scheduling…' : 'Schedule'}</Button>
              <Button variant="secondary" size="sm" onClick={() => { setShowAdd(false); setAddForm({ template_id: '', subject: '', scheduled_at: '' }) }}>Cancel</Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-2">How it works</h3>
        <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
          <li>Add templates to this group with scheduled send dates</li>
          <li>The app checks for due sends every 60 seconds (while the browser is open)</li>
          <li>Each template is sent automatically to <strong>{group.list_name || 'the selected list'}</strong> on its scheduled date</li>
          <li>Each send creates a campaign you can view in <Link href="/campaigns" className="text-brand-600 hover:underline">Campaigns</Link></li>
        </ol>
      </div>
    </div>
  )
}
