import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { SchedulerPoller } from '@/components/layout/SchedulerPoller'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <SchedulerPoller />
      <Sidebar />
      <div className="pl-56 flex flex-col min-h-screen">
        <Header user={session} />
        <main className="flex-1 p-6 max-w-[1400px] w-full">{children}</main>
      </div>
    </div>
  )
}
