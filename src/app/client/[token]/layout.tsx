import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Camera } from 'lucide-react'

export default async function ClientPortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*, photographer:photographers(full_name, studio_name, logo_url, plan)')
    .eq('client_token', token)
    .single()

  if (!project) notFound()

  const photographer = project.photographer as {
    full_name: string
    studio_name: string | null
    logo_url: string | null
    plan: string
  }

  const studioName = photographer?.studio_name || photographer?.full_name || 'FrameFlow'
  const showBranding = !['pro', 'studio'].includes(photographer?.plan || '')

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Portal header */}
      <header className="bg-white border-b border-[#E8E8E4] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {photographer?.logo_url ? (
              <img
                src={photographer.logo_url}
                alt={studioName}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#1A1A1A] rounded-lg flex items-center justify-center">
                  <Camera className="w-3.5 h-3.5 text-[#C8A882]" />
                </div>
                <span className="font-display text-base font-semibold text-[#1A1A1A]">
                  {studioName}
                </span>
              </div>
            )}
          </div>

          {showBranding && (
            <a
              href="/"
              className="text-xs text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
            >
              Powered by FrameFlow
            </a>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
