'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Settings } from 'lucide-react'

export default function AiTemplateMakerPage() {
  const [hasKey, setHasKey] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/ai-status')
      .then(r => r.json())
      .then(s => setHasKey(!!(s.available)))
      .catch(() => setHasKey(false))
  }, [])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6">
      {hasKey === false && (
        <div className="mx-6 mt-4 mb-0 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3 flex-shrink-0">
          <Settings className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            Anthropic API key not configured.{' '}
            <Link href="/admin/settings" className="underline font-semibold">Admin → Settings</Link>{' '}
            to add it and enable the AI Template Maker.
          </p>
        </div>
      )}
      <iframe
        src="/template-maker/index.html"
        title="AI Template Maker"
        className="flex-1 w-full border-0"
        allow="clipboard-write"
      />
    </div>
  )
}
