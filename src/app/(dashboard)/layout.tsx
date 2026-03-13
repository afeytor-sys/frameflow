import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardSidebar from '@/components/layout/DashboardSidebar'
import DashboardHeader from '@/components/layout/DashboardHeader'

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

  // Get photographer profile
  const { data: photographer } = await supabase
    .from('photographers')
    .select('*')
    .eq('id', user.id)
    .single()

  // If no profile yet, redirect to onboarding
  if (!photographer) {
    redirect('/onboarding')
  }

  // If onboarding not completed, redirect to onboarding
  if (!photographer.onboarding_completed) {
    redirect('/onboarding')
  }

  return (
    <div className="flex h-screen bg-[#0D0D0C] overflow-hidden">
      {/* Sidebar */}
      <DashboardSidebar photographer={photographer} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader photographer={photographer} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
