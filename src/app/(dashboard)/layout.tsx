import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/layout/DashboardShell'
import { UploadProvider } from '@/contexts/UploadContext'
import PushRegistrar from '@/components/layout/PushRegistrar'

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
      <PushRegistrar />
      <DashboardShell photographer={photographer}>
        {children}
      </DashboardShell>
    </UploadProvider>
  )
}
