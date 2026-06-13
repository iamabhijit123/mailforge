'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Settings } from 'lucide-react'

export default function AiTemplateMakerPage() {
  const [hasKey, setHasKey] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(s => setHasKey(!!(s.anthropic_api_key)))
      .catch(() => setHasKey(false))
  }, [])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <Link href="/templates" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-sm font-semibold text-gray-900">AI Template Maker</h1>
          <p className="text-xs text-gray-500">Generate professional HTML emails and flyers powered by Claude AI</p>
        </div>
        <Link
          href="/templates"
          className="text-xs text-brand-600 hover:underline"
        >
          ← Back to Templates
        </Link>
      </div>

      {/* No API key warning */}
      {hasKey === false && (
        <div className="mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 flex-shrink-0">
          <Settings className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Anthropic API key required</p>
            <p className="text-sm text-amber-700 mt-0.5">
              The AI Template Maker uses Claude to generate emails. Add your Anthropic API key in{' '}
              <Link href="/settings" className="underline font-medium">Settings</Link>, then reload this page.
            </p>
          </div>
        </div>
      )}

      {/* Full-height iframe */}
      <iframe
        src="/template-maker/index.html"
        title="AI Template Maker"
        className="flex-1 w-full border-0"
        allow="clipboard-write"
      />
    </div>
  )
}
