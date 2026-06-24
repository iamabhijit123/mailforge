'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

// Full-screen routes — no p-6 or max-w, iframe fills all available space
const FULLSCREEN_ROUTES = ['/templates/ai-maker']

interface ShellCtx { collapsed: boolean }
const SidebarCtx = createContext<ShellCtx>({ collapsed: false })
export const useSidebarCollapsed = () => useContext(SidebarCtx)

interface Props {
  children: React.ReactNode
  user: { id: string; name: string; email: string; role: string; isOwner: boolean; isAdmin: boolean }
}

export function DashboardShell({ children, user }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setCollapsed(localStorage.getItem('sidebar-collapsed') === 'true')
    setMounted(true)
  }, [])

  function toggle() {
    setCollapsed(c => {
      const next = !c
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  const isFullScreen = FULLSCREEN_ROUTES.some(r => pathname.startsWith(r))
  const sidebarW = mounted ? (collapsed ? '3.5rem' : '14rem') : '14rem'

  return (
    <SidebarCtx.Provider value={{ collapsed }}>
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div
        className="flex flex-col min-h-screen transition-[padding-left] duration-200"
        style={{ paddingLeft: sidebarW }}
      >
        <Header user={user} />
        {isFullScreen ? (
          <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
        ) : (
          <main className="flex-1 p-6 w-full">{children}</main>
        )}
      </div>
    </SidebarCtx.Provider>
  )
}
