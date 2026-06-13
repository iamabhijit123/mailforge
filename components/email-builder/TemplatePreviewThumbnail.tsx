'use client'

import { useRef, useEffect, useState } from 'react'
import { FileText } from 'lucide-react'

interface Props {
  html: string | null | undefined
  height?: number
}

export function TemplatePreviewThumbnail({ html, height = 120 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.4)

  useEffect(() => {
    if (ref.current) {
      setScale(ref.current.offsetWidth / 600)
    }
  }, [])

  if (!html) {
    return (
      <div
        ref={ref}
        className="w-full rounded-md border border-gray-100 bg-gray-50 flex flex-col items-center justify-center gap-1"
        style={{ height }}
      >
        <FileText className="w-6 h-6 text-gray-200" />
        <span className="text-xs text-gray-300">No preview</span>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className="w-full rounded-md overflow-hidden relative bg-white border border-gray-100"
      style={{ height }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 600,
          height: height / scale,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        <iframe
          srcDoc={html}
          title="Email preview"
          style={{ width: '100%', height: '100%', border: 'none' }}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  )
}
