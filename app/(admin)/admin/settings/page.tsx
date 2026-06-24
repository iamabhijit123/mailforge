'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, Save, CheckCircle, AlertCircle } from 'lucide-react'

interface AdminSettings {
  postmark_api_key: string; postmark_message_stream: string
  default_sender_name: string; default_sender_email: string; anthropic_api_key: string
}

function SecretInput({ label, value, onChange, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
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

export default function AdminSettingsPage() {
  const [form, setForm] = useState<AdminSettings>({
    postmark_api_key: '', postmark_message_stream: 'broadcast',
    default_sender_name: '', default_sender_email: '', anthropic_api_key: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => { setForm(f => ({ ...f, ...d })); setLoading(false) })
  }, [])

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    const res = await fetch('/api/admin/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    else setError('Failed to save settings')
  }

  const set = (k: keyof AdminSettings) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  if (loading) return <div className="py-20 text-center text-gray-400">Loading…</div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Global Settings</h1>
        <p className="text-gray-500 mt-1">Platform-wide API keys and defaults used by all accounts</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-green-700">
          <CheckCircle className="w-4 h-4" /> Settings saved successfully
        </div>
      )}

      {/* Postmark */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Postmark (Email delivery)</h2>
        <p className="text-sm text-gray-500 -mt-2">All emails sent by all accounts use this Postmark server token.</p>
        <SecretInput
          label="Server API Token"
          value={form.postmark_api_key}
          onChange={set('postmark_api_key')}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          hint="Found in Postmark → Servers → Your Server → API Tokens"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Message stream</label>
          <select
            value={form.postmark_message_stream}
            onChange={e => set('postmark_message_stream')(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50 focus:bg-white"
          >
            <option value="broadcast">broadcast (marketing emails)</option>
            <option value="outbound">outbound (transactional)</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">Use "broadcast" for marketing — it complies with unsubscribe regulations</p>
        </div>
      </div>

      {/* Default sender */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Default sender (fallback)</h2>
        <p className="text-sm text-gray-500 -mt-2">
          When an account's domain is <strong>not verified</strong>, emails are sent from this address with the account's email in Reply-To. This protects deliverability.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sender name</label>
            <input
              type="text" value={form.default_sender_name} onChange={e => set('default_sender_name')(e.target.value)}
              placeholder="MailForge"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sender email <span className="text-red-500">*</span></label>
            <input
              type="email" value={form.default_sender_email} onChange={e => set('default_sender_email')(e.target.value)}
              placeholder="noreply@yourdomain.com"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50 focus:bg-white"
            />
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
          <strong>Important:</strong> This email address must be a verified sender signature in Postmark. Domain authentication (SPF/DKIM) should also be configured for this domain.
        </div>
      </div>

      {/* Anthropic */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Anthropic (AI Template Maker)</h2>
        <p className="text-sm text-gray-500 -mt-2">Used by all accounts for AI email template generation.</p>
        <SecretInput
          label="Anthropic API Key"
          value={form.anthropic_api_key}
          onChange={set('anthropic_api_key')}
          placeholder="sk-ant-..."
          hint="Get this from console.anthropic.com"
        />
      </div>

      <button
        onClick={save} disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-60"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Saving…' : 'Save all settings'}
      </button>
    </div>
  )
}
