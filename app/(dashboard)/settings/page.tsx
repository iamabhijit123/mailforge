'use client'

import { useEffect, useState } from 'react'
import { Button, Input, Toast } from '@/components/ui'
import { Save, Eye, EyeOff, ExternalLink } from 'lucide-react'

interface Settings {
  postmark_api_key?: string
  postmark_message_stream?: string
  sender_name?: string
  sender_email?: string
  reply_to?: string
  company_name?: string
  company_address?: string
  website?: string
  logo_url?: string
  anthropic_api_key?: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => { setSettings(s || {}); setLoading(false) })
  }, [])

  async function save() {
    setSaving(true)
    const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
    setSaving(false)
    if (res.ok) setToast({ msg: 'Settings saved', type: 'success' })
    else setToast({ msg: 'Failed to save', type: 'error' })
  }

  const set = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => setSettings(s => ({ ...s, [k]: e.target.value }))

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

  return (
    <div className="max-w-2xl space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure your sending credentials and company info</p>
        </div>
        <Button onClick={save} loading={saving}><Save className="w-4 h-4" /> Save Settings</Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">Postmark Configuration</h2>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          You need a <a href="https://postmarkapp.com" target="_blank" rel="noopener" className="font-medium underline">Postmark account</a> to send emails. After signing up, get your Server API Token from your server settings.
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Postmark Server API Token</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.postmark_api_key || ''}
              onChange={set('postmark_api_key')}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="block w-full pr-10 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Input label="Message Stream" value={settings.postmark_message_stream || 'broadcast'} onChange={set('postmark_message_stream')} hint="Use 'broadcast' for marketing emails (default)" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">Default Sender</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Sender Name" value={settings.sender_name || ''} onChange={set('sender_name')} placeholder="Your Name or Brand" />
          <Input label="Sender Email" type="email" value={settings.sender_email || ''} onChange={set('sender_email')} placeholder="you@yourdomain.com" hint="Must be verified in Postmark" />
        </div>
        <Input label="Reply-To Email (optional)" type="email" value={settings.reply_to || ''} onChange={set('reply_to')} placeholder="Same as sender email" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">Company Info</h2>
        <p className="text-xs text-gray-500">Required by CAN-SPAM Act. Shown in the footer of every email.</p>
        <Input label="Company Name" value={settings.company_name || ''} onChange={set('company_name')} />
        <Input label="Company Address" value={settings.company_address || ''} onChange={set('company_address')} placeholder="123 Main St, City, ST 12345" />
        <Input label="Website" type="url" value={settings.website || ''} onChange={set('website')} placeholder="https://yoursite.com" />
        <Input label="Logo URL (optional)" value={settings.logo_url || ''} onChange={set('logo_url')} placeholder="https://yoursite.com/logo.png" hint="Used in email header blocks" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Postmark Webhooks</h2>
        <p className="text-sm text-gray-600">To track email opens, clicks, bounces, and unsubscribes, configure this webhook URL in your Postmark server settings.</p>
        <div className="flex items-center gap-2 bg-gray-50 rounded border border-gray-200 px-3 py-2">
          <code className="text-sm text-gray-800 flex-1">{appUrl}/api/webhooks/postmark</code>
          <button onClick={() => { navigator.clipboard.writeText(`${appUrl}/api/webhooks/postmark`); setToast({ msg: 'Copied!', type: 'success' }) }} className="text-xs text-brand-600 hover:underline">Copy</button>
        </div>
        <p className="text-xs text-gray-500">In Postmark: Settings → Webhooks → Add webhook. Enable: Delivery, Open, Click, Bounce, SpamComplaint, SubscriptionChange.</p>
        <a href="https://postmarkapp.com/support/article/1105-webhooks" target="_blank" rel="noopener" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
          <ExternalLink className="w-3.5 h-3.5" /> Postmark webhook docs
        </a>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">AI Template Maker</h2>
        <p className="text-sm text-gray-600">
          The AI Template Maker uses Claude to generate professional HTML emails and flyers.
          Get a free API key at{' '}
          <a href="https://console.anthropic.com" target="_blank" rel="noopener" className="text-brand-600 hover:underline">console.anthropic.com</a>.
        </p>
        <div className="relative">
          <Input
            label="Anthropic API Key"
            type={showKey ? 'text' : 'password'}
            value={settings.anthropic_api_key || ''}
            onChange={set('anthropic_api_key')}
            placeholder="sk-ant-..."
            hint="Used only for the AI Template Maker — stored in your local database"
          />
          <button
            type="button"
            className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
            onClick={() => setShowKey(v => !v)}
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <a href="/templates/ai-maker" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
          <ExternalLink className="w-3.5 h-3.5" /> Open AI Template Maker
        </a>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} loading={saving}><Save className="w-4 h-4" /> Save Settings</Button>
      </div>
    </div>
  )
}
