'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Settings, LogOut, User, HelpCircle, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  user?: { name: string; email: string }
}

export function Header({ user }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = user?.name
    ? user.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?'

  const displayName = user?.name || user?.email?.split('@')[0] || 'Account'

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-end px-6 gap-3">
      {/* AI Assistant link */}
      <Link
        href="/templates/ai-maker"
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        AI Template Maker
      </Link>

      {/* Help */}
      <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
        <HelpCircle className="w-4.5 h-4.5" />
      </button>

      {/* Account dropdown */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <span className="text-sm font-medium text-gray-800 max-w-[120px] truncate hidden sm:block">
            {displayName}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-dropdown z-50 overflow-hidden">
            {/* User info */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Signed in as</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{user?.name || '—'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>

            {/* Actions */}
            <div className="py-1.5">
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-400" />
                Settings
              </Link>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
