'use client'

import { EmailBlock } from '@/lib/email-html'
import { Type, Image, MousePointer, Minus, ArrowDownToLine, Columns, Share2, LayoutTemplate } from 'lucide-react'

const BLOCK_TYPES: Array<{ type: EmailBlock['type']; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { type: 'header', label: 'Header', icon: LayoutTemplate },
  { type: 'text', label: 'Text', icon: Type },
  { type: 'image', label: 'Image', icon: Image },
  { type: 'button', label: 'Button', icon: MousePointer },
  { type: 'columns', label: 'Two Columns', icon: Columns },
  { type: 'divider', label: 'Divider', icon: Minus },
  { type: 'spacer', label: 'Spacer', icon: ArrowDownToLine },
  { type: 'social', label: 'Social Links', icon: Share2 },
  { type: 'footer', label: 'Footer', icon: ArrowDownToLine },
]

interface BlockPaletteProps {
  onAdd: (type: EmailBlock['type']) => void
}

export function BlockPalette({ onAdd }: BlockPaletteProps) {
  return (
    <div className="w-44 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
        Blocks
      </div>
      <div className="p-2 space-y-1">
        {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => onAdd(type)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors text-left"
          >
            <Icon className="w-4 h-4 flex-shrink-0 text-gray-400" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
