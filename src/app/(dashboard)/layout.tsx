import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardSidebar from '@/components/layout/DashboardSidebar'
import DashboardHeader from '@/components/layout/DashboardHeader'
import { UploadProvider } from '@/contexts/UploadContext'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: photographer } = await supabase
    .from('photographers')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!photographer) {
    redirect('/onboarding')
  }

  if (!photographer.onboarding_completed) {
    redirect('/onboarding')
  }

  return (
    <UploadProvider>
      <div className="flex h-screen overflow-hidden page-bg">
        {/* Sidebar */}
        <DashboardSidebar photographer={photographer} />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
          <DashboardHeader photographer={photographer} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </UploadProvider>
  )
}
