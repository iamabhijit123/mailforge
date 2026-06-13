'use client'

import { EmailBlock } from '@/lib/email-html'
import { Input, Textarea, Select } from '@/components/ui'
import { Plus, X } from 'lucide-react'

interface BlockSettingsProps {
  block: EmailBlock | null
  onChange: (props: Record<string, unknown>) => void
}

export function BlockSettings({ block, onChange }: BlockSettingsProps) {
  if (!block) {
    return (
      <div className="w-56 flex-shrink-0 bg-white border-l border-gray-200 flex items-center justify-center p-4">
        <p className="text-xs text-gray-400 text-center">Select a block to edit its settings</p>
      </div>
    )
  }

  const p = block.props
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange({ [key]: e.target.value })

  return (
    <div className="w-64 flex-shrink-0 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 capitalize">{block.type} Settings</h3>
      </div>

      <div className="p-4 space-y-4">
        {block.type === 'header' && (
          <>
            <Input label="Title / Company Name" value={p.title as string || ''} onChange={set('title')} />
            <Input label="Logo URL" value={p.logoUrl as string || ''} onChange={set('logoUrl')} placeholder="https://..." />
            <ColorInput label="Background Color" value={p.backgroundColor as string || '#2563eb'} onChange={v => onChange({ backgroundColor: v })} />
            <ColorInput label="Text Color" value={p.color as string || '#ffffff'} onChange={v => onChange({ color: v })} />
            <Select label="Alignment" value={p.align as string || 'center'} onChange={set('align')} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} />
          </>
        )}

        {block.type === 'text' && (
          <>
            <Textarea label="Content (HTML supported)" value={p.content as string || ''} onChange={set('content')} rows={6} />
            <Input label="Font Size" value={p.fontSize as string || '16px'} onChange={set('fontSize')} placeholder="16px" />
            <ColorInput label="Text Color" value={p.color as string || '#333333'} onChange={v => onChange({ color: v })} />
            <Input label="Padding" value={p.padding as string || '20px 30px'} onChange={set('padding')} placeholder="20px 30px" />
            <Select label="Alignment" value={p.align as string || 'left'} onChange={set('align')} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} />
            <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
              Use: {'{{first_name}}'}, {'{{last_name}}'}, {'{{email}}'}
            </div>
          </>
        )}

        {block.type === 'image' && (
          <>
            <Input label="Image URL" value={p.src as string || ''} onChange={set('src')} placeholder="https://..." />
            <Input label="Alt Text" value={p.alt as string || ''} onChange={set('alt')} />
            <Input label="Link URL (optional)" value={p.link as string || ''} onChange={set('link')} placeholder="https://..." />
            <Select label="Alignment" value={p.align as string || 'center'} onChange={set('align')} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} />
            <Input label="Padding" value={p.padding as string || '20px 30px'} onChange={set('padding')} />
          </>
        )}

        {block.type === 'button' && (
          <>
            <Input label="Button Text" value={p.text as string || ''} onChange={set('text')} />
            <Input label="URL" value={p.url as string || ''} onChange={set('url')} placeholder="https://..." />
            <ColorInput label="Background Color" value={p.backgroundColor as string || '#2563eb'} onChange={v => onChange({ backgroundColor: v })} />
            <ColorInput label="Text Color" value={p.color as string || '#ffffff'} onChange={v => onChange({ color: v })} />
            <Select label="Alignment" value={p.align as string || 'center'} onChange={set('align')} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} />
            <Input label="Border Radius" value={p.borderRadius as string || '4px'} onChange={set('borderRadius')} placeholder="4px" />
          </>
        )}

        {block.type === 'divider' && (
          <>
            <ColorInput label="Color" value={p.color as string || '#e5e7eb'} onChange={v => onChange({ color: v })} />
            <Input label="Thickness" value={p.thickness as string || '1px'} onChange={set('thickness')} placeholder="1px" />
            <Input label="Padding" value={p.padding as string || '10px 30px'} onChange={set('padding')} />
          </>
        )}

        {block.type === 'spacer' && (
          <Input label="Height" value={p.height as string || '30px'} onChange={set('height')} placeholder="30px" />
        )}

        {block.type === 'columns' && (
          <>
            <Textarea label="Left Column HTML" value={p.leftContent as string || ''} onChange={set('leftContent')} rows={4} />
            <Textarea label="Right Column HTML" value={p.rightContent as string || ''} onChange={set('rightContent')} rows={4} />
            <Input label="Padding" value={p.padding as string || '20px 30px'} onChange={set('padding')} />
            <Input label="Font Size" value={p.fontSize as string || '16px'} onChange={set('fontSize')} />
            <ColorInput label="Text Color" value={p.color as string || '#333333'} onChange={v => onChange({ color: v })} />
          </>
        )}

        {block.type === 'social' && (
          <SocialLinksEditor
            links={(p.links as Array<{ platform: string; url: string }>) || []}
            onChange={links => onChange({ links })}
            align={p.align as string || 'center'}
            onAlignChange={v => onChange({ align: v })}
          />
        )}

        {block.type === 'footer' && (
          <>
            <Textarea label="Footer Text" value={p.text as string || ''} onChange={set('text')} rows={3} hint="Company name, address, etc." />
            <Input label="Unsubscribe Link Text" value={p.unsubscribeText as string || 'Unsubscribe'} onChange={set('unsubscribeText')} />
            <ColorInput label="Background Color" value={p.backgroundColor as string || '#f9fafb'} onChange={v => onChange({ backgroundColor: v })} />
            <ColorInput label="Text Color" value={p.color as string || '#6b7280'} onChange={v => onChange({ color: v })} />
            <Input label="Font Size" value={p.fontSize as string || '12px'} onChange={set('fontSize')} />
          </>
        )}
      </div>
    </div>
  )
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0.5" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm font-mono" />
      </div>
    </div>
  )
}

function SocialLinksEditor({ links, onChange, align, onAlignChange }: {
  links: Array<{ platform: string; url: string }>
  onChange: (links: Array<{ platform: string; url: string }>) => void
  align: string
  onAlignChange: (v: string) => void
}) {
  const PLATFORMS = ['Facebook', 'Twitter', 'Instagram', 'LinkedIn', 'YouTube', 'TikTok']

  function addLink() {
    onChange([...links, { platform: 'Facebook', url: '' }])
  }

  function removeLink(i: number) {
    onChange(links.filter((_, idx) => idx !== i))
  }

  function updateLink(i: number, field: 'platform' | 'url', value: string) {
    const updated = links.map((l, idx) => idx === i ? { ...l, [field]: value } : l)
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <Select label="Alignment" value={align} onChange={e => onAlignChange(e.target.value)} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} />
      {links.map((link, i) => (
        <div key={i} className="bg-gray-50 rounded p-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">Link {i + 1}</span>
            <button onClick={() => removeLink(i)} className="text-red-400 hover:text-red-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <select
            value={link.platform}
            onChange={e => updateLink(i, 'platform', e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input
            value={link.url}
            onChange={e => updateLink(i, 'url', e.target.value)}
            placeholder="https://..."
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      ))}
      <button onClick={addLink} className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
        <Plus className="w-3.5 h-3.5" /> Add social link
      </button>
    </div>
  )
}
