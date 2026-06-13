'use client'

import { useEffect, useState } from 'react'
import { Button, Badge, Modal, Input, Select, Toast } from '@/components/ui'
import { Plus, FormInput, Copy, Code2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Form { id: string; name: string; list_id: string | null; list_name: string | null; active: number; submissions: number; created_at: string }
interface List { id: string; name: string }

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([])
  const [lists, setLists] = useState<List[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [embedForm, setEmbedForm] = useState<Form | null>(null)
  const [form, setForm] = useState({ name: '', list_id: '' })
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  async function load() {
    const [formsRes, listsRes] = await Promise.all([fetch('/api/forms'), fetch('/api/lists')])
    setForms(await formsRes.json())
    setLists(await listsRes.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function createForm() {
    if (!form.name) return
    const config = {
      title: form.name,
      fields: ['email', 'first_name', 'last_name'],
      button_text: 'Subscribe',
      success_message: 'Thank you for subscribing!',
    }
    const res = await fetch('/api/forms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, config }) })
    if (res.ok) { setShowCreate(false); load(); setToast({ msg: 'Form created', type: 'success' }) }
  }

  async function toggleForm(f: Form) {
    await fetch(`/api/forms/${f.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !f.active }) })
    load()
  }

  async function deleteForm(id: string) {
    if (!confirm('Delete this form?')) return
    await fetch(`/api/forms/${id}`, { method: 'DELETE' })
    load()
    setToast({ msg: 'Form deleted', type: 'success' })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  function getEmbedCode(f: Form) {
    return `<form id="subscribe-form" style="max-width:400px;margin:0 auto;font-family:Arial,sans-serif;">
  <h3 style="margin-bottom:16px;">${f.name}</h3>
  <input name="email" type="email" placeholder="Your email address" required style="display:block;width:100%;padding:10px;margin-bottom:10px;border:1px solid #d1d5db;border-radius:4px;font-size:14px;box-sizing:border-box;"/>
  <input name="first_name" type="text" placeholder="First name" style="display:block;width:100%;padding:10px;margin-bottom:10px;border:1px solid #d1d5db;border-radius:4px;font-size:14px;box-sizing:border-box;"/>
  <input name="last_name" type="text" placeholder="Last name" style="display:block;width:100%;padding:10px;margin-bottom:10px;border:1px solid #d1d5db;border-radius:4px;font-size:14px;box-sizing:border-box;"/>
  <button type="submit" style="display:block;width:100%;padding:12px;background:#2563eb;color:#fff;border:none;border-radius:4px;font-size:14px;font-weight:bold;cursor:pointer;">Subscribe</button>
  <p id="subscribe-message" style="margin-top:12px;text-align:center;color:#16a34a;display:none;"></p>
</form>
<script>
document.getElementById('subscribe-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const res = await fetch('${appUrl}/api/forms/${f.id}/subscribe', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({email: fd.get('email'), first_name: fd.get('first_name'), last_name: fd.get('last_name')})
  });
  const data = await res.json();
  const msg = document.getElementById('subscribe-message');
  if (res.ok) { msg.textContent = data.message; msg.style.display = 'block'; e.target.reset(); }
  else { msg.textContent = data.error; msg.style.color = '#dc2626'; msg.style.display = 'block'; }
});
</script>`
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sign-up Forms</h1>
          <p className="text-sm text-gray-500 mt-1">Embed forms on your website to grow your list</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-3.5 h-3.5" /> Create Form</Button>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> :
        forms.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <FormInput className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No forms yet. Create one and embed it on your site.</p>
            <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-3.5 h-3.5" /> Create form</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {forms.map(f => (
              <div key={f.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{f.name}</h3>
                    {f.list_name && <p className="text-xs text-gray-500 mt-0.5">→ {f.list_name}</p>}
                  </div>
                  <Badge variant={f.active ? 'success' : 'default'}>{f.active ? 'Active' : 'Inactive'}</Badge>
                </div>
                <p className="text-sm text-gray-600">{f.submissions || 0} submissions</p>
                <p className="text-xs text-gray-400">Created {formatDate(f.created_at)}</p>
                <div className="flex gap-2 pt-1 border-t border-gray-100">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEmbedForm(f)}><Code2 className="w-3.5 h-3.5" /> Embed Code</Button>
                  <button onClick={() => toggleForm(f)} className={`p-2 rounded ${f.active ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`} title={f.active ? 'Deactivate' : 'Activate'}>
                    {f.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => deleteForm(f.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )
      }

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Sign-up Form" size="sm">
        <div className="space-y-4">
          <Input label="Form Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Newsletter Sign-up" autoFocus />
          <Select
            label="Add subscribers to list"
            value={form.list_id}
            onChange={e => setForm(f => ({ ...f, list_id: e.target.value }))}
            options={[{ value: '', label: 'No list (contacts only)' }, ...lists.map(l => ({ value: l.id, label: l.name }))]}
          />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={createForm}>Create Form</Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!embedForm} onClose={() => setEmbedForm(null)} title="Embed Code" size="lg">
        {embedForm && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Copy and paste this code into any page on your website.</p>
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto max-h-64">{getEmbedCode(embedForm)}</pre>
              <button
                onClick={() => { navigator.clipboard.writeText(getEmbedCode(embedForm)); setToast({ msg: 'Copied to clipboard!', type: 'success' }); setEmbedForm(null) }}
                className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <p className="text-xs text-gray-500">The form submits to <code className="bg-gray-100 px-1 rounded">{appUrl}/api/forms/{embedForm.id}/subscribe</code></p>
          </div>
        )}
      </Modal>
    </div>
  )
}
