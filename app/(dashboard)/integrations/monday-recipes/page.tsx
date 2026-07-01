'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Toast } from '@/components/ui'
import { ArrowLeft, Plus, Play, Pause, Trash2, Edit2, Zap, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface Recipe {
  id: string; name: string; status: string
  trigger_board_name: string | null; trigger_board_id: string
  trigger_column_name: string | null; trigger_column_id: string
  steps: string; run_count: number; total_runs: number
  last_run_at: string | null; created_at: string; webhook_id: string | null
}

function stepCount(stepsJson: string) {
  try { return (JSON.parse(stepsJson) as unknown[]).length } catch { return 0 }
}

function stepSummary(stepsJson: string) {
  try {
    const steps = JSON.parse(stepsJson) as Array<{ type: string }>
    const labels: Record<string, string> = {
      filter: 'Filter', find_or_create_contact: 'Find/Create Contact',
      create_contact: 'Create Contact', add_to_list: 'Add to List',
      remove_from_list: 'Remove from List', update_contact: 'Update Contact', delay: 'Delay',
    }
    return steps.map(s => labels[s.type] || s.type).join(' → ')
  } catch { return '' }
}

export default function MondayRecipesPage() {
  const router = useRouter()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    fetch('/api/integrations/monday/recipes').then(r => r.json()).then(d => {
      setRecipes(Array.isArray(d) ? d : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function createRecipe() {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/integrations/monday/recipes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const d = await res.json()
    setCreating(false)
    if (d.id) router.push(`/integrations/monday-recipes/${d.id}`)
    else setToast({ msg: d.error || 'Failed to create', type: 'error' })
  }

  async function toggleStatus(recipe: Recipe) {
    const newStatus = recipe.status === 'active' ? 'paused' : 'active'
    const res = await fetch(`/api/integrations/monday/recipes/${recipe.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const d = await res.json()
    if (d.ok) {
      setRecipes(rs => rs.map(r => r.id === recipe.id ? { ...r, status: newStatus } : r))
      setToast({ msg: newStatus === 'active' ? 'Recipe activated' : 'Recipe paused', type: 'success' })
    } else {
      setToast({ msg: d.error || 'Failed to update', type: 'error' })
    }
  }

  async function deleteRecipe(recipe: Recipe) {
    if (!confirm(`Delete recipe "${recipe.name}"?`)) return
    const res = await fetch(`/api/integrations/monday/recipes/${recipe.id}`, { method: 'DELETE' })
    const d = await res.json()
    if (d.ok) {
      setRecipes(rs => rs.filter(r => r.id !== recipe.id))
      setToast({ msg: 'Recipe deleted', type: 'success' })
    } else {
      setToast({ msg: d.error || 'Failed to delete', type: 'error' })
    }
  }

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/integrations" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F62B54 0%, #FF6B35 100%)' }}>
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Monday.com Recipes</h1>
            </div>
            <p className="text-sm text-gray-500 mt-0.5 ml-9">Automate contact management when Monday.com column values change</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> New Recipe
        </button>
      </div>

      {/* New recipe modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">New Recipe</h2>
            <input
              autoFocus
              type="text" value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createRecipe()}
              placeholder="e.g. Manager Email To CC"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
            />
            <div className="flex gap-2">
              <button onClick={createRecipe} disabled={creating || !newName.trim()}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                {creating ? 'Creating…' : 'Create & Configure'}
              </button>
              <button onClick={() => { setShowCreate(false); setNewName('') }}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-48" />
                  <div className="h-3 bg-gray-100 rounded w-72" />
                  <div className="h-3 bg-gray-100 rounded w-56" />
                </div>
                <div className="h-6 bg-gray-200 rounded-full w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">No recipes yet</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">Create a recipe to automatically manage MailForge contacts when Monday.com column values change.</p>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Create your first recipe
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map(recipe => {
            const count = stepCount(recipe.steps)
            const summary = stepSummary(recipe.steps)
            const isActive = recipe.status === 'active'
            return (
              <div key={recipe.id} className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all p-5">
                <div className="flex items-start gap-4">
                  {/* Status indicator */}
                  <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${isActive ? 'bg-green-400' : 'bg-gray-300'}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{recipe.name}</h3>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isActive ? 'Active' : 'Paused'}
                      </span>
                      {recipe.webhook_id && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5" /> Webhook registered
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-sm text-gray-600">
                      <span className="font-medium">Trigger:</span>{' '}
                      {recipe.trigger_column_name || recipe.trigger_column_id || '—'}{' '}
                      changes in{' '}
                      <span className="font-medium">{recipe.trigger_board_name || recipe.trigger_board_id || '—'}</span>
                    </div>

                    {summary && (
                      <p className="text-xs text-gray-400 mt-1">{count} step{count !== 1 ? 's' : ''}: {summary}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      {recipe.total_runs > 0 && (
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" /> {recipe.total_runs} run{recipe.total_runs !== 1 ? 's' : ''}
                        </span>
                      )}
                      {recipe.last_run_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Last: {formatDateTime(recipe.last_run_at)}
                        </span>
                      )}
                      {!recipe.trigger_board_id && (
                        <span className="flex items-center gap-1 text-amber-500">
                          <AlertCircle className="w-3 h-3" /> Trigger not configured
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/integrations/monday-recipes/${recipe.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <Edit2 className="w-3 h-3" /> Edit
                    </Link>
                    <button onClick={() => toggleStatus(recipe)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg transition-colors ${isActive ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}>
                      {isActive ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Activate</>}
                    </button>
                    <button onClick={() => deleteRecipe(recipe)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
