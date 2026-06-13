'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { EmailBlock } from '@/lib/email-html'
import { cn } from '@/lib/utils'
import { GripVertical, Trash2, Copy } from 'lucide-react'

interface BlockCanvasProps {
  blocks: EmailBlock[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}

export function BlockCanvas({ blocks, selectedId, onSelect, onDelete, onDuplicate }: BlockCanvasProps) {
  return (
    <div className="space-y-0 shadow-md">
      {blocks.map(block => (
        <SortableBlock
          key={block.id}
          block={block}
          selected={selectedId === block.id}
          onSelect={() => onSelect(block.id)}
          onDelete={() => onDelete(block.id)}
          onDuplicate={() => onDuplicate(block.id)}
        />
      ))}
    </div>
  )
}

function SortableBlock({ block, selected, onSelect, onDelete, onDuplicate }: {
  block: EmailBlock
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group cursor-pointer bg-white',
        selected ? 'ring-2 ring-brand-500 ring-inset' : 'hover:ring-1 hover:ring-brand-300 hover:ring-inset'
      )}
      onClick={onSelect}
    >
      <BlockPreview block={block} />

      <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-1 bg-white shadow rounded px-1 py-0.5 z-10">
        <button
          {...attributes}
          {...listeners}
          className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing p-0.5"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <button
          className="text-gray-400 hover:text-brand-600 p-0.5"
          onClick={e => { e.stopPropagation(); onDuplicate() }}
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          className="text-gray-400 hover:text-red-600 p-0.5"
          onClick={e => { e.stopPropagation(); onDelete() }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {selected && (
        <div className="absolute top-0 left-0 bg-brand-500 text-white text-xs px-1.5 py-0.5 rounded-br font-medium">
          {block.type}
        </div>
      )}
    </div>
  )
}

function BlockPreview({ block }: { block: EmailBlock }) {
  const p = block.props

  switch (block.type) {
    case 'header':
      return (
        <div style={{ backgroundColor: p.backgroundColor as string || '#2563eb', padding: '20px 24px', textAlign: (p.align as 'center') || 'center' }}>
          {!!(p.logoUrl as string) && <img src={p.logoUrl as string} alt="" style={{ maxHeight: 48, maxWidth: 160, display: 'block', margin: p.align === 'center' ? '0 auto 8px' : '0 0 8px' }} />}
          {(p.title as string) && <span style={{ color: p.color as string || '#fff', fontSize: 20, fontWeight: 700 }}>{p.title as string}</span>}
        </div>
      )

    case 'text':
      return (
        <div
          style={{ padding: p.padding as string || '20px 24px', fontSize: p.fontSize as string || '16px', color: p.color as string || '#333', lineHeight: 1.6 }}
          dangerouslySetInnerHTML={{ __html: p.content as string || '<p>Text block</p>' }}
        />
      )

    case 'image':
      return (
        <div style={{ padding: p.padding as string || '16px 24px', textAlign: (p.align as 'center') || 'center' }}>
          {(p.src as string) ? (
            <img src={p.src as string} alt={p.alt as string || ''} style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} />
          ) : (
            <div style={{ background: '#f3f4f6', border: '2px dashed #d1d5db', padding: '32px', color: '#9ca3af', fontSize: 14 }}>
              Click to add image URL
            </div>
          )}
        </div>
      )

    case 'button':
      return (
        <div style={{ padding: p.padding as string || '16px 24px', textAlign: (p.align as 'center') || 'center' }}>
          <span style={{ background: p.backgroundColor as string || '#2563eb', color: p.color as string || '#fff', padding: '12px 24px', borderRadius: p.borderRadius as string || '4px', fontSize: 14, fontWeight: 700, display: 'inline-block' }}>
            {p.text as string || 'Button'}
          </span>
        </div>
      )

    case 'divider':
      return (
        <div style={{ padding: p.padding as string || '8px 24px' }}>
          <hr style={{ border: 'none', borderTop: `${p.thickness || '1px'} solid ${p.color || '#e5e7eb'}`, margin: 0 }} />
        </div>
      )

    case 'spacer':
      return <div style={{ height: p.height as string || '30px', background: '#f9fafb', position: 'relative' }}>
        <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#d1d5db', fontSize: 11 }}>
          {p.height as string || '30px'} spacer
        </span>
      </div>

    case 'columns':
      return (
        <div style={{ padding: p.padding as string || '16px 24px', display: 'flex', gap: 16 }}>
          <div style={{ flex: 1, fontSize: 14, color: p.color as string || '#333', minHeight: 48 }} dangerouslySetInnerHTML={{ __html: p.leftContent as string || '<p>Left</p>' }} />
          <div style={{ flex: 1, fontSize: 14, color: p.color as string || '#333', minHeight: 48 }} dangerouslySetInnerHTML={{ __html: p.rightContent as string || '<p>Right</p>' }} />
        </div>
      )

    case 'social':
      return (
        <div style={{ padding: p.padding as string || '16px 24px', textAlign: (p.align as 'center') || 'center' }}>
          {((p.links as Array<{ platform: string; url: string }>) || []).length === 0 ? (
            <span style={{ color: '#9ca3af', fontSize: 13 }}>No social links added yet</span>
          ) : (
            <div style={{ display: 'flex', gap: 8, justifyContent: (p.align === 'center' ? 'center' : p.align === 'right' ? 'flex-end' : 'flex-start') }}>
              {((p.links as Array<{ platform: string; url: string }>) || []).map((l, i) => (
                <span key={i} style={{ background: '#e5e7eb', padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>{l.platform}</span>
              ))}
            </div>
          )}
        </div>
      )

    case 'footer':
      return (
        <div style={{ background: p.backgroundColor as string || '#f9fafb', padding: '16px 24px', textAlign: 'center', fontSize: 12, color: p.color as string || '#6b7280', lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 4px' }}>{p.text as string || 'Company · Address'}</p>
          <p style={{ margin: 0 }}><span style={{ textDecoration: 'underline' }}>{p.unsubscribeText as string || 'Unsubscribe'}</span></p>
        </div>
      )

    default:
      return <div className="p-4 text-xs text-gray-400">Unknown block</div>
  }
}
