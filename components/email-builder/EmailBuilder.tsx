'use client'

import { useState, useEffect, useRef } from 'react'
import { EmailBlock, generateEmailHtml } from '@/lib/email-html'
import { Eye, Sparkles } from 'lucide-react'

interface EmailBuilderProps {
  blocks: EmailBlock[]
  initialHtml?: string
  onChange: (blocks: EmailBlock[], html: string) => void
}

export function EmailBuilder({ blocks, initialHtml, onChange }: EmailBuilderProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'html'>('ai')
  const [htmlSource, setHtmlSource] = useState(() => initialHtml || generateEmailHtml(blocks))
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Listen for "Use in Editor" postMessage from the AI Template Maker iframe
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'mailforge_use_template' && typeof e.data.html === 'string') {
        setHtmlSource(e.data.html)
        onChange(blocks, e.data.html)
        setActiveTab('html')
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [blocks, onChange])

  function handleHtmlChange(value: string) {
    setHtmlSource(value)
    onChange(blocks, value)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-200 bg-white flex-shrink-0 px-2">
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-all ${
            activeTab === 'ai'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Template Maker
        </button>
        <button
          onClick={() => setActiveTab('html')}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-all ${
            activeTab === 'html'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          HTML Editor
        </button>
      </div>

      {/* AI Template Maker tab */}
      <div className={`flex-1 overflow-hidden ${activeTab === 'ai' ? 'flex' : 'hidden'}`}>
        <iframe
          ref={iframeRef}
          src="/template-maker/index.html"
          title="AI Template Maker"
          className="flex-1 w-full border-0"
          allow="clipboard-write"
        />
      </div>

      {/* HTML Editor tab */}
      <div className={`flex-1 flex-col overflow-hidden ${activeTab === 'html' ? 'flex' : 'hidden'}`}>
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 flex-shrink-0">
          <Eye className="w-3.5 h-3.5" />
          Edit HTML on the left — live preview updates on the right. Switch to AI Template Maker to generate a design, then click &quot;Use in Editor&quot;.
        </div>
        <div className="flex-1 flex overflow-hidden">
          <textarea
            className="w-1/2 p-4 font-mono text-xs text-gray-800 bg-white resize-none focus:outline-none border-r border-gray-200"
            value={htmlSource}
            onChange={e => handleHtmlChange(e.target.value)}
            spellCheck={false}
            placeholder="Paste or type your email HTML here, or use the AI Template Maker tab to generate one…"
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
    </div>
  )
}
