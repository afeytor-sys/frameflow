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
  } | null

  const studioName = photographer?.studio_name || photographer?.full_name || 'Studioflow'

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      {/* Portal header */}
      <header className="backdrop-blur-md sticky top-0 z-20"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="max-w-2xl mx-auto px-5 h-[52px] flex items-center">
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
                <span className="font-display font-semibold text-[15px] tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {studioName}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main>
        {children}
      </main>
    </div>
  )
}
