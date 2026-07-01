'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Toast } from '@/components/ui'
import {
  ArrowLeft, Play, Pause, Save, Plus, Trash2, ChevronUp, ChevronDown,
  Zap, Filter, UserPlus, ListPlus, ListMinus, UserCog, Clock, Copy,
  CheckCircle, AlertCircle, RefreshCw, ExternalLink, X,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MStep {
  id: string
  type: string
  config: Record<string, unknown>
}

interface Board { id: string; name: string }
interface Column { id: string; title: string; type: string }
interface MList { id: string; name: string; contact_count: number }

interface Recipe {
  id: string; name: string; status: string
  trigger_board_id: string; trigger_board_name: string | null
  trigger_column_id: string; trigger_column_name: string | null
  trigger_value: string | null; steps: string; webhook_id: string | null
  runs?: Array<{ id: string; status: string; trigger_email: string | null; trigger_item: string | null; run_log: string; created_at: string }>
}

// ─── Step metadata ────────────────────────────────────────────────────────────

const STEP_META: Record<string, { label: string; short: string; color: string; Icon: React.ElementType }> = {
  filter:                { label: 'Filter',                   short: 'Filter conditions',     color: 'bg-amber-500',  Icon: Filter },
  find_or_create_contact:{ label: 'Find or Create Contact',   short: 'Find/create contact',   color: 'bg-green-500',  Icon: UserPlus },
  create_contact:        { label: 'Create Contact',           short: 'Create new contact',    color: 'bg-emerald-500',Icon: UserPlus },
  add_to_list:           { label: 'Add Contact to List',      short: 'Add to lists',          color: 'bg-blue-500',   Icon: ListPlus },
  remove_from_list:      { label: 'Remove Contact from List', short: 'Remove from lists',     color: 'bg-orange-500', Icon: ListMinus },
  update_contact:        { label: 'Update Contact',           short: 'Update contact fields', color: 'bg-purple-500', Icon: UserCog },
  delay:                 { label: 'Delay',                    short: 'Wait before next step', color: 'bg-slate-500',  Icon: Clock },
}

const STEP_ORDER = Object.keys(STEP_META)

// ─── Step summary (compact description for left panel card) ──────────────────

function stepSummaryText(step: MStep, lists: MList[]): string {
  const c = step.config
  switch (step.type) {
    case 'filter': {
      const ops: Record<string, string> = { not_empty: 'is not empty', is_empty: 'is empty', equals: `= "${c.value}"`, not_equals: `≠ "${c.value}"`, contains: `contains "${c.value}"`, not_contains: `doesn't contain "${c.value}"` }
      return `Column value ${ops[c.operator as string] || (c.operator as string)}`
    }
    case 'find_or_create_contact': return `Email from ${c.email_source === 'item_name' ? 'item name' : 'column value'}`
    case 'create_contact': return 'Email from column value'
    case 'add_to_list':
    case 'remove_from_list': {
      const ids = (c.list_ids as string[]) || []
      if (!ids.length) return 'No lists selected'
      const names = ids.map(id => lists.find(l => l.id === id)?.name || id)
      return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ')
    }
    case 'update_contact': {
      const parts: string[] = []
      if (c.first_name_source === 'item_name_first') parts.push('first name')
      if (c.last_name_source === 'item_name_last') parts.push('last name')
      return parts.length ? `Update ${parts.join(' & ')} from item name` : 'No fields configured'
    }
    case 'delay': return `Wait ${c.hours || 0} hour${c.hours !== 1 ? 's' : ''}`
    default: return ''
  }
}

// ─── Left panel: step card ───────────────────────────────────────────────────

function StepCard({ step, index, total, selected, onClick, onDelete, onMoveUp, onMoveDown, lists }: {
  step: MStep; index: number; total: number; selected: boolean
  onClick: () => void; onDelete: () => void
  onMoveUp: () => void; onMoveDown: () => void
  lists: MList[]
}) {
  const meta = STEP_META[step.type]
  if (!meta) return null
  const { Icon } = meta
  return (
    <div className="relative">
      <div
        onClick={onClick}
        className={`mx-4 rounded-xl border cursor-pointer transition-all group ${selected ? 'border-red-400 bg-red-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}
      >
        <div className="flex items-center gap-3 p-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-800 truncate">{index + 1}. {meta.label}</p>
            <p className="text-[11px] text-gray-400 truncate mt-0.5">{stepSummaryText(step, lists)}</p>
          </div>
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button onClick={e => { e.stopPropagation(); onMoveUp() }} disabled={index === 0}
              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded">
              <ChevronUp className="w-3 h-3" />
            </button>
            <button onClick={e => { e.stopPropagation(); onMoveDown() }} disabled={index === total - 1}
              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded">
              <ChevronDown className="w-3 h-3" />
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete() }}
              className="p-1 text-red-400 hover:text-red-600 rounded">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
      {/* Connector line */}
      <div className="mx-auto w-px h-4 bg-gray-200" />
    </div>
  )
}

// ─── Right panel: config UIs ──────────────────────────────────────────────────

function TriggerConfig({ triggerBoardId, triggerBoardName, triggerColumnId, triggerColumnName, triggerValue, boards, columns, columnsLoading, onBoardChange, onColumnChange, onValueChange, webhookId, status, onToggle, saving }: {
  triggerBoardId: string; triggerBoardName: string
  triggerColumnId: string; triggerColumnName: string
  triggerValue: string
  boards: Board[]; columns: Column[]; columnsLoading: boolean
  onBoardChange: (id: string, name: string) => void
  onColumnChange: (id: string, name: string) => void
  onValueChange: (v: string) => void
  webhookId: string | null; status: string; onToggle: () => void; saving: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F62B54 0%, #FF6B35 100%)' }}>
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900">Trigger: Monday.com</h2>
          <p className="text-sm text-gray-500">Specific Column Value Changed in Board</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Board <span className="text-red-500">*</span></label>
          <select
            value={triggerBoardId}
            onChange={e => { const b = boards.find(x => x.id === e.target.value); onBoardChange(e.target.value, b?.name || '') }}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
          >
            <option value="">— Select a board —</option>
            {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {!boards.length && <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Connect Monday.com in Integrations to see boards</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Column <span className="text-red-500">*</span></label>
          <select
            value={triggerColumnId}
            onChange={e => { const c = columns.find(x => x.id === e.target.value); onColumnChange(e.target.value, c?.title || '') }}
            disabled={!triggerBoardId || columnsLoading}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all disabled:opacity-60"
          >
            <option value="">— {columnsLoading ? 'Loading columns…' : 'Select a column'} —</option>
            {columns.map(c => <option key={c.id} value={c.id}>{c.title} ({c.type})</option>)}
          </select>
          {triggerBoardId && !columnsLoading && !columns.length && (
            <p className="text-xs text-gray-400 mt-1">No columns found for this board</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Only trigger when value contains (optional)</label>
          <input
            type="text" value={triggerValue}
            onChange={e => onValueChange(e.target.value)}
            placeholder="Leave blank to trigger on any change"
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
          />
          <p className="text-xs text-gray-400 mt-1">e.g. "valid" to only trigger when the column text contains "valid"</p>
        </div>
      </div>

      {/* Webhook status */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
        <p className="text-sm font-semibold text-gray-700">Webhook Status</p>
        {webhookId ? (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>Webhook registered in Monday.com (ID: {webhookId})</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
            <span>Webhook not yet registered. Activate this recipe to register it automatically.</span>
          </div>
        )}
        <button onClick={onToggle} disabled={saving}
          className={`w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-colors ${status === 'active' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {saving ? 'Saving…' : status === 'active' ? 'Pause Recipe' : 'Activate Recipe'}
        </button>
      </div>
    </div>
  )
}

function FilterConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const op = (config.operator as string) || 'not_empty'
  const val = (config.value as string) || ''
  const showValue = !['not_empty', 'is_empty'].includes(op)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
          <Filter className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900">Filter Conditions</h2>
          <p className="text-sm text-gray-500">Only continue if the condition is met</p>
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Condition</label>
        <select value={op} onChange={e => onChange({ ...config, operator: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400">
          <option value="not_empty">Column value is not empty</option>
          <option value="is_empty">Column value is empty</option>
          <option value="equals">Column value equals</option>
          <option value="not_equals">Column value does not equal</option>
          <option value="contains">Column value contains</option>
          <option value="not_contains">Column value does not contain</option>
        </select>
      </div>
      {showValue && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Value to compare</label>
          <input type="text" value={val} onChange={e => onChange({ ...config, value: e.target.value })}
            placeholder="Enter comparison value…"
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400" />
        </div>
      )}
    </div>
  )
}

function ContactSourceConfig({ config, onChange, title, color, Icon }: {
  config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void
  title: string; color: string; Icon: React.ElementType
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">Map Monday.com data to contact fields</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email source <span className="text-red-500">*</span></label>
        <select value={(config.email_source as string) || 'column_value'}
          onChange={e => onChange({ ...config, email_source: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400">
          <option value="column_value">Triggering column value (the changed column)</option>
          <option value="item_name">Board item name</option>
        </select>
        <p className="text-xs text-gray-400 mt-1">For email columns, "column value" will use the email address directly.</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">First name</label>
        <select value={(config.first_name_source as string) || 'item_name_first'}
          onChange={e => onChange({ ...config, first_name_source: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400">
          <option value="item_name_first">From item name (first word)</option>
          <option value="none">Don't set</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Last name</label>
        <select value={(config.last_name_source as string) || 'item_name_last'}
          onChange={e => onChange({ ...config, last_name_source: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400">
          <option value="item_name_last">From item name (remaining words)</option>
          <option value="none">Don't set</option>
        </select>
      </div>
    </div>
  )
}

function ListStepConfig({ config, onChange, lists, title, color, Icon, description }: {
  config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void
  lists: MList[]; title: string; color: string; Icon: React.ElementType; description: string
}) {
  const selectedIds = (config.list_ids as string[]) || []
  const toggle = (id: string) => {
    const next = selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]
    onChange({ ...config, list_ids: next })
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-700">
        Uses the contact found by a "Find or Create Contact" or "Create Contact" step earlier in the recipe.
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Select lists <span className="text-red-500">*</span></label>
        {lists.length === 0 ? (
          <p className="text-sm text-gray-400">No lists found. <a href="/lists" className="text-blue-600 hover:underline">Create a list first.</a></p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {lists.map(l => (
              <label key={l.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedIds.includes(l.id) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                <input type="checkbox" checked={selectedIds.includes(l.id)} onChange={() => toggle(l.id)} className="rounded text-blue-600 w-4 h-4 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{l.name}</p>
                  <p className="text-xs text-gray-400">{(l.contact_count || 0).toLocaleString()} contacts</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function UpdateContactConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
          <UserCog className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900">Update Contact</h2>
          <p className="text-sm text-gray-500">Update contact fields from Monday.com item data</p>
        </div>
      </div>
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-700">
        Uses the contact found by a "Find or Create Contact" step earlier in the recipe.
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">First name</label>
        <select value={(config.first_name_source as string) || 'none'}
          onChange={e => onChange({ ...config, first_name_source: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400">
          <option value="item_name_first">Update from item name (first word)</option>
          <option value="none">Don't update</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Last name</label>
        <select value={(config.last_name_source as string) || 'none'}
          onChange={e => onChange({ ...config, last_name_source: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400">
          <option value="item_name_last">Update from item name (remaining words)</option>
          <option value="none">Don't update</option>
        </select>
      </div>
    </div>
  )
}

function DelayConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="w-10 h-10 bg-slate-500 rounded-xl flex items-center justify-center">
          <Clock className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900">Delay</h2>
          <p className="text-sm text-gray-500">Wait before continuing to the next step</p>
        </div>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700">
        Note: In the current version, delays run synchronously and don't actually pause execution. True async delays will be added in a future update.
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Wait duration</label>
        <div className="flex gap-2">
          <input type="number" min={1} value={(config.hours as number) || 24}
            onChange={e => onChange({ ...config, hours: parseInt(e.target.value) || 24 })}
            className="w-24 text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400" />
          <span className="flex items-center text-sm text-gray-600">hours</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RecipeBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [name, setName] = useState('Untitled Recipe')
  const [status, setStatus] = useState<'active' | 'paused'>('paused')
  const [triggerBoardId, setTriggerBoardId] = useState('')
  const [triggerBoardName, setTriggerBoardName] = useState('')
  const [triggerColumnId, setTriggerColumnId] = useState('')
  const [triggerColumnName, setTriggerColumnName] = useState('')
  const [triggerValue, setTriggerValue] = useState('')
  const [steps, setSteps] = useState<MStep[]>([])
  const [webhookId, setWebhookId] = useState<string | null>(null)

  const [boards, setBoards] = useState<Board[]>([])
  const [columns, setColumns] = useState<Column[]>([])
  const [columnsLoading, setColumnsLoading] = useState(false)
  const [lists, setLists] = useState<MList[]>([])

  const [selected, setSelected] = useState<string>('trigger')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAddStep, setShowAddStep] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [runs, setRuns] = useState<Recipe['runs']>([])
  const [showRuns, setShowRuns] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')

  // Set webhook URL from browser location
  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/webhooks/monday`)
  }, [])

  // Load recipe + boards + lists
  useEffect(() => {
    const p: Promise<unknown>[] = [
      fetch('/api/integrations/monday').then(r => r.json()).then(d => { if (d.boards) setBoards(d.boards) }).catch(() => {}),
      fetch('/api/lists').then(r => r.json()).then(d => { setLists(Array.isArray(d) ? d : d.lists || []) }).catch(() => {}),
    ]
    if (id !== 'new') {
      p.push(fetch(`/api/integrations/monday/recipes/${id}`).then(r => r.json()).then((d: Recipe & { runs?: Recipe['runs'] }) => {
        if (d.id) {
          setName(d.name)
          setStatus(d.status as 'active' | 'paused')
          setTriggerBoardId(d.trigger_board_id || '')
          setTriggerBoardName(d.trigger_board_name || '')
          setTriggerColumnId(d.trigger_column_id || '')
          setTriggerColumnName(d.trigger_column_name || '')
          setTriggerValue(d.trigger_value || '')
          setSteps(JSON.parse(d.steps || '[]'))
          setWebhookId(d.webhook_id)
          setRuns(d.runs || [])
          return d.trigger_board_id || ''
        }
        return ''
      }).catch(() => { router.push('/integrations/monday-recipes') }))
    }
    Promise.all(p).then(results => {
      setLoading(false)
      // If we got a board ID from the recipe, load columns
      const boardId = results[2] as string | undefined
      if (boardId) loadColumns(boardId)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadColumns = useCallback(async (boardId: string) => {
    if (!boardId) { setColumns([]); return }
    setColumnsLoading(true)
    const res = await fetch(`/api/integrations/monday?columns=${boardId}`)
    const d = await res.json()
    setColumns(d.columns || [])
    setColumnsLoading(false)
  }, [])

  function handleBoardChange(bid: string, bname: string) {
    setTriggerBoardId(bid); setTriggerBoardName(bname)
    setTriggerColumnId(''); setTriggerColumnName('')
    setColumns([])
    if (bid) loadColumns(bid)
  }

  function handleColumnChange(cid: string, cname: string) {
    setTriggerColumnId(cid); setTriggerColumnName(cname)
  }

  async function save(newStatus?: 'active' | 'paused') {
    setSaving(true)
    const body = {
      name, status: newStatus ?? status,
      trigger_board_id: triggerBoardId, trigger_board_name: triggerBoardName,
      trigger_column_id: triggerColumnId, trigger_column_name: triggerColumnName,
      trigger_value: triggerValue || null, steps,
    }

    let url = `/api/integrations/monday/recipes/${id}`
    let method = 'PUT'
    if (id === 'new') {
      const createRes = await fetch('/api/integrations/monday/recipes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const created = await createRes.json()
      if (!created.id) { setToast({ msg: 'Failed to create recipe', type: 'error' }); setSaving(false); return }
      url = `/api/integrations/monday/recipes/${created.id}`
      method = 'PUT'
      router.replace(`/integrations/monday-recipes/${created.id}`)
    }

    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const d = await res.json()
    setSaving(false)
    if (d.ok) {
      if (newStatus) setStatus(newStatus)
      if (d.webhook_id !== undefined) setWebhookId(d.webhook_id)
      setToast({ msg: d.webhook_id ? 'Recipe saved & webhook registered!' : 'Recipe saved', type: 'success' })
    } else {
      setToast({ msg: d.error || 'Save failed', type: 'error' })
    }
  }

  function toggleStatus() {
    const next = status === 'active' ? 'paused' : 'active'
    save(next)
  }

  function addStep(type: string) {
    const defaults: Record<string, Record<string, unknown>> = {
      filter: { operator: 'not_empty', value: '' },
      find_or_create_contact: { email_source: 'column_value', first_name_source: 'item_name_first', last_name_source: 'item_name_last' },
      create_contact: { email_source: 'column_value', first_name_source: 'item_name_first', last_name_source: 'item_name_last' },
      add_to_list: { list_ids: [] },
      remove_from_list: { list_ids: [] },
      update_contact: { first_name_source: 'none', last_name_source: 'none' },
      delay: { hours: 24 },
    }
    const newStep: MStep = { id: crypto.randomUUID(), type, config: defaults[type] || {} }
    setSteps(s => [...s, newStep])
    setSelected(newStep.id)
    setShowAddStep(false)
  }

  function updateStepConfig(stepId: string, config: Record<string, unknown>) {
    setSteps(s => s.map(st => st.id === stepId ? { ...st, config } : st))
  }

  function deleteStep(stepId: string) {
    setSteps(s => s.filter(st => st.id !== stepId))
    if (selected === stepId) setSelected('trigger')
  }

  function moveStep(index: number, dir: -1 | 1) {
    setSteps(s => {
      const next = [...s]
      const tmp = next[index]; next[index] = next[index + dir]; next[index + dir] = tmp
      return next
    })
  }

  const selectedStep = steps.find(s => s.id === selected)

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0 gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link href="/integrations/monday-recipes" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="text-base font-bold text-gray-900 bg-transparent focus:outline-none border-b-2 border-transparent focus:border-red-400 px-1 min-w-0 flex-1 max-w-xs"
          />
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {status === 'active' ? 'Active' : 'Paused'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={toggleStatus} disabled={saving}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${status === 'active' ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}>
            {status === 'active' ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Activate</>}
          </button>
          <button onClick={() => save()} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors">
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Step list ── */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pt-4 pb-2">
            {/* Trigger card */}
            <div className="mx-4 mb-0">
              <div
                onClick={() => setSelected('trigger')}
                className={`rounded-xl border cursor-pointer transition-all ${selected === 'trigger' ? 'border-red-400 bg-red-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}
              >
                <div className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F62B54, #FF6B35)' }}>
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800">1. Monday.com Trigger</p>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">
                      {triggerColumnName && triggerBoardName
                        ? `${triggerColumnName} changes in ${triggerBoardName}`
                        : 'Configure board & column'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mx-auto w-px h-4 bg-gray-200" />
            </div>

            {/* Action steps */}
            {steps.map((step, i) => (
              <StepCard
                key={step.id}
                step={step} index={i} total={steps.length}
                selected={selected === step.id}
                onClick={() => setSelected(step.id)}
                onDelete={() => deleteStep(step.id)}
                onMoveUp={() => { if (i > 0) moveStep(i, -1) }}
                onMoveDown={() => { if (i < steps.length - 1) moveStep(i, 1) }}
                lists={lists}
              />
            ))}

            {/* Add step button */}
            <div className="mx-4 relative">
              <button onClick={() => setShowAddStep(v => !v)}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition-all">
                <Plus className="w-4 h-4" /> Add Step
              </button>
              {showAddStep && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-20 py-1 max-h-64 overflow-y-auto">
                  {STEP_ORDER.map(type => {
                    const meta = STEP_META[type]
                    const { Icon } = meta
                    return (
                      <button key={type} onClick={() => addStep(type)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                          <Icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{meta.label}</p>
                          <p className="text-xs text-gray-400">{meta.short}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom: webhook info + run history toggle */}
          <div className="border-t border-gray-100 px-4 py-3 space-y-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Webhook URL</p>
              <button onClick={() => { navigator.clipboard.writeText(webhookUrl); setToast({ msg: 'Copied!', type: 'success' }) }}
                className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors">
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 font-mono break-all leading-relaxed">{webhookUrl || 'https://your-app.com/api/webhooks/monday'}</p>
            {runs && runs.length > 0 && (
              <button onClick={() => setShowRuns(v => !v)}
                className="text-[11px] text-blue-600 hover:underline">
                {showRuns ? 'Hide' : 'Show'} run history ({runs.length})
              </button>
            )}
          </div>
        </div>

        {/* ── Right: Configuration panel ── */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-lg mx-auto p-6 space-y-6">
            {/* Click-away to close add-step dropdown */}
            {showAddStep && <div className="fixed inset-0 z-10" onClick={() => setShowAddStep(false)} />}

            {/* Config content */}
            {selected === 'trigger' ? (
              <TriggerConfig
                triggerBoardId={triggerBoardId} triggerBoardName={triggerBoardName}
                triggerColumnId={triggerColumnId} triggerColumnName={triggerColumnName}
                triggerValue={triggerValue}
                boards={boards} columns={columns} columnsLoading={columnsLoading}
                onBoardChange={handleBoardChange}
                onColumnChange={handleColumnChange}
                onValueChange={setTriggerValue}
                webhookId={webhookId} status={status}
                onToggle={toggleStatus} saving={saving}
              />
            ) : selectedStep ? (
              <>
                {selectedStep.type === 'filter' && (
                  <FilterConfig config={selectedStep.config} onChange={c => updateStepConfig(selectedStep.id, c)} />
                )}
                {(selectedStep.type === 'find_or_create_contact' || selectedStep.type === 'create_contact') && (
                  <ContactSourceConfig
                    config={selectedStep.config} onChange={c => updateStepConfig(selectedStep.id, c)}
                    title={STEP_META[selectedStep.type].label}
                    color={STEP_META[selectedStep.type].color}
                    Icon={STEP_META[selectedStep.type].Icon}
                  />
                )}
                {selectedStep.type === 'add_to_list' && (
                  <ListStepConfig
                    config={selectedStep.config} onChange={c => updateStepConfig(selectedStep.id, c)}
                    lists={lists} title="Add Contact to List" color="bg-blue-500" Icon={ListPlus}
                    description="Add the found contact to one or more lists"
                  />
                )}
                {selectedStep.type === 'remove_from_list' && (
                  <ListStepConfig
                    config={selectedStep.config} onChange={c => updateStepConfig(selectedStep.id, c)}
                    lists={lists} title="Remove Contact from List" color="bg-orange-500" Icon={ListMinus}
                    description="Remove the found contact from one or more lists"
                  />
                )}
                {selectedStep.type === 'update_contact' && (
                  <UpdateContactConfig config={selectedStep.config} onChange={c => updateStepConfig(selectedStep.id, c)} />
                )}
                {selectedStep.type === 'delay' && (
                  <DelayConfig config={selectedStep.config} onChange={c => updateStepConfig(selectedStep.id, c)} />
                )}

                {/* Delete step button */}
                <div className="pt-4 border-t border-gray-200">
                  <button onClick={() => deleteStep(selectedStep.id)}
                    className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-semibold transition-colors">
                    <Trash2 className="w-4 h-4" /> Remove this step
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="font-semibold text-gray-700 mb-1">Select a step to configure</h3>
                <p className="text-sm text-gray-400">Click any step on the left to configure it, or add a new step.</p>
              </div>
            )}

            {/* Run history */}
            {showRuns && runs && runs.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Recent Runs</h3>
                <div className="space-y-2">
                  {runs.slice(0, 10).map(run => {
                    const log = JSON.parse(run.run_log || '[]') as Array<{ type: string; result: string; detail?: string }>
                    return (
                      <div key={run.id} className="bg-white rounded-xl border border-gray-200 p-3 text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {run.status === 'done' ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : run.status === 'filtered' ? <Filter className="w-3.5 h-3.5 text-amber-500" /> : <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                            <span className="font-semibold text-gray-700">{run.trigger_email || run.trigger_item || 'Unknown'}</span>
                          </div>
                          <span className="text-gray-400">{new Date(run.created_at).toLocaleString()}</span>
                        </div>
                        <div className="space-y-1">
                          {log.map((entry, i) => (
                            <div key={i} className={`flex items-start gap-2 ${entry.result === 'error' ? 'text-red-600' : entry.result === 'filtered_out' ? 'text-amber-600' : 'text-gray-500'}`}>
                              <span className="font-mono">{entry.type}:</span>
                              <span>{entry.result}{entry.detail ? ` — ${entry.detail}` : ''}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Help card at bottom of right panel */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
              <p className="text-xs font-bold text-gray-700">How to connect Monday.com</p>
              <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                <li>Configure your trigger (board + column) above</li>
                <li>Add action steps using the "Add Step" button</li>
                <li>Click <strong>Activate Recipe</strong> to register the webhook automatically</li>
                <li>Or manually add the webhook URL in Monday.com → Board → Integrations → Webhooks</li>
              </ol>
              <a href="https://developer.monday.com/apps/docs/mondaywebhooks" target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                Monday.com Webhook docs <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
