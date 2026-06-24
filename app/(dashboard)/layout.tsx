import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { SchedulerPoller } from '@/components/layout/SchedulerPoller'
import { getDb } from '@/lib/db'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const db = getDb()
  const owner = db.prepare('SELECT is_disabled FROM users WHERE id = ?').get(session.id) as { is_disabled?: number } | undefined
  if (owner?.is_disabled === 1) redirect('/login?disabled=1')

  const admin = isAdmin(session)

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <SchedulerPoller />
      <DashboardShell user={{ ...session, isAdmin: admin }}>
        {children}
      </DashboardShell>
    </div>
  )
}
