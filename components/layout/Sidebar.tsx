'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, List, Mail, FileText, Zap, FormInput,
  BarChart2, Settings, LogOut, Send,
} from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/lists', label: 'Lists', icon: List },
  { href: '/campaigns', label: 'Campaigns', icon: Send },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/automation', label: 'Automation', icon: Zap },
  { href: '/forms', label: 'Sign-up Forms', icon: FormInput },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-56 bg-gray-900 flex flex-col">
      <div className="h-16 flex items-center px-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-sm">MailForge</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {nav.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                active
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-700 p-2 space-y-0.5">
        <Link href="/settings" className={cn('flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors', pathname === '/settings' && 'bg-brand-600 text-white')}>
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </form>
      </div>
    </aside>
  )
}
