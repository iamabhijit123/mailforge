import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { SchedulerPoller } from '@/components/layout/SchedulerPoller'
import { getDb } from '@/lib/db'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  // Check if workspace is disabled
  const db = getDb()
  const owner = db.prepare('SELECT is_disabled FROM users WHERE id = ?').get(session.id) as { is_disabled?: number } | undefined
  if (owner?.is_disabled === 1) redirect('/login?disabled=1')

  const admin = isAdmin(session)

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <SchedulerPoller />
      <Sidebar />
      <div className="pl-56 flex flex-col min-h-screen">
        <Header user={{ ...session, isAdmin: admin }} />
        <main className="flex-1 p-6 max-w-[1400px] w-full">{children}</main>
      </div>
    </div>
  )
}
