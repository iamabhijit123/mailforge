'use client'

import { useEffect, useState } from 'react'
import { Toast } from '@/components/ui'
import {
  Eye, EyeOff, Copy, Check, UserPlus, Trash2, Shield, User,
  ExternalLink, ArrowRightLeft, Lock, Mail, Globe, Clock, Image,
  FileText, ChevronRight, AtSign, CheckCircle, AlertCircle,
  Plus, RefreshCw, X, LayoutDashboard,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Settings {
  postmark_api_key?: string; postmark_message_stream?: string
  sender_name?: string; sender_email?: string; reply_to?: string
  company_name?: string; company_address?: string; website?: string
  logo_url?: string; anthropic_api_key?: string
  phone?: string; timezone?: string; signature_image_url?: string
  privacy_policy_url?: string; footer_show_update_profile?: number
  footer_show_unsubscribe_comment?: number; footer_fine_print?: string
}
interface TeamMember { id: string; email: string; name: string | null; role: string; status: 'pending' | 'active'; invited_at: string }
interface MeUser { id: string; memberId: string; email: string; name: string; phone?: string; isOwner: boolean; isAdmin?: boolean }
interface DomainVerification {
  id: string; domain: string; status: 'pending' | 'verified'
  dkim_host?: string; dkim_value?: string; dkim_verified: number
  return_path_host?: string; return_path_value?: string; return_path_verified: number
  created_at: string; verified_at?: string
}

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai',
  'Australia/Sydney', 'Pacific/Auckland', 'UTC',
]

// ─── Helper components ────────────────────────────────────────────────────────
function SectionCard({ title, icon, children, onEdit, editLabel = 'Edit' }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; onEdit?: () => void; editLabel?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-400">{icon}</span>}
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {onEdit && (
          <button onClick={onEdit} className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            {editLabel}
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
      <p className="text-xs font-semibold text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value || <span className="text-gray-400 italic">{placeholder || 'Not set'}</span>}</p>
    </div>
  )
}

function EditField({ label, name, value, onChange, type = 'text', hint, placeholder, required }: {
  label: string; name: string; value: string; onChange: (v: string) => void;
  type?: string; hint?: string; placeholder?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        type={type} name={name} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
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
          type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
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

function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button onClick={() => onChange(!checked)} className={`relative flex-shrink-0 w-10 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}>
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

function SaveCancel({ saving, onSave, onCancel }: { saving: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-2 pt-2">
      <button onClick={onSave} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
    </div>
  )
}

// ─── Tab: Account details ─────────────────────────────────────────────────────
function AccountDetailsTab({ settings, me, onSaveSettings, onSaveMe, toast }: {
  settings: Settings; me: MeUser
  onSaveSettings: (s: Settings) => Promise<boolean>
  onSaveMe: (name: string, phone: string) => Promise<boolean>
  toast: (msg: string, type: 'success' | 'error') => void
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Settings>(settings)
  const [meDraft, setMeDraft] = useState({ name: me.name, phone: me.phone || '' })
  const [saving, setSaving] = useState(false)

  // Password change state
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')

  function startEdit(section: string) { setDraft(settings); setMeDraft({ name: me.name, phone: me.phone || '' }); setEditing(section) }
  async function save(section: string) {
    setSaving(true)
    let ok = false
    if (section === 'profile') ok = await onSaveMe(meDraft.name, meDraft.phone)
    else ok = await onSaveSettings(draft)
    setSaving(false)
    if (ok) setEditing(null)
  }

  async function changePassword() {
    setPwError('')
    if (!pwForm.current || !pwForm.next) { setPwError('All fields required'); return }
    if (pwForm.next.length < 8) { setPwError('New password must be at least 8 characters'); return }
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match'); return }
    setPwSaving(true)
    const res = await fetch('/api/auth/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
    })
    setPwSaving(false)
    if (res.ok) {
      toast('Password updated successfully', 'success')
      setPwForm({ current: '', next: '', confirm: '' })
      setEditing(null)
    } else {
      const d = await res.json()
      setPwError(d.error || 'Failed to update password')
    }
  }

  const s = (k: keyof Settings) => (v: string) => setDraft(d => ({ ...d, [k]: v }))
  const sNum = (k: keyof Settings) => (v: boolean) => setDraft(d => ({ ...d, [k]: v ? 1 : 0 }))

  return (
    <div className="space-y-5">
      {/* Profile details */}
      {editing === 'profile' ? (
        <div className="bg-white rounded-2xl border border-blue-300 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /> Profile details</h3>
          <div className="grid grid-cols-2 gap-4">
            <EditField label="Full name" name="name" value={meDraft.name} onChange={v => setMeDraft(d => ({ ...d, name: v }))} required />
            <EditField label="Phone number" name="phone" value={meDraft.phone} onChange={v => setMeDraft(d => ({ ...d, phone: v }))} placeholder="+1 555 000 0000" type="tel" />
          </div>
          <SaveCancel saving={saving} onSave={() => save('profile')} onCancel={() => setEditing(null)} />
        </div>
      ) : (
        <SectionCard title="Profile details" icon={<User className="w-4 h-4" />} onEdit={() => startEdit('profile')}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" value={me.name} />
            <Field label="Phone" value={me.phone} placeholder="Not set" />
            <Field label="Email" value={me.email} />
            <Field label="Role" value={me.isOwner ? 'Account manager' : 'Team member'} />
          </div>
        </SectionCard>
      )}

      {/* Business details */}
      {editing === 'business' ? (
        <div className="bg-white rounded-2xl border border-blue-300 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Globe className="w-4 h-4 text-gray-400" /> Business details</h3>
          <div className="grid grid-cols-2 gap-4">
            <EditField label="Company name" name="company_name" value={draft.company_name || ''} onChange={s('company_name')} placeholder="Your company name" />
            <EditField label="Website" name="website" type="url" value={draft.website || ''} onChange={s('website')} placeholder="https://example.com" />
            <EditField label="Business phone" name="phone" value={draft.phone || ''} onChange={s('phone')} placeholder="+1 555 000 0000" type="tel" />
            <EditField label="Logo URL" name="logo_url" value={draft.logo_url || ''} onChange={s('logo_url')} placeholder="https://example.com/logo.png" hint="Used in email headers" />
          </div>
          <EditField label="Company address" name="company_address" value={draft.company_address || ''} onChange={s('company_address')} placeholder="123 Main St, City, ST 12345" hint="Required by CAN-SPAM for email footer" />
          <SaveCancel saving={saving} onSave={() => save('business')} onCancel={() => setEditing(null)} />
        </div>
      ) : (
        <SectionCard title="Business details" icon={<Globe className="w-4 h-4" />} onEdit={me.isOwner ? () => startEdit('business') : undefined}>
          {settings.logo_url && (
            <div className="mb-4 w-full h-24 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden">
              <img src={settings.logo_url} alt="Logo" className="max-h-20 max-w-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company name" value={settings.company_name} />
            <Field label="Website" value={settings.website} />
            <Field label="Business phone" value={settings.phone} />
            <Field label="Company address" value={settings.company_address} placeholder="Not set (required for CAN-SPAM)" />
          </div>
        </SectionCard>
      )}

      {/* Email settings */}
      {editing === 'email' ? (
        <div className="bg-white rounded-2xl border border-blue-300 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /> Email settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <EditField label="Default from name" name="sender_name" value={draft.sender_name || ''} onChange={s('sender_name')} placeholder="Your Name or Brand" />
            <EditField label="Default from email" name="sender_email" type="email" value={draft.sender_email || ''} onChange={s('sender_email')} placeholder="you@yourdomain.com" hint="Must be verified in Postmark" />
          </div>
          <EditField label="Reply-to email" name="reply_to" type="email" value={draft.reply_to || ''} onChange={s('reply_to')} placeholder="Same as sender email" />
          <SaveCancel saving={saving} onSave={() => save('email')} onCancel={() => setEditing(null)} />
        </div>
      ) : (
        <SectionCard title="Email settings" icon={<Mail className="w-4 h-4" />} onEdit={me.isOwner ? () => startEdit('email') : undefined}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Default from name" value={settings.sender_name} />
            <Field label="Default from email" value={settings.sender_email} />
            <Field label="Reply-to email" value={settings.reply_to} placeholder="Same as from email" />
          </div>
        </SectionCard>
      )}

      {/* Password & security */}
      {editing === 'password' ? (
        <div className="bg-white rounded-2xl border border-blue-300 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Lock className="w-4 h-4 text-gray-400" /> Change password</h3>
          {pwError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{pwError}</div>}
          <SecretField label="Current password" value={pwForm.current} onChange={v => setPwForm(f => ({ ...f, current: v }))} placeholder="Your current password" />
          <div className="grid grid-cols-2 gap-4">
            <SecretField label="New password" value={pwForm.next} onChange={v => setPwForm(f => ({ ...f, next: v }))} placeholder="At least 8 characters" />
            <SecretField label="Confirm new password" value={pwForm.confirm} onChange={v => setPwForm(f => ({ ...f, confirm: v }))} placeholder="Repeat new password" />
          </div>
          <SaveCancel saving={pwSaving} onSave={changePassword} onCancel={() => { setEditing(null); setPwError(''); setPwForm({ current: '', next: '', confirm: '' }) }} />
        </div>
      ) : (
        <SectionCard title="Password & security" icon={<Lock className="w-4 h-4" />}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-0.5">Username</p>
                <p className="text-sm text-gray-800">{me.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-0.5">Password</p>
                <p className="text-sm text-gray-400">••••••••••••</p>
              </div>
              <button onClick={() => startEdit('password')} className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Change password
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Regional settings */}
      {editing === 'regional' ? (
        <div className="bg-white rounded-2xl border border-blue-300 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> Regional settings</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <select
              value={draft.timezone || 'America/New_York'}
              onChange={e => setDraft(d => ({ ...d, timezone: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50 focus:bg-white"
            >
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Used for scheduling campaigns and recurring sends</p>
          </div>
          <SaveCancel saving={saving} onSave={() => save('regional')} onCancel={() => setEditing(null)} />
        </div>
      ) : (
        <SectionCard title="Regional settings" icon={<Clock className="w-4 h-4" />} onEdit={me.isOwner ? () => startEdit('regional') : undefined}>
          <Field label="Timezone" value={settings.timezone || 'America/New_York'} />
        </SectionCard>
      )}

      {/* Signature image */}
      {editing === 'signature' ? (
        <div className="bg-white rounded-2xl border border-blue-300 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Image className="w-4 h-4 text-gray-400" /> Signature image</h3>
          <EditField label="Signature image URL" name="signature_image_url" value={draft.signature_image_url || ''} onChange={s('signature_image_url')} placeholder="https://example.com/signature.png" hint="Small image shown at the bottom of your emails" />
          {draft.signature_image_url && (
            <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <img src={draft.signature_image_url} alt="Signature preview" className="max-h-16 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
          )}
          <SaveCancel saving={saving} onSave={() => save('signature')} onCancel={() => setEditing(null)} />
        </div>
      ) : (
        <SectionCard title="Signature image" icon={<Image className="w-4 h-4" />} onEdit={me.isOwner ? () => startEdit('signature') : undefined}>
          {settings.signature_image_url ? (
            <div className="w-full h-20 bg-gray-50 rounded-xl border border-gray-100 flex items-center px-4">
              <img src={settings.signature_image_url} alt="Signature" className="max-h-16 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
          ) : (
            <div className="w-full h-20 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center">
              <p className="text-sm text-gray-400">No signature image set</p>
            </div>
          )}
        </SectionCard>
      )}

      {/* Footer settings */}
      {editing === 'footer' ? (
        <div className="bg-white rounded-2xl border border-blue-300 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /> Footer settings</h3>
          <div className="space-y-1">
            <Toggle
              label='Include "Update your profile" link in footer'
              description="Lets contacts update their preferences"
              checked={(draft.footer_show_update_profile ?? 1) === 1}
              onChange={sNum('footer_show_update_profile')}
            />
            <Toggle
              label='Include "Unsubscribe" comment box'
              description="Asks for reason when contacts unsubscribe"
              checked={(draft.footer_show_unsubscribe_comment ?? 1) === 1}
              onChange={sNum('footer_show_unsubscribe_comment')}
            />
          </div>
          <EditField label="Privacy policy URL" name="privacy_policy_url" value={draft.privacy_policy_url || ''} onChange={s('privacy_policy_url')} type="url" placeholder="https://example.com/privacy" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fine print / default footer text</label>
            <textarea
              value={draft.footer_fine_print || ''}
              onChange={e => setDraft(d => ({ ...d, footer_fine_print: e.target.value }))}
              rows={3}
              placeholder="Default footer text for your emails (optional)"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50 focus:bg-white resize-none"
            />
          </div>
          <SaveCancel saving={saving} onSave={() => save('footer')} onCancel={() => setEditing(null)} />
        </div>
      ) : (
        <SectionCard title="Footer settings" icon={<FileText className="w-4 h-4" />} onEdit={me.isOwner ? () => startEdit('footer') : undefined}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">Include "Update your profile" link</p>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${(settings.footer_show_update_profile ?? 1) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {(settings.footer_show_update_profile ?? 1) ? 'On' : 'Off'}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <p className="text-sm text-gray-700">Include "Unsubscribe" comment box</p>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${(settings.footer_show_unsubscribe_comment ?? 1) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {(settings.footer_show_unsubscribe_comment ?? 1) ? 'On' : 'Off'}
              </span>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <Field label="Privacy policy URL" value={settings.privacy_policy_url} />
            </div>
            {settings.footer_fine_print && (
              <div className="border-t border-gray-100 pt-3">
                <Field label="Fine print text" value={settings.footer_fine_print} />
              </div>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

// ─── Tab: Account emails ──────────────────────────────────────────────────────
function AccountEmailsTab({ settings, me, onTabChange }: { settings: Settings; me: MeUser; onTabChange: (t: string) => void }) {
  const [domains, setDomains] = useState<DomainVerification[]>([])

  useEffect(() => {
    fetch('/api/domain').then(r => r.json()).then(d => setDomains(d.domains || []))
  }, [])

  const senderEmail = settings.sender_email || ''
  const senderDomain = senderEmail ? senderEmail.split('@')[1] || '' : ''

  const verifiedDomain = senderDomain
    ? domains.find(d => d.domain === senderDomain && d.status === 'verified')
    : null
  const pendingDomain = senderDomain && !verifiedDomain
    ? domains.find(d => d.domain === senderDomain && d.status === 'pending')
    : null

  // What email will campaigns actually be sent from?
  const willUseSenderEmail = !!verifiedDomain

  return (
    <div className="space-y-6">
      {/* Actual sending behaviour banner */}
      {senderEmail ? (
        <div className={`rounded-2xl border p-4 text-sm flex items-start gap-3 ${willUseSenderEmail ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          {willUseSenderEmail
            ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            : <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />}
          <div>
            <p className="font-semibold mb-0.5">
              {willUseSenderEmail
                ? `Campaigns will be sent From: ${senderEmail}`
                : `Campaigns will use the platform default sender`}
            </p>
            <p className="text-xs opacity-80">
              {willUseSenderEmail
                ? `${senderDomain} is authenticated — recipients see your brand in the From field.`
                : pendingDomain
                  ? `${senderDomain} is added but DNS records not verified yet. Until verified, your email appears in Reply-To only.`
                  : `${senderDomain} has not been authenticated yet. Verify it under the Domain verification tab to send from your own address.`}
            </p>
            {!willUseSenderEmail && (
              <button onClick={() => onTabChange('domains')} className="mt-1.5 text-xs font-semibold underline underline-offset-2">
                Go to Domain verification →
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">No sender email configured</p>
            <p className="text-xs opacity-80">Campaigns cannot be sent until you add a sender email. Go to Account details → Email settings.</p>
          </div>
        </div>
      )}

      {/* Domains */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Domains</h3>
          <p className="text-sm text-gray-500 mt-0.5">Only authenticated domains can be used as the From address.</p>
        </div>
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Domain</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Authentication</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaigns use this?</th>
            </tr>
          </thead>
          <tbody>
            {domains.length > 0 ? domains.map(dv => {
              const isActive = senderDomain === dv.domain
              return (
                <tr key={dv.id} className={`border-t border-gray-100 ${isActive ? 'bg-blue-50/40' : ''}`}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {dv.domain} {isActive && <span className="text-xs text-blue-600 font-normal ml-1">(sender domain)</span>}
                  </td>
                  <td className="px-6 py-4">
                    {dv.status === 'verified'
                      ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold"><CheckCircle className="w-3 h-3" /> Authenticated</span>
                      : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold"><AlertCircle className="w-3 h-3" /> Pending DNS</span>}
                  </td>
                  <td className="px-6 py-4">
                    {isActive && dv.status === 'verified'
                      ? <span className="text-xs font-semibold text-green-700">✓ Yes — From: {senderEmail}</span>
                      : isActive
                        ? <span className="text-xs text-amber-700">Not yet — verify to enable</span>
                        : <span className="text-xs text-gray-400">—</span>}
                  </td>
                </tr>
              )
            }) : senderDomain ? (
              <tr className="border-t border-gray-100">
                <td className="px-6 py-4 text-sm text-gray-900">{senderDomain}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold"><AlertCircle className="w-3 h-3" /> Not added</span>
                </td>
                <td className="px-6 py-4 text-xs text-gray-400">
                  <button onClick={() => onTabChange('domains')} className="text-blue-600 hover:underline font-medium">Add & verify →</button>
                </td>
              </tr>
            ) : (
              <tr className="border-t border-gray-100">
                <td colSpan={3} className="px-6 py-6 text-center text-sm text-gray-400">
                  No sender email configured. Add one in Account details → Email settings.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Email addresses */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Email addresses</h3>
            <p className="text-sm text-gray-500 mt-0.5">Configured sender addresses for your account.</p>
          </div>
          {me.isOwner && (
            <button onClick={() => onTabChange('account')} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
              <AtSign className="w-3.5 h-3.5" /> Edit sender email
            </button>
          )}
        </div>
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaigns will send from</th>
            </tr>
          </thead>
          <tbody>
            {senderEmail ? (
              <tr className="border-t border-gray-100">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{senderEmail}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {willUseSenderEmail ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                        <CheckCircle className="w-3 h-3" /> This address (domain verified)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                        <AlertCircle className="w-3 h-3" /> Platform default sender (domain not verified)
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">Default from</span>
                    <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">Reply-To</span>
                  </div>
                </td>
              </tr>
            ) : (
              <tr className="border-t border-gray-100">
                <td colSpan={2} className="px-6 py-6 text-center">
                  <AlertCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No sender email configured yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Go to Account details → Email settings to add one.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
      setInviteLink(`${window.location.origin}/invite?token=${d.invite_token}`)
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
    if (!confirm(`Transfer account ownership to ${memberEmail}?\n\nYou will become a regular team member.`)) return
    setTransferring(memberId)
    const res = await fetch('/api/team/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId }) })
    setTransferring(null)
    if (res.ok) {
      setToast({ msg: `Ownership transferred to ${memberEmail}`, type: 'success' })
      setTimeout(() => onOwnershipTransferred(), 1500)
    } else {
      const d = await res.json()
      setToast({ msg: d.error || 'Transfer failed', type: 'error' })
    }
  }

  function copyLink() { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  if (!me.isOwner) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
      <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 text-sm">Only the account owner can manage team members.</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {inviteLink && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-green-800 mb-2">✅ Invite created! Share this link:</p>
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
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-800">Team members</p>
            <p className="text-xs text-gray-500 mt-0.5">Members can create campaigns, manage contacts and templates.</p>
          </div>
          <button onClick={() => setShowInvite(o => !o)} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <UserPlus className="w-3.5 h-3.5" /> Invite member
          </button>
        </div>
        {showInvite && (
          <div className="px-5 py-4 border-b border-gray-100 bg-blue-50/50">
            <p className="text-sm font-semibold text-gray-800 mb-3">Invite a team member</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="colleague@company.com" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name (optional)</label>
                <input type="text" value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} placeholder="Their name" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={invite} disabled={inviting || !inviteForm.email.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">{inviting ? 'Generating…' : 'Generate invite link'}</button>
              <button onClick={() => setShowInvite(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors">Cancel</button>
            </div>
          </div>
        )}
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>{['Member', 'Role', 'Status', 'Invited', 'Actions'].map(h => <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="bg-blue-50/30">
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{me.name[0]?.toUpperCase()}</span>
                  </div>
                  <div><p className="text-sm font-medium text-gray-900">{me.name}</p><p className="text-xs text-gray-500">{me.email}</p></div>
                </div>
              </td>
              <td className="px-5 py-3"><span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold"><Shield className="w-3 h-3" /> Owner</span></td>
              <td className="px-5 py-3"><span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Active</span></td>
              <td className="px-5 py-3 text-xs text-gray-500">—</td>
              <td className="px-5 py-3" />
            </tr>
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-400">Loading…</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center"><User className="w-8 h-8 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">No team members yet.</p></td></tr>
            ) : members.map(m => (
              <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"><span className="text-gray-600 text-xs font-bold">{(m.name || m.email)[0]?.toUpperCase()}</span></div>
                    <div><p className="text-sm font-medium text-gray-900">{m.name || '—'}</p><p className="text-xs text-gray-500">{m.email}</p></div>
                  </div>
                </td>
                <td className="px-5 py-3"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${m.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{m.role}</span></td>
                <td className="px-5 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{m.status === 'active' ? 'Active' : 'Pending invite'}</span></td>
                <td className="px-5 py-3 text-xs text-gray-500">{new Date(m.invited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    {m.status === 'active' && (
                      <button onClick={() => transferOwnership(m.id, m.email)} disabled={transferring === m.id} title="Transfer ownership" className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50">
                        <ArrowRightLeft className="w-3.5 h-3.5" />{transferring === m.id ? '…' : 'Make owner'}
                      </button>
                    )}
                    <button onClick={() => removeMember(m.id, m.email)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <strong>How team members work:</strong> Members get their own login but share the same campaigns, contacts, templates, and lists as your account.
      </div>
    </div>
  )
}

// ─── Tab: Domain verification ─────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <button onClick={copy} className="flex-shrink-0 text-gray-400 hover:text-blue-600 ml-2">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function StatusBadge({ found }: { found: boolean }) {
  return found
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold whitespace-nowrap"><CheckCircle className="w-3 h-3" /> Found</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold whitespace-nowrap"><AlertCircle className="w-3 h-3" /> Not found</span>
}

function DnsRecordRow({ type, label, host, value, verified, informational }: {
  type: string; label: string; host: string; value: string; verified?: boolean; informational?: boolean
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded font-mono">{type}</span>
        <span className="text-xs font-semibold text-gray-700 flex-1">{label}</span>
        {!informational && <StatusBadge found={!!verified} />}
        {informational && <span className="text-xs text-gray-400 italic">Recommended</span>}
      </div>
      <div className="p-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3">
        <span className="text-xs font-semibold text-gray-500 pt-1.5">Host name</span>
        <div className="flex items-start gap-1">
          <code className="text-xs bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 flex-1 break-all font-mono leading-relaxed">{host}</code>
          <CopyBtn text={host} />
        </div>
        <span className="text-xs font-semibold text-gray-500 pt-1.5">Value</span>
        <div className="flex items-start gap-1">
          <code className="text-xs bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 flex-1 break-all font-mono leading-relaxed">{value}</code>
          <CopyBtn text={value} />
        </div>
      </div>
    </div>
  )
}

function DomainRecordsPanel({ d, onVerify, verifying, onRemove }: {
  d: DomainVerification; onVerify: () => void; verifying: boolean; onRemove: () => void
}) {
  const allVerified = d.status === 'verified'

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${allVerified ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        {allVerified
          ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          : <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />}
        <div className="flex-1">
          <p className={`text-sm font-semibold ${allVerified ? 'text-green-800' : 'text-amber-800'}`}>
            {allVerified ? `${d.domain} is authenticated` : `Waiting for DNS records on ${d.domain}`}
          </p>
          <p className={`text-xs mt-0.5 ${allVerified ? 'text-green-600' : 'text-amber-700'}`}>
            {allVerified
              ? 'Emails sent from this domain will show your address in the From field.'
              : 'Add the DNS records below to your DNS provider, then click "Verify now". DNS can take up to 48 hours to propagate.'}
          </p>
        </div>
        {allVerified && (
          <span className="flex-shrink-0 px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">Authenticated</span>
        )}
      </div>

      {/* DNS records header */}
      <div>
        <p className="text-sm font-semibold text-gray-800 mb-1">DNS records for authenticating <strong>{d.domain}</strong></p>
        <p className="text-xs text-gray-500">Copy the records below and add them to the DNS settings for your website.</p>
      </div>

      {/* DKIM */}
      {d.dkim_host && d.dkim_value && (
        <DnsRecordRow
          type="TXT" label="DKIM — Email signing key"
          host={d.dkim_host} value={d.dkim_value}
          verified={!!d.dkim_verified}
        />
      )}

      {/* Return Path */}
      {d.return_path_host && d.return_path_value && (
        <DnsRecordRow
          type="CNAME" label="Return Path — Bounce tracking"
          host={d.return_path_host} value={d.return_path_value}
          verified={!!d.return_path_verified}
        />
      )}

      {/* SPF — informational */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-bold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded font-mono">TXT</span>
          <span className="text-xs font-semibold text-gray-700 flex-1">SPF — Sender permission</span>
          <span className="text-xs text-gray-400 italic">Add to existing record</span>
        </div>
        <div className="p-4 text-xs text-gray-600 space-y-2">
          <p>Add <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">include:spf.mtasv.net</code> to your existing SPF TXT record at <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">{d.domain}</code></p>
          <p className="text-gray-400">If you don&apos;t have an SPF record yet, create a new TXT record:</p>
          <div className="flex items-center gap-2">
            <code className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg font-mono text-xs flex-1">v=spf1 include:spf.mtasv.net ~all</code>
            <CopyBtn text="v=spf1 include:spf.mtasv.net ~all" />
          </div>
        </div>
      </div>

      {/* DMARC */}
      <DnsRecordRow
        type="TXT" label="DMARC policy"
        host={`_dmarc.${d.domain}`}
        value={`v=DMARC1; p=none; rua=mailto:dmarc@${d.domain}`}
        informational
      />

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        {!allVerified && (
          <button
            onClick={onVerify} disabled={verifying}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
            {verifying ? 'Checking DNS…' : 'Verify now'}
          </button>
        )}
        <button
          onClick={onRemove}
          className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-xl transition-colors"
        >
          Remove domain
        </button>
      </div>
    </div>
  )
}

function DomainsTab({ me }: { me: MeUser }) {
  const [domains, setDomains] = useState<DomainVerification[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  async function load() {
    const res = await fetch('/api/domain')
    if (res.ok) { const d = await res.json(); setDomains(d.domains || []) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function addDomain() {
    if (!newDomain.trim()) return
    setSubmitting(true); setError('')
    const res = await fetch('/api/domain', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: newDomain.trim() }),
    })
    setSubmitting(false)
    if (res.ok) {
      const d = await res.json()
      setDomains(prev => [d.domain, ...prev.filter(x => x.id !== d.domain.id)])
      setExpanded(d.domain.id)
      setShowAdd(false); setNewDomain('')
    } else {
      const d = await res.json()
      setError(d.error || 'Failed to add domain')
    }
  }

  async function verify(id: string) {
    setVerifying(id)
    const res = await fetch(`/api/domain/${id}/verify`, { method: 'POST' })
    setVerifying(null)
    if (res.ok) {
      const d = await res.json()
      setDomains(prev => prev.map(x => x.id === id ? d.domain : x))
      if (d.verified) setToast({ msg: '✅ Domain authenticated! You can now send from this domain.', type: 'success' })
      else setToast({ msg: 'DNS records not detected yet. It can take up to 48 hours for DNS to propagate globally.', type: 'error' })
    }
  }

  async function remove(id: string, domain: string) {
    if (!confirm(`Remove ${domain}? This will also remove it from Postmark.`)) return
    const res = await fetch(`/api/domain/${id}`, { method: 'DELETE' })
    if (res.ok) { setDomains(prev => prev.filter(x => x.id !== id)); setExpanded(null) }
  }

  if (!me.isOwner) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
      <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 text-sm">Only the account owner can manage domain verification.</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800">
        <strong>Why authenticate your domain?</strong>{' '}
        Google, Yahoo, and Microsoft now require DKIM and DMARC for bulk senders. When your domain is authenticated,
        emails show <em>From: you@yourdomain.com</em> — recipients see your brand, not a shared sender.
        Without authentication, we use our default sender with your email in Reply-To.
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Your domains</h3>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add domain
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl border border-blue-300 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-800">Authenticate a sending domain</p>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}
          <div className="flex gap-2">
            <input
              type="text" value={newDomain} onChange={e => setNewDomain(e.target.value)}
              placeholder="yourdomain.com" autoFocus
              onKeyDown={e => e.key === 'Enter' && addDomain()}
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50 focus:bg-white"
            />
            <button onClick={addDomain} disabled={submitting || !newDomain.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
              {submitting ? 'Adding…' : 'Get DNS records'}
            </button>
            <button onClick={() => { setShowAdd(false); setError('') }} className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50">
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-400">Enter the root domain only — e.g. <code>aptnetwork.com</code>, not <code>www.aptnetwork.com</code></p>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
      ) : domains.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <Globe className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No domains added yet</p>
          <p className="text-xs text-gray-400 mt-1">Authenticate your sending domain to show your brand in the From address</p>
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map(d => (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Domain header row */}
              <div className="flex items-center gap-3 px-5 py-4">
                <Globe className={`w-5 h-5 flex-shrink-0 ${d.status === 'verified' ? 'text-green-500' : 'text-amber-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{d.domain}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Added {new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {d.status === 'verified' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                      <CheckCircle className="w-3 h-3" /> Authenticated
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                      <AlertCircle className="w-3 h-3" /> Pending DNS
                    </span>
                  )}
                  <button
                    onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                    className="text-xs font-medium text-gray-500 hover:text-gray-800 px-2.5 py-1 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors"
                  >
                    {expanded === d.id ? 'Hide records' : 'View DNS records'}
                  </button>
                </div>
              </div>

              {/* Expanded DNS records panel */}
              {expanded === d.id && (
                <div className="border-t border-gray-100 px-5 py-5 bg-gray-50/30">
                  <DomainRecordsPanel
                    d={d}
                    onVerify={() => verify(d.id)}
                    verifying={verifying === d.id}
                    onRemove={() => remove(d.id, d.domain)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Developer settings ──────────────────────────────────────────────────
function DeveloperTab({ me }: { me: MeUser }) {
  const [copied, setCopied] = useState(false)
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const webhookUrl = `${appUrl}/api/webhooks/postmark`
  function copyWebhook() { navigator.clipboard.writeText(webhookUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  if (!me.isOwner) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
      <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 text-sm">Only the account owner can view developer settings.</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {me.isAdmin && (
        <div className="bg-gray-900 text-white rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold">Admin Panel</p>
            <p className="text-sm text-gray-400 mt-0.5">Manage API keys, all accounts, and platform settings</p>
          </div>
          <a href="/admin" className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors">
            <LayoutDashboard className="w-4 h-4" /> Open Admin Panel
          </a>
        </div>
      )}

      <SectionCard title="Postmark webhook">
        <p className="text-sm text-gray-600 mb-3">Add this URL in Postmark to track opens, clicks, and bounces in real time.</p>
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
      </SectionCard>

      <SectionCard title="AI Template Maker">
        <p className="text-sm text-gray-500 mb-3">Generate professional email templates using Claude AI.</p>
        <p className="text-sm text-gray-500">API key is managed by your platform administrator.</p>
        <a href="/templates/ai-maker" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-3"><ExternalLink className="w-3.5 h-3.5" /> Open AI Template Maker</a>
      </SectionCard>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
const ALL_TABS = [
  { id: 'account', label: 'Account details', adminOnly: false },
  { id: 'emails', label: 'Account emails', adminOnly: false },
  { id: 'domains', label: 'Domain verification', adminOnly: false },
  { id: 'team', label: 'Team members', adminOnly: false },
  { id: 'developer', label: 'Developer', adminOnly: true },
] as const

type TabId = typeof ALL_TABS[number]['id']

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({})
  const [me, setMe] = useState<MeUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('account')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  function showToast(msg: string, type: 'success' | 'error') { setToast({ msg, type }) }

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/me').then(r => r.json()),
    ]).then(([s, m]) => { setSettings(s || {}); setMe(m); setLoading(false) })
  }, [])

  async function saveSettings(updated: Settings): Promise<boolean> {
    const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
    if (res.ok) { setSettings(updated); showToast('Settings saved', 'success'); return true }
    showToast('Failed to save settings', 'error'); return false
  }

  async function saveMe(name: string, phone: string): Promise<boolean> {
    const res = await fetch('/api/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone }) })
    if (res.ok) { setMe(m => m ? { ...m, name, phone } : m); showToast('Profile updated', 'success'); return true }
    showToast('Failed to update profile', 'error'); return false
  }

  if (loading || !me) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">My Account: {me.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${me.isOwner ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
            <Shield className="w-3 h-3" />{me.isOwner ? 'Account owner' : 'Team member'}
          </span>
          {me.isAdmin && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-900 text-white">
              <Shield className="w-3 h-3" /> Admin
            </span>
          )}
          <span className="text-sm text-gray-500">{me.email}</span>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {ALL_TABS.filter(t => !t.adminOnly || me.isAdmin).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}
            >{t.label}</button>
          ))}
        </nav>
      </div>

      {tab === 'account' && <AccountDetailsTab settings={settings} me={me} onSaveSettings={saveSettings} onSaveMe={saveMe} toast={showToast} />}
      {tab === 'emails' && <AccountEmailsTab settings={settings} me={me} onTabChange={t => setTab(t as TabId)} />}
      {tab === 'domains' && <DomainsTab me={me} />}
      {tab === 'team' && <TeamMembersTab me={me} onOwnershipTransferred={() => window.location.reload()} />}
      {tab === 'developer' && <DeveloperTab me={me} />}
    </div>
  )
}
