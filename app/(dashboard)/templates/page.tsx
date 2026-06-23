'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Modal, Input, Toast } from '@/components/ui'
import {
  Plus, FileText, Edit2, Trash2, LayersIcon, Clock, Send, Sparkles,
  LayoutTemplate, FlaskConical, X, Search, Code, Folder, FolderPlus,
  FolderOpen, MoreVertical, Check, MoveRight,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { TemplatePreviewThumbnail } from '@/components/email-builder/TemplatePreviewThumbnail'

interface Template {
  id: string; name: string; category: string; subject: string | null
  is_system: number; created_at: string; html_body: string | null; folder_id: string | null
}
interface Group {
  id: string; name: string; description: string | null; list_name: string | null
  item_count: number; sent_count: number; status: string; created_at: string
}
interface FolderItem { id: string; name: string; color: string; template_count: number }

type Tab = 'library' | 'saved' | 'groups'

const FOLDER_COLORS = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#6B7280', label: 'Gray' },
]

function FolderMoveMenu({
  folders,
  currentFolderId,
  onMove,
}: {
  folders: FolderItem[]
  currentFolderId: string | null
  onMove: (folderId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
      >
        <MoveRight className="w-3 h-3" /> Move to folder
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-44 bg-white rounded-xl border border-gray-200 shadow-lg z-50 py-1">
          <button
            onClick={() => { onMove(null); setOpen(false) }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 ${!currentFolderId ? 'font-semibold text-blue-600' : ''}`}
          >
            {!currentFolderId && <Check className="w-3 h-3" />}
            <FileText className="w-3 h-3 text-gray-400" />
            No folder
          </button>
          {folders.map(f => (
            <button
              key={f.id}
              onClick={() => { onMove(f.id); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 ${currentFolderId === f.id ? 'font-semibold text-blue-600' : ''}`}
            >
              {currentFolderId === f.id && <Check className="w-3 h-3" />}
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: f.color }} />
              <span className="truncate">{f.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TemplateCard({
  template,
  folders,
  onPreview,
  onDelete,
  onSelect,
  onMoveToFolder,
}: {
  template: Template
  folders: FolderItem[]
  onPreview: (t: Template) => void
  onDelete: (id: string) => void
  onSelect?: (t: Template) => void
  onMoveToFolder?: (id: string, folderId: string | null) => void
}) {
  return (
    <div className="group flex flex-col cursor-pointer">
      <div className="relative h-[220px] rounded-xl overflow-hidden border-2 border-gray-200 group-hover:border-blue-400 transition-all shadow-sm">
        <TemplatePreviewThumbnail html={template.html_body} height={220} />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          {onSelect ? (
            <button onClick={() => onSelect(template)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-lg">
              Select
            </button>
          ) : (
            <Link href={`/templates/${template.id}/edit`} className="block">
              <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-lg">Edit</button>
            </Link>
          )}
          <button onClick={() => onPreview(template)} className="px-6 py-2 bg-white hover:bg-gray-100 text-gray-900 text-sm font-bold rounded-lg shadow-lg">
            Preview
          </button>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(template.id) }}
          className="absolute top-2 right-2 w-7 h-7 bg-black/40 hover:bg-red-600 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Footer is OUTSIDE overflow-hidden — dropdown won't get clipped */}
      <div className="mt-2 px-1">
        <p className="text-sm font-medium text-gray-800 text-center truncate">{template.name}</p>
        {onMoveToFolder && (
          <div className="flex justify-center mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <FolderMoveMenu folders={folders} currentFolderId={template.folder_id} onMove={fid => onMoveToFolder(template.id, fid)} />
          </div>
        )}
      </div>
    </div>
  )
}

function PreviewModal({
  template, onClose, onEdit, onTest,
}: {
  template: Template; onClose: () => void; onEdit: () => void; onTest: (email: string) => Promise<void>
}) {
  const [testEmail, setTestEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [showTest, setShowTest] = useState(false)
  async function handleTest() {
    setSending(true)
    await onTest(testEmail)
    setSending(false); setShowTest(false); setTestEmail('')
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col" style={{ height: '90vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">{template.name}</h2>
            {template.subject && <p className="text-sm text-gray-500 mt-0.5">{template.subject}</p>}
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto bg-[#F0F2F5] p-6">
            <iframe
              srcDoc={template.html_body || '<div style="font-family:sans-serif;color:#999;padding:60px;text-align:center">No preview available</div>'}
              title="Template Preview"
              className="w-full max-w-[640px] mx-auto block border-0 bg-white shadow-lg rounded-xl"
              style={{ minHeight: 500 }}
              sandbox="allow-same-origin"
            />
          </div>
          <div className="w-60 flex-shrink-0 border-l border-gray-100 bg-gray-50 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</p>
            </div>
            <div className="p-4 flex flex-col gap-2.5 flex-1">
              <button onClick={onEdit} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">
                <Edit2 className="w-3.5 h-3.5" /> Edit Template
              </button>
              <Link href={`/campaigns/new?template_id=${template.id}`} className="block">
                <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                  <Send className="w-3.5 h-3.5 text-gray-400" /> Use in Campaign
                </button>
              </Link>
              <div className="border-t border-gray-200 pt-2.5">
                {!showTest ? (
                  <button onClick={() => setShowTest(true)} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                    <FlaskConical className="w-3.5 h-3.5 text-gray-400" /> Send Test Email
                  </button>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2.5">
                    <p className="text-xs font-semibold text-gray-700">Send test to:</p>
                    <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="your@email.com" autoFocus
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                    <button onClick={handleTest} disabled={sending || !testEmail}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                      {sending ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                      {sending ? 'Sending…' : 'Send Test'}
                    </button>
                    <button onClick={() => setShowTest(false)} className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-auto">{formatDate(template.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FolderSidebar({
  folders,
  selected,
  onSelect,
  onAdd,
  userTemplateCount,
}: {
  folders: FolderItem[]
  selected: string | null | 'unfiled'
  onSelect: (id: string | null | 'unfiled') => void
  onAdd: () => void
  userTemplateCount: number
}) {
  // Use '' as sentinel — no real folder id is ever an empty string
  const [renamingId, setRenamingId] = useState('')
  const [renameVal, setRenameVal] = useState('')
  const [menuOpenId, setMenuOpenId] = useState('')
  const sidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setMenuOpenId('')
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function renameFolder(id: string) {
    if (!renameVal.trim()) { setRenamingId(''); return }
    await fetch(`/api/template-folders/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameVal.trim() }),
    })
    setRenamingId('')
    window.location.reload()
  }

  async function deleteFolder(id: string) {
    if (!confirm('Delete this folder? Templates inside will be unfoldered.')) return
    await fetch(`/api/template-folders/${id}`, { method: 'DELETE' })
    window.location.reload()
  }

  const unfiledCount = userTemplateCount - folders.reduce((s, f) => s + f.template_count, 0)

  return (
    <div ref={sidebarRef} className="w-44 flex-shrink-0 border-r border-gray-100 pr-3 space-y-0.5">
      {/* All Templates */}
      <button
        onClick={() => onSelect(null)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${selected === null ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
      >
        <FileText className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
        <span className="flex-1 text-left text-xs">All Templates</span>
        <span className="text-xs text-gray-400">{userTemplateCount}</span>
      </button>

      {/* Unfiled */}
      <button
        onClick={() => onSelect('unfiled')}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${selected === 'unfiled' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
      >
        <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
        <span className="flex-1 text-left text-xs">Unfiled</span>
        <span className="text-xs text-gray-400">{unfiledCount}</span>
      </button>

      {/* Named folders */}
      {folders.map(folder => (
        <div key={folder.id} className="relative">
          {renamingId === folder.id ? (
            <div className="flex gap-1 items-center py-1">
              <input
                autoFocus
                value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') renameFolder(folder.id)
                  if (e.key === 'Escape') setRenamingId('')
                }}
                className="flex-1 text-xs border border-blue-400 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button onClick={() => renameFolder(folder.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setRenamingId('')} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onSelect(folder.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors group ${selected === folder.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: folder.color }} />
              <span className="flex-1 text-left truncate text-xs">{folder.name}</span>
              <span className="text-xs text-gray-400">{folder.template_count}</span>
              <span
                onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === folder.id ? '' : folder.id) }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 transition-opacity"
              >
                <MoreVertical className="w-3 h-3 text-gray-400" />
              </span>
            </button>
          )}
          {menuOpenId === folder.id && (
            <div className="absolute right-0 top-8 w-36 bg-white rounded-xl border border-gray-200 shadow-lg z-50 py-1">
              <button
                onClick={() => { setRenameVal(folder.name); setRenamingId(folder.id); setMenuOpenId('') }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
              >
                <Edit2 className="w-3 h-3 text-gray-400" /> Rename
              </button>
              <button
                onClick={() => { setMenuOpenId(''); deleteFolder(folder.id) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3" /> Delete folder
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={onAdd}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors mt-1"
      >
        <FolderPlus className="w-3.5 h-3.5" /> New folder
      </button>
    </div>
  )
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('library')
  const [q, setQ] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | 'unfiled'>(null)

  const [showCreateType, setShowCreateType] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showPasteHtml, setShowPasteHtml] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'custom', subject: '' })
  const [pasteHtml, setPasteHtml] = useState('')
  const [pasteName, setPasteName] = useState('')

  const [showFolderCreate, setShowFolderCreate] = useState(false)
  const [folderForm, setFolderForm] = useState({ name: '', color: '#3B82F6' })

  const [previewTpl, setPreviewTpl] = useState<Template | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  async function load() {
    const [tplRes, grpRes, fldRes] = await Promise.all([
      fetch('/api/templates'),
      fetch('/api/template-groups'),
      fetch('/api/template-folders'),
    ])
    setTemplates(await tplRes.json())
    const grpData = await grpRes.json()
    setGroups(Array.isArray(grpData) ? grpData : [])
    const fldData = await fldRes.json()
    setFolders(Array.isArray(fldData) ? fldData : [])
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

  async function createFromHtml() {
    if (!pasteName.trim() || !pasteHtml.trim()) return
    const res = await fetch('/api/templates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: pasteName, category: 'custom', subject: '', html_body: pasteHtml }),
    })
    if (res.ok) {
      const data = await res.json()
      setShowPasteHtml(false); setPasteHtml(''); setPasteName('')
      setToast({ msg: 'Template created from HTML', type: 'success' })
      load(); window.location.href = `/templates/${data.id}/edit`
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this template?')) return
    await fetch(`/api/templates/${id}`, { method: 'DELETE' })
    load(); setToast({ msg: 'Template deleted', type: 'success' })
  }

  async function deleteGroup(id: string) {
    if (!confirm('Delete this group and all its scheduled items?')) return
    await fetch(`/api/template-groups/${id}`, { method: 'DELETE' })
    load(); setToast({ msg: 'Group deleted', type: 'success' })
  }

  async function sendTest(email: string) {
    if (!previewTpl) return
    const res = await fetch(`/api/templates/${previewTpl.id}/test`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_email: email }),
    })
    const data = await res.json()
    if (res.ok) setToast({ msg: `Test sent to ${email}`, type: 'success' })
    else setToast({ msg: data.error || 'Failed to send test', type: 'error' })
  }

  async function createFolder() {
    if (!folderForm.name.trim()) return
    await fetch('/api/template-folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(folderForm) })
    setShowFolderCreate(false); setFolderForm({ name: '', color: '#3B82F6' })
    load(); setToast({ msg: 'Folder created', type: 'success' })
  }

  async function moveToFolder(templateId: string, folderId: string | null) {
    await fetch(`/api/templates/${templateId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder_id: folderId }) })
    load(); setToast({ msg: folderId ? 'Moved to folder' : 'Removed from folder', type: 'success' })
  }

  const userTemplates = templates.filter(t => !t.is_system)
  const filteredTemplates = userTemplates
    .filter(t => !q || t.name.toLowerCase().includes(q.toLowerCase()))
    .filter(t => {
      if (selectedFolderId === null) return true
      if (selectedFolderId === 'unfiled') return !t.folder_id
      return t.folder_id === selectedFolderId
    })
  const filteredGroups = q ? groups.filter(g => g.name.toLowerCase().includes(q.toLowerCase())) : groups

  const TABS = [
    { key: 'library' as Tab, label: 'Library' },
    { key: 'saved' as Tab, label: `My Templates${userTemplates.length > 0 ? ` (${userTemplates.length})` : ''}` },
    { key: 'groups' as Tab, label: `Groups${groups.length > 0 ? ` (${groups.length})` : ''}` },
  ]

  const CREATE_OPTIONS = [
    {
      icon: LayoutTemplate, title: 'Start from blank',
      desc: 'Design your email from scratch using our drag-and-drop visual editor.',
      action: 'Build from scratch', color: 'text-blue-600', bg: 'bg-blue-50',
      onClick: () => { setShowCreateType(false); setShowCreate(true) },
    },
    {
      icon: Sparkles, title: 'Generate with AI',
      desc: 'Describe your email and let Claude AI generate a beautiful design instantly.',
      action: 'Open AI Maker', color: 'text-purple-600', bg: 'bg-purple-50',
      href: '/templates/ai-maker',
    },
    {
      icon: Code, title: 'Paste your own code',
      desc: 'Bring in a fully developed HTML email design and edit it directly.',
      action: 'Paste HTML', color: 'text-green-600', bg: 'bg-green-50',
      onClick: () => { setShowCreateType(false); setShowPasteHtml(true) },
    },
  ]

  return (
    <div className="space-y-0">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {previewTpl && (
        <PreviewModal
          template={previewTpl}
          onClose={() => setPreviewTpl(null)}
          onEdit={() => { window.location.href = `/templates/${previewTpl.id}/edit` }}
          onTest={sendTest}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Choose a template</h1>
        <div className="flex items-center gap-2">
          <Link href="/templates/groups/new">
            <button className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-card">
              <LayersIcon className="w-4 h-4 text-gray-400" /> New Group
            </button>
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Template
          </button>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card">
        {/* Tabs + Search row */}
        <div className="flex items-center border-b border-gray-100 px-6">
          <div className="flex gap-0">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-5 py-4 text-sm font-semibold border-b-2 -mb-px transition-all whitespace-nowrap ${
                  tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="ml-auto py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50 w-56"
                placeholder="Search templates…"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* ── LIBRARY TAB ── */}
          {tab === 'library' && (
            <div className="space-y-8">
              <section>
                <h2 className="text-base font-bold text-gray-900 mb-4">Create your own email</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {CREATE_OPTIONS.map(opt => (
                    <div key={opt.title} className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-card-hover transition-all group">
                      <div className={`w-11 h-11 rounded-xl ${opt.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <opt.icon className={`w-5.5 h-5.5 ${opt.color}`} />
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm mb-1">{opt.title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed mb-4">{opt.desc}</p>
                      {opt.href ? (
                        <Link href={opt.href} className={`text-sm font-semibold ${opt.color} hover:underline`}>{opt.action} →</Link>
                      ) : (
                        <button onClick={opt.onClick} className={`text-sm font-semibold ${opt.color} hover:underline`}>{opt.action} →</button>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {userTemplates.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-gray-900">My saved templates</h2>
                    <button onClick={() => setTab('saved')} className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
                      View all ({userTemplates.length}) →
                    </button>
                  </div>
                  {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                      {[...Array(5)].map((_, i) => <div key={i} className="animate-pulse"><div className="rounded-xl bg-gray-200" style={{ aspectRatio: '3/4' }} /><div className="h-3 bg-gray-200 rounded mt-2 mx-4" /></div>)}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                      {userTemplates.slice(0, 5).map(t => (
                        <TemplateCard key={t.id} template={t} folders={folders} onPreview={setPreviewTpl} onDelete={deleteTemplate} />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {userTemplates.length === 0 && !loading && (
                <section>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl py-14 text-center">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">No templates saved yet</p>
                    <p className="text-xs text-gray-400 mb-4">Create one using the options above</p>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ── MY TEMPLATES TAB ── */}
          {tab === 'saved' && (
            <div className="flex gap-6">
              {/* Folder sidebar */}
              <FolderSidebar
                folders={folders}
                selected={selectedFolderId}
                onSelect={setSelectedFolderId}
                onAdd={() => setShowFolderCreate(true)}
                userTemplateCount={userTemplates.length}
              />

              {/* Template grid */}
              <div className="flex-1 min-w-0">
                {loading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    {[...Array(8)].map((_, i) => <div key={i} className="animate-pulse"><div className="rounded-xl bg-gray-200" style={{ aspectRatio: '3/4' }} /><div className="h-3 bg-gray-200 rounded mt-2 mx-4" /></div>)}
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-semibold mb-1">
                      {userTemplates.length === 0 ? 'No templates yet' : selectedFolderId ? 'No templates in this folder' : 'No results for your search'}
                    </p>
                    <p className="text-sm text-gray-500 mb-5">
                      {userTemplates.length === 0 ? 'Start by creating a template in the Library tab.' : selectedFolderId ? 'Move templates here or create a new one.' : 'Try a different search term.'}
                    </p>
                    {userTemplates.length === 0 && (
                      <button onClick={() => setTab('library')} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors mx-auto">
                        <Plus className="w-4 h-4" /> Go to Library
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    {filteredTemplates.map(t => (
                      <TemplateCard key={t.id} template={t} folders={folders} onPreview={setPreviewTpl} onDelete={deleteTemplate} onMoveToFolder={moveToFolder} />
                    ))}
                    <button
                      onClick={() => setShowCreate(true)}
                      className="flex flex-col items-center justify-center h-[220px] border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl transition-colors group"
                    >
                      <div className="w-12 h-12 bg-gray-100 group-hover:bg-blue-50 rounded-xl flex items-center justify-center mb-2 transition-colors">
                        <Plus className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <span className="text-xs font-semibold text-gray-400 group-hover:text-blue-600 transition-colors">New Template</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── GROUPS TAB ── */}
          {tab === 'groups' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 text-sm text-blue-700">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                <span>Groups let you schedule multiple templates to send on different dates — perfect for drip campaigns that look fresh each time.</span>
              </div>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => <div key={i} className="bg-gray-50 rounded-xl p-5 animate-pulse h-36" />)}
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <LayersIcon className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-gray-900 font-semibold mb-1">No groups yet</p>
                  <p className="text-sm text-gray-500 mb-5">Create a group to organize templates into a drip schedule.</p>
                  <Link href="/templates/groups/new">
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors mx-auto">
                      <Plus className="w-4 h-4" /> Create first group
                    </button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex justify-end">
                    <Link href="/templates/groups/new">
                      <button className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors">
                        <Plus className="w-4 h-4" /> New Group
                      </button>
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredGroups.map(g => (
                      <div key={g.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-card-hover hover:border-gray-300 transition-all group flex flex-col gap-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm">{g.name}</h3>
                            {g.description && <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/templates/groups/${g.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"><Edit2 className="w-3.5 h-3.5" /></Link>
                            <button onClick={() => deleteGroup(g.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gray-400" />{g.item_count} scheduled</span>
                          <span className="flex items-center gap-1"><Send className="w-3.5 h-3.5 text-gray-400" />{g.sent_count} sent</span>
                        </div>
                        {g.list_name && <p className="text-xs text-gray-500">List: <span className="font-semibold text-gray-700">{g.list_name}</span></p>}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${g.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{g.status}</span>
                          <Link href={`/templates/groups/${g.id}`} className="text-xs text-blue-600 hover:text-blue-700 font-semibold">Manage →</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create from blank modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Template — Visual Builder" size="sm">
        <div className="space-y-4">
          <Input label="Template Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Monthly Newsletter" autoFocus />
          <Input label="Default Subject (optional)" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Enter subject line" />
          <div className="flex gap-2 pt-1">
            <button onClick={createTemplate} disabled={!form.name.trim()} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
              Create & Edit
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Create folder modal */}
      <Modal open={showFolderCreate} onClose={() => setShowFolderCreate(false)} title="New Folder" size="sm">
        <div className="space-y-4">
          <Input label="Folder Name *" value={folderForm.name} onChange={e => setFolderForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Newsletters" autoFocus />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {FOLDER_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setFolderForm(f => ({ ...f, color: c.value }))}
                  className={`w-7 h-7 rounded-full transition-all ${folderForm.color === c.value ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={createFolder} disabled={!folderForm.name.trim()} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
              Create Folder
            </button>
            <button onClick={() => setShowFolderCreate(false)} className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Paste HTML modal */}
      <Modal open={showPasteHtml} onClose={() => setShowPasteHtml(false)} title="Paste HTML Code" size="lg">
        <div className="space-y-4">
          <Input label="Template Name *" value={pasteName} onChange={e => setPasteName(e.target.value)} placeholder="e.g., Custom HTML Email" autoFocus />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">HTML Code *</label>
            <textarea
              value={pasteHtml}
              onChange={e => setPasteHtml(e.target.value)}
              placeholder="Paste your full HTML email code here…"
              className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              rows={14}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={createFromHtml} disabled={!pasteName.trim() || !pasteHtml.trim()} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
              Save Template
            </button>
            <button onClick={() => setShowPasteHtml(false)} className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
