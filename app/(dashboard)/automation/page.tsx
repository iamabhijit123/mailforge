'use client'

import { useEffect, useState } from 'react'
import { Button, Badge, Modal, Input, Select, Toast } from '@/components/ui'
import { Plus, Zap, Play, Pause, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Automation { id: string; name: string; trigger_type: string; trigger_config: string; steps: string; status: string; created_at: string }

const TRIGGER_TYPES = [
  { value: 'subscribe', label: 'Contact subscribes to a list' },
  { value: 'tag_added', label: 'Tag is added to a contact' },
  { value: 'date_anniversary', label: 'Contact anniversary date' },
]

export default function AutomationPage() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', trigger_type: 'subscribe' })
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  async function load() {
    const res = await fetch('/api/automation')
    setAutomations(await res.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function create() {
    if (!form.name) return
    const res = await fetch('/api/automation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, steps: [] }) })
    if (res.ok) { setShowCreate(false); load(); setToast({ msg: 'Automation created', type: 'success' }) }
  }

  async function toggle(auto: Automation) {
    const newStatus = auto.status === 'active' ? 'paused' : 'active'
    await fetch(`/api/automation/${auto.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
    load()
    setToast({ msg: `Automation ${newStatus}`, type: 'success' })
  }

  async function deleteAuto(id: string) {
    if (!confirm('Delete this automation?')) return
    await fetch(`/api/automation/${id}`, { method: 'DELETE' })
    load()
    setToast({ msg: 'Deleted', type: 'success' })
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automation</h1>
          <p className="text-sm text-gray-500 mt-1">Automatically send emails based on triggers</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-3.5 h-3.5" /> Create Automation</Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <strong>How automation works:</strong> When a trigger fires (e.g., someone subscribes), MailForge will run the configured steps — sending emails, adding tags, or waiting a set time before the next step.
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> :
        automations.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No automations yet. Set up your first one.</p>
            <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-3.5 h-3.5" /> Create automation</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {automations.map(auto => (
              <div key={auto.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${auto.status === 'active' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Zap className={`w-5 h-5 ${auto.status === 'active' ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{auto.name}</h3>
                    <Badge variant={auto.status === 'active' ? 'success' : 'default'}>{auto.status}</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Trigger: {TRIGGER_TYPES.find(t => t.value === auto.trigger_type)?.label || auto.trigger_type}
                  </p>
                  <p className="text-xs text-gray-400">Created {formatDate(auto.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => toggle(auto)}>
                    {auto.status === 'active' ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Activate</>}
                  </Button>
                  <button onClick={() => deleteAuto(auto.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )
      }

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Automation" size="sm">
        <div className="space-y-4">
          <Input label="Automation Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Welcome Series" autoFocus />
          <Select label="Trigger" value={form.trigger_type} onChange={e => setForm(f => ({ ...f, trigger_type: e.target.value }))} options={TRIGGER_TYPES} />
          <p className="text-xs text-gray-500">After creating, configure the steps (emails, delays) in the editor.</p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={create}>Create</Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
