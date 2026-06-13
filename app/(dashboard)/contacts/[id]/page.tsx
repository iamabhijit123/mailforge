'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Input, Badge, Select, Toast } from '@/components/ui'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface Contact {
  id: string; email: string; first_name: string | null; last_name: string | null
  phone: string | null; company: string | null; status: string; source: string
  tags: string; created_at: string; updated_at: string; lists: Array<{ id: string; name: string }>
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', phone: '', company: '', status: '' })

  useEffect(() => {
    fetch(`/api/contacts/${id}`).then(r => r.json()).then(data => {
      setContact(data)
      setForm({ email: data.email || '', first_name: data.first_name || '', last_name: data.last_name || '', phone: data.phone || '', company: data.company || '', status: data.status || 'subscribed' })
      setLoading(false)
    })
  }, [id])

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/contacts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { setToast({ msg: 'Saved', type: 'success' }); const d = await res.json(); setContact({ ...contact!, ...d }) }
    else setToast({ msg: 'Failed to save', type: 'error' })
    setSaving(false)
  }

  async function deleteContact() {
    if (!confirm('Delete this contact?')) return
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    router.push('/contacts')
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
  if (!contact) return <div className="text-center text-gray-500 mt-20">Contact not found</div>

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="max-w-2xl space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center gap-4">
        <Link href="/contacts" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{[contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email}</h1>
          <p className="text-sm text-gray-500">Added {formatDate(contact.created_at)}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="danger" size="sm" onClick={deleteContact}><Trash2 className="w-3.5 h-3.5" /></Button>
          <Button size="sm" onClick={save} loading={saving}><Save className="w-3.5 h-3.5" /> Save</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
        <Input label="Email" type="email" value={form.email} onChange={set('email')} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" value={form.first_name} onChange={set('first_name')} />
          <Input label="Last Name" value={form.last_name} onChange={set('last_name')} />
        </div>
        <Input label="Phone" value={form.phone} onChange={set('phone')} />
        <Input label="Company" value={form.company} onChange={set('company')} />
        <Select label="Status" value={form.status} onChange={set('status')} options={[{ value: 'subscribed', label: 'Subscribed' }, { value: 'unsubscribed', label: 'Unsubscribed' }, { value: 'bounced', label: 'Bounced' }]} />
      </div>

      {contact.lists?.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Lists</h2>
          <div className="flex flex-wrap gap-2">
            {contact.lists.map(l => <Badge key={l.id} variant="info">{l.name}</Badge>)}
          </div>
        </div>
      )}
    </div>
  )
}
