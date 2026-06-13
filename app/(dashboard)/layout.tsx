import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { SchedulerPoller } from '@/components/layout/SchedulerPoller'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <SchedulerPoller />
      <Sidebar />
      <div className="pl-56">
        <Header user={session} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
