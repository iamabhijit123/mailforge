'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, List, Mail, FileText, Zap,
  BarChart2, Settings, LogOut, Send, ChevronDown, Plus,
  Sparkles, Plug,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  children?: { href: string; label: string }[]
}

const nav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    href: '/campaigns',
    label: 'Campaigns',
    icon: Send,
    children: [
      { href: '/campaigns', label: 'All Campaigns' },
      { href: '/campaigns/new', label: 'New Campaign' },
    ],
  },
  {
    href: '/contacts',
    label: 'Contacts',
    icon: Users,
    children: [
      { href: '/contacts', label: 'All Contacts' },
      { href: '/lists', label: 'Contact Lists' },
    ],
  },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/automation', label: 'Automation', icon: Zap },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/integrations', label: 'Integrations', icon: Plug },
]

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  const hasChildren = item.children && item.children.length > 0
  const [open, setOpen] = useState(isActive)
  const Icon = item.icon

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
            isActive
              ? 'text-blue-700 bg-blue-50'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-blue-600' : 'text-gray-400')} />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="ml-[30px] mt-0.5 space-y-0.5 border-l border-gray-200 pl-3">
            {item.children!.map(child => {
              const childActive = pathname === child.href
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    'block py-1.5 px-2 text-sm rounded-md transition-colors',
                    childActive ? 'text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  {child.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150',
        isActive
          ? 'text-blue-700 bg-blue-50'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-blue-600' : 'text-gray-400')} />
      {item.label}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 w-56 bg-white flex flex-col"
      style={{ boxShadow: '1px 0 0 0 #E5E7EB' }}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)' }}>
            <Mail className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 tracking-tight text-[15px]">MailForge</span>
        </div>
      </div>

      {/* Create button */}
      <div className="px-3 py-3 border-b border-gray-100">
        <Link href="/campaigns/new">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Create
          </button>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {nav.map(item => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-100 py-2 px-2 space-y-0.5">
        <Link
          href="/templates/ai-maker"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150',
            pathname === '/templates/ai-maker'
              ? 'text-blue-700 bg-blue-50'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <Sparkles className={cn('w-4 h-4 flex-shrink-0', pathname === '/templates/ai-maker' ? 'text-blue-600' : 'text-gray-400')} />
          AI Template Maker
        </Link>
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150',
            pathname === '/settings'
              ? 'text-blue-700 bg-blue-50'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <Settings className={cn('w-4 h-4 flex-shrink-0', pathname === '/settings' ? 'text-blue-600' : 'text-gray-400')} />
          Settings
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 text-gray-600 hover:bg-gray-100 hover:text-gray-900">
            <LogOut className="w-4 h-4 flex-shrink-0 text-gray-400" />
            Log out
          </button>
        </form>
      </div>
    </aside>
  )
}
