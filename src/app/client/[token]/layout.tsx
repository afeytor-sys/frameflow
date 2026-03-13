import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

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
    <div className="min-h-screen bg-[#F7F6F3]">
      {/* Portal header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#E2DED8]/60 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-5 h-[52px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {photographer?.logo_url ? (
              <img
                src={photographer.logo_url}
                alt={studioName}
                className="h-7 w-auto object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <rect width="20" height="20" rx="5" fill="#C4A47C" fillOpacity="0.15"/>
                    <path d="M4 14V7.5L10 4L16 7.5V14" stroke="#C4A47C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7.5 14V10.5H12.5V14" stroke="#C4A47C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="font-display text-[#0D0D0C] font-semibold text-[15px] tracking-tight">
                  {studioName}
                </span>
              </div>
            )}
          </div>

          {showBranding && (
            <a
              href="/"
              className="text-[11px] text-[#A8A49E] hover:text-[#6E6A63] transition-colors font-medium"
            >
              Powered by FrameFlow
            </a>
          )}
        </div>
      </header>

      {/* Content */}
      <main>
        {children}
      </main>
    </div>
  )
}
