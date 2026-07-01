'use client'

import { useEffect, useState } from 'react'
import { Toast } from '@/components/ui'
import Link from 'next/link'
import { Search, CheckCircle, ChevronRight, X, Eye, EyeOff, Loader, RefreshCw, Download, AlertTriangle, Zap } from 'lucide-react'

// ─── Integration definitions ──────────────────────────────────────────────────
const INTEGRATIONS = [
  {
    id: 'zerobounce',
    name: 'ZeroBounce',
    description: 'Validate email addresses to remove invalid contacts, reduce bounce rates, and improve deliverability.',
    category: 'Email Validation',
    color: '#00C2A8',
    textColor: '#fff',
    logo: 'ZB',
    bg: 'linear-gradient(135deg, #00C2A8 0%, #00A896 100%)',
  },
  {
    id: 'monday',
    name: 'Monday.com',
    description: 'Import contacts and leads directly from your Monday.com boards into your email lists.',
    category: 'CRM & Project Management',
    color: '#F62B54',
    textColor: '#fff',
    logo: 'Mo',
    bg: 'linear-gradient(135deg, #F62B54 0%, #FF6B35 100%)',
  },
] as const

type IntegrationId = typeof INTEGRATIONS[number]['id']

const CATEGORIES = ['All integrations', 'Email Validation', 'CRM & Project Management']

// ─── ZeroBounce panel ─────────────────────────────────────────────────────────
function ZeroBouncePanelContent({ apiKey, onSave, onDisconnect }: {
  apiKey: string; onSave: (k: string) => Promise<void>; onDisconnect: () => Promise<void>
}) {
  const [key, setKey] = useState(apiKey)
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [credits, setCredits] = useState<number | null>(null)
  const [creditsLoading, setCreditsLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<{ validated: number; valid: number; invalid: number; unknown: number } | null>(null)
  const [lists, setLists] = useState<{ id: string; name: string }[]>([])
  const [selectedList, setSelectedList] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/lists').then(r => r.json()).then(d => setLists(Array.isArray(d) ? d : d.lists || []))
    if (apiKey) fetchCredits()
  }, [])

  async function fetchCredits() {
    setCreditsLoading(true)
    const res = await fetch('/api/integrations/zerobounce')
    if (res.ok) { const d = await res.json(); setCredits(d.credits) }
    else setCredits(null)
    setCreditsLoading(false)
  }

  async function save() {
    if (!key.trim()) return
    setSaving(true); setError('')
    await onSave(key.trim())
    setSaving(false)
    fetchCredits()
  }

  async function validate() {
    setValidating(true); setResult(null); setError('')
    const res = await fetch('/api/integrations/zerobounce', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list_id: selectedList || undefined }),
    })
    const d = await res.json()
    if (!res.ok) setError(d.error || 'Validation failed')
    else setResult(d)
    setValidating(false)
  }

  const isConnected = !!apiKey

  return (
    <div className="space-y-5">
      {/* API key */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">ZeroBounce API Key</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={show ? 'text' : 'password'}
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="Your ZeroBounce API key"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 bg-gray-50 focus:bg-white transition-all"
            />
            <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={save} disabled={saving || !key.trim()} className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : isConnected ? 'Update' : 'Connect'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Find your API key at app.zerobounce.net → API</p>
      </div>

      {/* Credits */}
      {isConnected && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide">Available Credits</p>
            <p className="text-2xl font-bold text-teal-700 mt-0.5">
              {creditsLoading ? '…' : credits !== null ? credits.toLocaleString() : '—'}
            </p>
          </div>
          <button onClick={fetchCredits} className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Validate contacts */}
      {isConnected && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-800">Validate contact emails</p>
          <p className="text-xs text-gray-500">Sends emails to ZeroBounce for validation. Invalid emails will be marked as <strong>bounced</strong>.</p>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Validate contacts from</label>
            <select
              value={selectedList}
              onChange={e => setSelectedList(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
            >
              <option value="">All contacts (subscribed)</option>
              {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <button
            onClick={validate}
            disabled={validating}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {validating ? <><Loader className="w-4 h-4 animate-spin" /> Validating…</> : 'Run Email Validation'}
          </button>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          {result && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Validation Results</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Validated', value: result.validated, color: 'text-gray-800' },
                  { label: 'Valid', value: result.valid, color: 'text-green-600' },
                  { label: 'Invalid (marked bounced)', value: result.invalid, color: 'text-red-600' },
                  { label: 'Unknown / Catch-all', value: result.unknown, color: 'text-amber-600' },
                ].map(r => (
                  <div key={r.label} className="text-center">
                    <p className={`text-xl font-bold ${r.color}`}>{r.value.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-tight">{r.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disconnect */}
      {isConnected && (
        <button
          onClick={async () => { if (confirm('Disconnect ZeroBounce?')) await onDisconnect() }}
          className="text-sm text-red-500 hover:text-red-700 hover:underline"
        >
          Disconnect ZeroBounce
        </button>
      )}
    </div>
  )
}

// ─── Monday.com panel ─────────────────────────────────────────────────────────
function MondayPanelContent({ apiKey, onSave, onDisconnect }: {
  apiKey: string; onSave: (k: string) => Promise<void>; onDisconnect: () => Promise<void>
}) {
  const [key, setKey] = useState(apiKey)
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [boards, setBoards] = useState<{ id: string; name: string; description: string | null }[]>([])
  const [boardsLoading, setBoardsLoading] = useState(false)
  const [selectedBoard, setSelectedBoard] = useState('')
  const [selectedList, setSelectedList] = useState('')
  const [lists, setLists] = useState<{ id: string; name: string }[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; updated: number; skipped: number; total: number } | null>(null)
  const [error, setError] = useState('')

  const isConnected = !!apiKey

  useEffect(() => {
    fetch('/api/lists').then(r => r.json()).then(d => setLists(Array.isArray(d) ? d : d.lists || []))
    if (isConnected) fetchBoards()
  }, [])

  async function fetchBoards() {
    setBoardsLoading(true)
    const res = await fetch('/api/integrations/monday')
    if (res.ok) { const d = await res.json(); setBoards(d.boards || []) }
    setBoardsLoading(false)
  }

  async function save() {
    if (!key.trim()) return
    setSaving(true); setError('')
    await onSave(key.trim())
    setSaving(false)
    fetchBoards()
  }

  async function importContacts() {
    if (!selectedBoard) { setError('Please select a board'); return }
    setImporting(true); setResult(null); setError('')
    const res = await fetch('/api/integrations/monday', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board_id: selectedBoard, list_id: selectedList || undefined }),
    })
    const d = await res.json()
    if (!res.ok) setError(d.error || 'Import failed')
    else setResult(d)
    setImporting(false)
  }

  return (
    <div className="space-y-5">
      {/* API key */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">Monday.com API Token</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={show ? 'text' : 'password'}
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="Your Monday.com API token"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 bg-gray-50 focus:bg-white transition-all"
            />
            <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={save} disabled={saving || !key.trim()} className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : isConnected ? 'Update' : 'Connect'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Get your API token from Monday.com → Profile → Developers → My Access Tokens</p>
      </div>

      {/* Board selector + import */}
      {isConnected && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Import contacts from board</p>
            <button onClick={fetchBoards} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${boardsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-gray-500">Contacts are imported from items with an email column. Existing contacts are updated, not duplicated.</p>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Select a board *</label>
            <select
              value={selectedBoard}
              onChange={e => setSelectedBoard(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
            >
              <option value="">— Select board —</option>
              {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {boardsLoading && <p className="text-xs text-gray-400 mt-1">Loading boards…</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Also add to list (optional)</label>
            <select
              value={selectedList}
              onChange={e => setSelectedList(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
            >
              <option value="">Don't add to a list</option>
              {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <button
            onClick={importContacts}
            disabled={importing || !selectedBoard}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {importing ? <><Loader className="w-4 h-4 animate-spin" /> Importing…</> : <><Download className="w-4 h-4" /> Import Contacts</>}
          </button>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          {result && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Import Results</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total items', value: result.total, color: 'text-gray-800' },
                  { label: 'New contacts', value: result.imported, color: 'text-green-600' },
                  { label: 'Updated', value: result.updated, color: 'text-blue-600' },
                  { label: 'Skipped (no email)', value: result.skipped, color: 'text-amber-600' },
                ].map(r => (
                  <div key={r.label} className="text-center">
                    <p className={`text-xl font-bold ${r.color}`}>{r.value.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-tight">{r.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recipes / Automations */}
      {isConnected && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
          <div>
            <p className="text-sm font-semibold text-gray-800">Automation Recipes</p>
            <p className="text-xs text-gray-500 mt-0.5">Automatically manage contacts when Monday.com column values change — like Zapier, built right in.</p>
          </div>
          <Link href="/integrations/monday-recipes"
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-red-400 hover:bg-red-50 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F62B54, #FF6B35)' }}>
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 group-hover:text-red-600 transition-colors">Manage Recipes</p>
                <p className="text-xs text-gray-400">Create trigger-based automations</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
          </Link>
        </div>
      )}

      {/* Disconnect */}
      {isConnected && (
        <button
          onClick={async () => { if (confirm('Disconnect Monday.com?')) await onDisconnect() }}
          className="text-sm text-red-500 hover:text-red-700 hover:underline"
        >
          Disconnect Monday.com
        </button>
      )}
    </div>
  )
}

// ─── Slide-out panel ──────────────────────────────────────────────────────────
function IntegrationPanel({ integration, apiKey, onClose, onSave, onDisconnect }: {
  integration: typeof INTEGRATIONS[number]; apiKey: string
  onClose: () => void; onSave: (k: string) => Promise<void>; onDisconnect: () => Promise<void>
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto w-[440px] bg-white shadow-2xl h-full flex flex-col border-l border-gray-200">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: integration.bg }}>
            {integration.logo}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{integration.name}</h2>
              {!!apiKey && (
                <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" /> Connected
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{integration.category}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="text-sm text-gray-600 mb-5 leading-relaxed">{integration.description}</p>
          {integration.id === 'zerobounce' && (
            <ZeroBouncePanelContent apiKey={apiKey} onSave={onSave} onDisconnect={onDisconnect} />
          )}
          {integration.id === 'monday' && (
            <MondayPanelContent apiKey={apiKey} onSave={onSave} onDisconnect={onDisconnect} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Integration card ─────────────────────────────────────────────────────────
function IntegrationCard({ integration, connected, onClick }: {
  integration: typeof INTEGRATIONS[number]; connected: boolean; onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group"
    >
      {/* Logo area */}
      <div className="h-36 flex items-center justify-center" style={{ background: integration.bg }}>
        <span className="text-white font-black text-5xl tracking-tight opacity-90">{integration.logo}</span>
      </div>
      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{integration.name}</h3>
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5 group-hover:text-blue-600 transition-colors" />
        </div>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{integration.description}</p>
        {connected && (
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-green-700">
            <CheckCircle className="w-3.5 h-3.5" /> Connected
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const [tab, setTab] = useState<'all' | 'connected'>('all')
  const [category, setCategory] = useState('All integrations')
  const [search, setSearch] = useState('')
  const [keys, setKeys] = useState<Record<string, string>>({ zerobounce: '', monday: '' })
  const [activePanel, setActivePanel] = useState<IntegrationId | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetch('/api/integrations').then(r => r.json()).then(d => {
      setKeys({ zerobounce: d.zerobounce?.api_key || '', monday: d.monday?.api_key || '' })
      setLoading(false)
    })
  }, [])

  async function saveKey(integration: string, key: string) {
    const res = await fetch('/api/integrations', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ integration, api_key: key }),
    })
    if (res.ok) {
      setKeys(prev => ({ ...prev, [integration]: key }))
      setToast({ msg: `${integration === 'zerobounce' ? 'ZeroBounce' : 'Monday.com'} connected!`, type: 'success' })
    } else {
      setToast({ msg: 'Failed to save', type: 'error' })
    }
  }

  async function disconnect(integration: string) {
    await saveKey(integration, '')
    setToast({ msg: `${integration === 'zerobounce' ? 'ZeroBounce' : 'Monday.com'} disconnected`, type: 'success' })
  }

  const filtered = INTEGRATIONS.filter(i => {
    if (tab === 'connected' && !keys[i.id]) return false
    if (category !== 'All integrations' && i.category !== category) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const connectedCount = INTEGRATIONS.filter(i => keys[i.id]).length
  const activeIntegration = INTEGRATIONS.find(i => i.id === activePanel)

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Panel */}
      {activePanel && activeIntegration && (
        <IntegrationPanel
          integration={activeIntegration}
          apiKey={keys[activePanel] || ''}
          onClose={() => setActivePanel(null)}
          onSave={async (k) => { await saveKey(activePanel, k) }}
          onDisconnect={async () => { await disconnect(activePanel); setActivePanel(null) }}
        />
      )}

      {/* Tabs */}
      <div className="flex items-center gap-6 mb-6 border-b border-gray-200">
        {([['all', 'All integrations'], ['connected', `Connected integrations ${connectedCount > 0 ? `(${connectedCount})` : ''}`]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">Categories</p>
          <div className="space-y-0.5">
            {CATEGORIES.map(cat => {
              const count = cat === 'All integrations'
                ? INTEGRATIONS.length
                : INTEGRATIONS.filter(i => i.category === cat).length
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    category === cat ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{cat}</span>
                  <span className="text-xs text-gray-400">{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Search bar */}
          <div className="flex items-center gap-3 mb-5">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="pl-9 pr-3 py-2 w-full border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                placeholder="Search for an integration"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {[1, 2].map(i => (
                <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden animate-pulse">
                  <div className="h-36 bg-gray-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                    <div className="h-3 bg-gray-100 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <AlertTriangle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">{tab === 'connected' ? 'No connected integrations' : 'No integrations found'}</p>
              <p className="text-sm text-gray-400 mt-1">
                {tab === 'connected' ? 'Connect an integration from the All integrations tab.' : 'Try a different search or category.'}
              </p>
            </div>
          ) : (
            <>
              {/* Featured section — show when not filtered */}
              {category === 'All integrations' && !search && (
                <div className="mb-6">
                  <h2 className="text-base font-bold text-gray-900 mb-3">Featured</h2>
                  <div className="grid grid-cols-3 gap-4">
                    {filtered.map(integration => (
                      <IntegrationCard
                        key={integration.id}
                        integration={integration}
                        connected={!!keys[integration.id]}
                        onClick={() => setActivePanel(integration.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Filtered results */}
              {(category !== 'All integrations' || search) && (
                <div className="grid grid-cols-3 gap-4">
                  {filtered.map(integration => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      connected={!!keys[integration.id]}
                      onClick={() => setActivePanel(integration.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
