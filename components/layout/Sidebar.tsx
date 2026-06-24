'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Mail, FileText, Zap,
  BarChart2, Settings, LogOut, Send, ChevronDown,
  Sparkles, Plug, RotateCcw, ChevronLeft, ChevronRight,
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
    href: '/campaigns', label: 'Campaigns', icon: Send,
    children: [
      { href: '/campaigns', label: 'All Campaigns' },
      { href: '/campaigns/new', label: 'New Campaign' },
    ],
  },
  {
    href: '/contacts', label: 'Contacts', icon: Users,
    children: [
      { href: '/contacts', label: 'All Contacts' },
      { href: '/lists', label: 'Contact Lists' },
    ],
  },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/recurring-campaigns', label: 'Recurring', icon: RotateCcw },
  { href: '/automation', label: 'Automation', icon: Zap },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/integrations', label: 'Integrations', icon: Plug },
]

function NavLink({ item, pathname, collapsed }: { item: NavItem; pathname: string; collapsed: boolean }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  const hasChildren = !collapsed && !!item.children?.length
  const [open, setOpen] = useState(isActive)
  const Icon = item.icon

  if (collapsed) {
    return (
      <Link href={item.href} title={item.label}
        className={cn(
          'flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-all',
          isActive ? 'text-blue-700 bg-blue-50' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        )}>
        <Icon className="w-5 h-5" />
      </Link>
    )
  }

  if (hasChildren) {
    return (
      <div>
        <button onClick={() => setOpen(o => !o)}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
            isActive ? 'text-blue-700 bg-blue-50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}>
          <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-blue-600' : 'text-gray-400')} />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="ml-[30px] mt-0.5 space-y-0.5 border-l border-gray-200 pl-3">
            {item.children!.map(child => (
              <Link key={child.href} href={child.href}
                className={cn('block py-1.5 px-2 text-sm rounded-md transition-colors',
                  pathname === child.href ? 'text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50')}>
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link href={item.href}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all',
        isActive ? 'text-blue-700 bg-blue-50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}>
      <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-blue-600' : 'text-gray-400')} />
      {item.label}
    </Link>
  )
}

interface SidebarProps { collapsed: boolean; onToggle: () => void }

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 bg-white flex flex-col transition-[width] duration-200',
        collapsed ? 'w-14' : 'w-56'
      )}
      style={{ boxShadow: '1px 0 0 0 #E5E7EB' }}
    >
      {/* Logo */}
      <div className="h-14 flex items-center border-b border-gray-100 flex-shrink-0 px-3">
        <div className={cn('flex items-center gap-2', collapsed && 'justify-center w-full')}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)' }}>
            <Mail className="w-4 h-4 text-white" />
          </div>
          {!collapsed && <span className="font-bold text-gray-900 tracking-tight text-[15px] truncate">MailForge</span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 overflow-y-auto py-3 space-y-0.5', collapsed ? 'px-1' : 'px-2')}>
        {nav.map(item => (
          <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom links */}
      <div className={cn('border-t border-gray-100 py-2 space-y-0.5', collapsed ? 'px-1' : 'px-2')}>
        {collapsed ? (
          <>
            <Link href="/templates/ai-maker" title="AI Template Maker"
              className={cn('flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-colors',
                pathname === '/templates/ai-maker' ? 'text-blue-700 bg-blue-50' : 'text-gray-500 hover:bg-gray-100')}>
              <Sparkles className="w-5 h-5" />
            </Link>
            <Link href="/settings" title="Settings"
              className={cn('flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-colors',
                pathname === '/settings' ? 'text-blue-700 bg-blue-50' : 'text-gray-500 hover:bg-gray-100')}>
              <Settings className="w-5 h-5" />
            </Link>
            <form action="/api/auth/logout" method="POST" className="flex justify-center">
              <button type="submit" title="Log out"
                className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/templates/ai-maker"
              className={cn('flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all',
                pathname === '/templates/ai-maker' ? 'text-blue-700 bg-blue-50' : 'text-gray-600 hover:bg-gray-100')}>
              <Sparkles className={cn('w-4 h-4 flex-shrink-0', pathname === '/templates/ai-maker' ? 'text-blue-600' : 'text-gray-400')} />
              AI Template Maker
            </Link>
            <Link href="/settings"
              className={cn('flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all',
                pathname === '/settings' ? 'text-blue-700 bg-blue-50' : 'text-gray-600 hover:bg-gray-100')}>
              <Settings className={cn('w-4 h-4 flex-shrink-0', pathname === '/settings' ? 'text-blue-600' : 'text-gray-400')} />
              Settings
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 transition-all">
                <LogOut className="w-4 h-4 flex-shrink-0 text-gray-400" />
                Log out
              </button>
            </form>
          </>
        )}
      </div>

      {/* Collapse toggle — floating tab on right edge, vertically centered */}
      <button
        onClick={onToggle}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-12 bg-white border border-gray-200 rounded-r-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 shadow-sm transition-colors z-50"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  )
}
