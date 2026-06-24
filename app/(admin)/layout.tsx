import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import Link from 'next/link'
import { Mail, LayoutDashboard, Users, Settings, LogOut, Shield } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || !isAdmin(session)) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      {/* Top nav */}
      <header className="fixed top-0 inset-x-0 z-40 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-950">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 tracking-tight">MailForge <span className="text-gray-400 font-normal">Admin</span></span>
        </div>
        <nav className="flex items-center gap-1">
          <AdminNavLink href="/admin" icon={<LayoutDashboard className="w-4 h-4" />} label="Overview" exact />
          <AdminNavLink href="/admin/accounts" icon={<Users className="w-4 h-4" />} label="Accounts" />
          <AdminNavLink href="/admin/settings" icon={<Settings className="w-4 h-4" />} label="Settings" />
          <div className="w-px h-5 bg-gray-200 mx-2" />
          <Link href="/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors">
            <Mail className="w-4 h-4" /> My workspace
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </form>
        </nav>
      </header>
      <main className="pt-14 px-8 py-8 max-w-6xl mx-auto">
        {children}
      </main>
    </div>
  )
}

function AdminNavLink({ href, icon, label, exact }: { href: string; icon: React.ReactNode; label: string; exact?: boolean }) {
  // Server components can't use usePathname, so we use a client component pattern
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
    >
      {icon} {label}
    </Link>
  )
}
