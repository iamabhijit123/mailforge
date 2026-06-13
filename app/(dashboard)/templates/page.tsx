'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button, Badge, Modal, Input, Toast } from '@/components/ui'
import { Plus, FileText, Edit2, Trash2, LayersIcon, Clock, Send, Sparkles, LayoutTemplate } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { TemplatePreviewThumbnail } from '@/components/email-builder/TemplatePreviewThumbnail'

interface Template { id: string; name: string; category: string; subject: string | null; is_system: number; created_at: string; html_body: string | null }
interface Group { id: string; name: string; description: string | null; list_name: string | null; item_count: number; sent_count: number; status: string; created_at: string }

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateType, setShowCreateType] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'custom', subject: '' })
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  async function load() {
    const [tplRes, grpRes] = await Promise.all([fetch('/api/templates'), fetch('/api/template-groups')])
    setTemplates(await tplRes.json())
    const grpData = await grpRes.json()
    setGroups(Array.isArray(grpData) ? grpData : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function createTemplate() {
    if (!form.name) return
    const res = await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      const data = await res.json()
      setShowCreate(false)
      window.location.href = `/templates/${data.id}/edit`
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this template?')) return
    await fetch(`/api/templates/${id}`, { method: 'DELETE' })
    load()
    setToast({ msg: 'Template deleted', type: 'success' })
  }

  async function deleteGroup(id: string) {
    if (!confirm('Delete this group and all its scheduled items?')) return
    await fetch(`/api/template-groups/${id}`, { method: 'DELETE' })
    load()
    setToast({ msg: 'Group deleted', type: 'success' })
  }

  const userTemplates = templates.filter(t => !t.is_system)

  return (
    <div className="space-y-8">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-sm text-gray-500 mt-1">Save reusable email designs and create scheduled groups</p>
        </div>
        <div className="flex gap-2">
          <Link href="/templates/groups/new">
            <Button variant="outline" size="sm"><LayersIcon className="w-3.5 h-3.5" /> New Group</Button>
          </Link>
          <Button size="sm" onClick={() => setShowCreateType(true)}><Plus className="w-3.5 h-3.5" /> New Template</Button>
        </div>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
        <div className="space-y-10">

          {/* Template Groups */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <LayersIcon className="w-4 h-4 text-brand-600" />
                Template Groups ({groups.length})
              </h2>
              <Link href="/templates/groups/new" className="text-xs text-brand-600 hover:underline">+ New Group</Link>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 mb-3">
              Groups let you add multiple templates and schedule each one to send on a different date — perfect for drip campaigns that look fresh.
            </div>
            {groups.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <LayersIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No template groups yet.</p>
                <Link href="/templates/groups/new">
                  <Button size="sm" className="mt-3"><Plus className="w-3.5 h-3.5" /> Create first group</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map(g => (
                  <div key={g.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{g.name}</h3>
                        {g.description && <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Link href={`/templates/groups/${g.id}`} className="p-1 text-gray-400 hover:text-brand-600"><Edit2 className="w-4 h-4" /></Link>
                        <button onClick={() => deleteGroup(g.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{g.item_count} scheduled</span>
                      <span className="flex items-center gap-1"><Send className="w-3 h-3" />{g.sent_count} sent</span>
                    </div>
                    {g.list_name && <p className="text-xs text-gray-500">List: <span className="font-medium">{g.list_name}</span></p>}
                    <div className="flex items-center justify-between">
                      <Badge variant={g.status === 'active' ? 'success' : 'default'}>{g.status}</Badge>
                      <Link href={`/templates/groups/${g.id}`} className="text-xs text-brand-600 hover:underline">Manage →</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Templates */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              My Templates ({userTemplates.length})
            </h2>
            {userTemplates.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No templates yet.</p>
                <Button size="sm" className="mt-3" onClick={() => setShowCreateType(true)}><Plus className="w-3.5 h-3.5" /> Create template</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userTemplates.map(t => (
                  <div key={t.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <TemplatePreviewThumbnail html={t.html_body} height={140} />
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{t.name}</h3>
                          <Badge variant="default" className="mt-1">{t.category}</Badge>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Link href={`/templates/${t.id}/edit`} className="p-1 text-gray-400 hover:text-brand-600"><Edit2 className="w-4 h-4" /></Link>
                          <button onClick={() => deleteTemplate(t.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      {t.subject && <p className="text-xs text-gray-500 truncate">{t.subject}</p>}
                      <p className="text-xs text-gray-400">Updated {formatDate(t.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 1: Choose template type */}
      <Modal open={showCreateType} onClose={() => setShowCreateType(false)} title="Create New Template" size="sm">
        <div className="grid grid-cols-2 gap-4 py-2">
          <button
            onClick={() => { setShowCreateType(false); setShowCreate(true) }}
            className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all group text-left"
          >
            <div className="w-12 h-12 rounded-full bg-brand-50 group-hover:bg-brand-100 flex items-center justify-center">
              <LayoutTemplate className="w-6 h-6 text-brand-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900">Visual Builder</p>
              <p className="text-xs text-gray-500 mt-1">Drag & drop blocks to design your email</p>
            </div>
          </button>

          <Link
            href="/templates/ai-maker"
            onClick={() => setShowCreateType(false)}
            className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900">AI Maker</p>
              <p className="text-xs text-gray-500 mt-1">Generate stunning emails with Claude AI</p>
            </div>
          </Link>
        </div>
      </Modal>

      {/* Step 2: Visual builder — name form */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Template" size="sm">
        <div className="space-y-4">
          <Input label="Template Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          <Input label="Default Subject (optional)" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={createTemplate}>Create & Edit</Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
