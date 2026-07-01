'use client'

import { useState } from 'react'
import { EmailBlock, generateEmailHtml } from '@/lib/email-html'
import { Eye } from 'lucide-react'

interface EmailBuilderProps {
  blocks: EmailBlock[]
  initialHtml?: string
  onChange: (blocks: EmailBlock[], html: string) => void
}

export function EmailBuilder({ blocks, initialHtml, onChange }: EmailBuilderProps) {
  const [htmlSource, setHtmlSource] = useState(() => initialHtml || generateEmailHtml(blocks))

  function handleHtmlChange(value: string) {
    setHtmlSource(value)
    onChange(blocks, value)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 flex-shrink-0">
        <Eye className="w-3.5 h-3.5" />
        Edit HTML on the left — live preview updates on the right. Use the AI Template Maker button above to generate a design.
      </div>
      <div className="flex-1 flex overflow-hidden">
        <textarea
          className="w-1/2 p-4 font-mono text-xs text-gray-800 bg-white resize-none focus:outline-none border-r border-gray-200"
          value={htmlSource}
          onChange={e => handleHtmlChange(e.target.value)}
          spellCheck={false}
          placeholder="Paste or type your email HTML here, or use the AI Template Maker to generate one…"
        />
        <div className="w-1/2 bg-gray-100 overflow-auto">
          <iframe
            srcDoc={htmlSource}
            title="Email Preview"
            className="w-full h-full border-0 bg-white"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  )
}
