'use client'

import { useEffect, useRef, useState } from 'react'
import { Toast } from '@/components/ui'
import { Save, Eye, EyeOff, Copy, Check, UserPlus, Trash2, Shield, User, Mail, ExternalLink, ArrowRightLeft } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Settings {
  postmark_api_key?: string; postmark_message_stream?: string
  sender_name?: string; sender_email?: string; reply_to?: string
  company_name?: string; company_address?: string; website?: string
  logo_url?: string; anthropic_api_key?: string
}
interface TeamMember { id: string; email: string; name: string | null; role: string; status: 'pending' | 'active'; invited_at: string }
interface MeUser { id: string; memberId: string; email: string; name: string; isOwner: boolean }

// ─── Helper components ────────────────────────────────────────────────────────
function SettingCard({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit?: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {onEdit && (
          <button onClick={onEdit} className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Edit
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function Field({ label, value, placeholder }: { label: string; value?: string; placeholder?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-900 mb-0.5">{label}</p>
      <p className="text-sm text-gray-600">{value || <span className="text-gray-400 italic">{placeholder || 'Not set'}</span>}</p>
    </div>
  )
}

function EditField({ label, name, value, onChange, type = 'text', hint, placeholder }: {
  label: string; name: string; value: string; onChange: (v: string) => void;
  type?: string; hint?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50 focus:bg-white"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function SecretField({ label, value, onChange, hint, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50 focus:bg-white"
        />
        <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

// ─── Tab: Account details ─────────────────────────────────────────────────────
function AccountDetailsTab({ settings, me, onSave }: { settings: Settings; me: MeUser; onSave: (s: Settings) => Promise<boolean> }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Settings>(settings)
  const [saving, setSaving] = useState(false)

  function startEdit(section: string) { setDraft(settings); setEditing(section) }
  async function save() {
    setSaving(true)
    const ok = await onSave(draft)
    setSaving(false)
    if (ok) setEditing(null)
  }

  const s = (k: keyof Settings) => (v: string) => setDraft(d => ({ ...d, [k]: v }))

  return (
    <div className="space-y-5">
      {/* Profile details */}
      <SettingCard title="Profile details">
        <div className="space-y-3">
          <Field label="Name" value={me.name} />
          <Field label="Email" value={me.email} />
          {!me.isOwner && (
            <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              You are a team member. Contact the account owner to change profile settings.
            </div>
          )}
        </div>
      </SettingCard>

      {/* Business details */}
      {editing === 'business' ? (
        <div className="bg-white rounded-2xl border border-blue-300 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Business details</h3>
          <div className="grid grid-cols-2 gap-4">
            <EditField label="Company name" name="company_name" value={draft.company_name || ''} onChange={s('company_name')} placeholder="Your company name" />
            <EditField label="Website" name="website" type="url" value={draft.website || ''} onChange={s('website')} placeholder="https://example.com" />
          </div>
          <EditField label="Company address" name="company_address" value={draft.company_address || ''} onChange={s('company_address')} placeholder="123 Main St, City, ST 12345" hint="Required by CAN-SPAM for email footer" />
          <EditField label="Logo URL" name="logo_url" value={draft.logo_url || ''} onChange={s('logo_url')} placeholder="https://example.com/logo.png" hint="Used in email headers" />
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <SettingCard title="Business details" onEdit={me.isOwner ? () => startEdit('business') : undefined}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company name" value={settings.company_name} />
            <Field label="Website" value={settings.website} />
            <Field label="Company address" value={settings.company_address} placeholder="Not set (required for CAN-SPAM)" />
            <Field label="Logo URL" value={settings.logo_url} />
          </div>
        </SettingCard>
      )}

      {/* Email settings */}
      {editing === 'email' ? (
        <div className="bg-white rounded-2xl border border-blue-300 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Email settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <EditField label="Default from name" name="sender_name" value={draft.sender_name || ''} onChange={s('sender_name')} placeholder="Your Name or Brand" />
            <EditField label="Default from email" name="sender_email" type="email" value={draft.sender_email || ''} onChange={s('sender_email')} placeholder="you@yourdomain.com" hint="Must be verified in Postmark" />
          </div>
          <EditField label="Reply-to email" name="reply_to" type="email" value={draft.reply_to || ''} onChange={s('reply_to')} placeholder="Same as sender email" />
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <SettingCard title="Email settings" onEdit={me.isOwner ? () => startEdit('email') : undefined}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Default from name" value={settings.sender_name} />
            <Field label="Default from email" value={settings.sender_email} />
            <Field label="Reply-to email" value={settings.reply_to} placeholder="Same as from email" />
          </div>
        </SettingCard>
      )}
    </div>
  )
}

// ─── Tab: Team members ────────────────────────────────────────────────────────
function TeamMembersTab({ me, onOwnershipTransferred }: { me: MeUser; onOwnershipTransferred: () => void }) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'member' })
  const [inviting, setInviting] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [transferring, setTransferring] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  async function load() {
    const res = await fetch('/api/team')
    if (res.ok) { const d = await res.json(); setMembers(d.members || []) }
    setLoading(false)
  }
  useEffect(() => { if (me.isOwner) load() }, [me.isOwner])

  async function invite() {
    if (!inviteForm.email.trim()) return
    setInviting(true)
    const res = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inviteForm) })
    setInviting(false)
    if (res.ok) {
      const d = await res.json()
      const link = `${window.location.origin}/invite?token=${d.invite_token}`
      setInviteLink(link)
      setInviteForm({ email: '', name: '', role: 'member' })
      load()
    } else {
      const d = await res.json()
      setToast({ msg: d.error || 'Failed to send invite', type: 'error' })
    }
  }

  async function removeMember(id: string, email: string) {
    if (!confirm(`Remove ${email} from your account?`)) return
    const res = await fetch(`/api/team/${id}`, { method: 'DELETE' })
    if (res.ok) { setToast({ msg: 'Team member removed', type: 'success' }); load() }
  }

  async function transferOwnership(memberId: string, memberEmail: string) {
    if (!confirm(`Transfer account ownership to ${memberEmail}?\n\nThis will make them the account owner. You will become a regular team member.`)) return
    setTransferring(memberId)
    const res = await fetch('/api/team/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    })
    setTransferring(null)
    if (res.ok) {
      setToast({ msg: `Ownership transferred to ${memberEmail}`, type: 'success' })
      setTimeout(() => onOwnershipTransferred(), 1500)
    } else {
      const d = await res.json()
      setToast({ msg: d.error || 'Transfer failed', type: 'error' })
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!me.isOwner) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Only the account owner can manage team members.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Invite link result */}
      {inviteLink && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-green-800 mb-2">✅ Invite created! Share this link with your team member:</p>
          <div className="flex items-center gap-2 bg-white border border-green-300 rounded-xl px-3 py-2">
            <code className="text-xs text-gray-700 flex-1 break-all">{inviteLink}</code>
            <button onClick={copyLink} className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-900">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button onClick={() => setInviteLink('')} className="mt-3 text-xs text-green-600 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Owner row + invite button */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-800">Team members</p>
            <p className="text-xs text-gray-500 mt-0.5">Members can create and send campaigns, manage contacts and templates.</p>
          </div>
          <button
            onClick={() => setShowInvite(o => !o)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" /> Invite member
          </button>
        </div>

        {/* Invite form */}
        {showInvite && (
          <div className="px-5 py-4 border-b border-gray-100 bg-blue-50/50">
            <p className="text-sm font-semibold text-gray-800 mb-3">Invite a team member</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="colleague@company.com"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name (optional)</label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Their name"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={invite}
                disabled={inviting || !inviteForm.email.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
              >
                {inviting ? 'Generating…' : 'Generate invite link'}
              </button>
              <button onClick={() => setShowInvite(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* Members table */}
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              {['Member', 'Role', 'Status', 'Invited', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Owner row */}
            <tr className="bg-blue-50/30">
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{me.name[0]?.toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{me.name}</p>
                    <p className="text-xs text-gray-500">{me.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                  <Shield className="w-3 h-3" /> Owner
                </span>
              </td>
              <td className="px-5 py-3">
                <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Active</span>
              </td>
              <td className="px-5 py-3 text-xs text-gray-500">—</td>
              <td className="px-5 py-3" />
            </tr>

            {loading ? (
              <tr><td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-400">Loading…</td></tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center">
                  <User className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No team members yet. Invite someone to collaborate.</p>
                </td>
              </tr>
            ) : members.map(m => (
              <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-600 text-xs font-bold">{(m.name || m.email)[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.name || '—'}</p>
                      <p className="text-xs text-gray-500">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                    m.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`}>{m.role}</span>
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{m.status === 'active' ? 'Active' : 'Pending invite'}</span>
                </td>
                <td className="px-5 py-3 text-xs text-gray-500">{new Date(m.invited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    {m.status === 'active' && (
                      <button
                        onClick={() => transferOwnership(m.id, m.email)}
                        disabled={transferring === m.id}
                        title="Transfer ownership to this member"
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        {transferring === m.id ? '…' : 'Make owner'}
                      </button>
                    )}
                    <button onClick={() => removeMember(m.id, m.email)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <strong>How team members work:</strong> When someone accepts an invite, they get their own login (email + password) but will see and manage the same campaigns, contacts, templates, and lists as your account.
      </div>
    </div>
  )
}

// ─── Tab: Developer settings ──────────────────────────────────────────────────
function DeveloperTab({ settings, me, onSave }: { settings: Settings; me: MeUser; onSave: (s: Settings) => Promise<boolean> }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Settings>(settings)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  function startEdit(section: string) { setDraft(settings); setEditing(section) }
  async function save() {
    setSaving(true)
    const ok = await onSave(draft)
    setSaving(false)
    if (ok) setEditing(null)
  }

  const s = (k: keyof Settings) => (v: string) => setDraft(d => ({ ...d, [k]: v }))
  const webhookUrl = `${appUrl}/api/webhooks/postmark`

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!me.isOwner) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Only the account owner can change developer settings.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Postmark */}
      {editing === 'postmark' ? (
        <div className="bg-white rounded-2xl border border-blue-300 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Postmark configuration</h3>
          <SecretField label="Server API Token" value={draft.postmark_api_key || ''} onChange={s('postmark_api_key')} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" hint="Get this from your Postmark server settings" />
          <EditField label="Message stream" name="stream" value={draft.postmark_message_stream || 'broadcast'} onChange={s('postmark_message_stream')} hint="Use 'broadcast' for marketing emails (default)" />
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <SettingCard title="Postmark configuration" onEdit={() => startEdit('postmark')}>
          <div className="space-y-3">
            <Field label="Server API Token" value={settings.postmark_api_key ? '••••••••' + settings.postmark_api_key.slice(-4) : undefined} placeholder="Not configured" />
            <Field label="Message stream" value={settings.postmark_message_stream || 'broadcast'} />
          </div>
        </SettingCard>
      )}

      {/* Webhook */}
      <SettingCard title="Postmark webhook">
        <p className="text-sm text-gray-600 mb-3">Add this URL in your Postmark server settings to track opens, clicks, and bounces.</p>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2.5">
          <code className="text-xs text-gray-700 flex-1 break-all">{webhookUrl}</code>
          <button onClick={copyWebhook} className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <a href="https://postmarkapp.com/support/article/1105-webhooks" target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2">
          <ExternalLink className="w-3 h-3" /> Postmark webhook docs
        </a>
      </SettingCard>

      {/* AI key */}
      {editing === 'ai' ? (
        <div className="bg-white rounded-2xl border border-blue-300 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">AI Template Maker</h3>
          <SecretField label="Anthropic API Key" value={draft.anthropic_api_key || ''} onChange={s('anthropic_api_key')} placeholder="sk-ant-..." hint="Used only for the AI Template Maker — stored locally" />
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <SettingCard title="AI Template Maker" onEdit={() => startEdit('ai')}>
          <p className="text-sm text-gray-500 mb-3">Generate professional email templates using Claude AI.</p>
          <Field label="Anthropic API Key" value={settings.anthropic_api_key ? '••••••••' + settings.anthropic_api_key.slice(-4) : undefined} placeholder="Not configured" />
          <a href="/templates/ai-maker" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-3">
            <ExternalLink className="w-3.5 h-3.5" /> Open AI Template Maker
          </a>
        </SettingCard>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'account', label: 'Account details' },
  { id: 'team', label: 'Team members' },
  { id: 'developer', label: 'Developer settings' },
] as const

type TabId = typeof TABS[number]['id']

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({})
  const [me, setMe] = useState<MeUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('account')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/me').then(r => r.json()),
    ]).then(([s, m]) => {
      setSettings(s || {})
      setMe(m)
      setLoading(false)
    })
  }, [])

  async function saveSettings(updated: Settings): Promise<boolean> {
    const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
    if (res.ok) { setSettings(updated); setToast({ msg: 'Settings saved', type: 'success' }); return true }
    setToast({ msg: 'Failed to save settings', type: 'error' })
    return false
  }

  if (loading || !me) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">My Account: {me.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${me.isOwner ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
            <Shield className="w-3 h-3" />
            {me.isOwner ? 'Account owner' : 'Team member'}
          </span>
          <span className="text-sm text-gray-500">{me.email}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'account' && <AccountDetailsTab settings={settings} me={me} onSave={saveSettings} />}
      {tab === 'team' && <TeamMembersTab me={me} onOwnershipTransferred={() => { window.location.reload() }} />}
      {tab === 'developer' && <DeveloperTab settings={settings} me={me} onSave={saveSettings} />}
    </div>
  )
}
