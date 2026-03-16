import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { PLAN_LIMITS, type PlanKey } from '@/lib/stripe'

export default async function ClientPortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createServiceClient()

  // Support both client_token (UUID) and custom_slug
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

  let project = null

  if (isUUID) {
    const { data } = await supabase
      .from('projects')
      .select('id, client_token, custom_slug, photographer:photographers(id, full_name, studio_name, logo_url, plan)')
      .eq('client_token', token)
      .single()
    project = data
  } else {
    // Try custom_slug first
    const { data } = await supabase
      .from('projects')
      .select('id, client_token, custom_slug, photographer:photographers(id, full_name, studio_name, logo_url, plan)')
      .eq('custom_slug', token)
      .single()
    project = data

    // Fallback: also try client_token (short tokens / legacy)
    if (!project) {
      const { data: data2 } = await supabase
        .from('projects')
        .select('id, client_token, custom_slug, photographer:photographers(id, full_name, studio_name, logo_url, plan)')
        .eq('client_token', token)
        .single()
      project = data2
    }
  }

  if (!project) notFound()

  const photographerRaw = project.photographer
  const photographer = (Array.isArray(photographerRaw) ? photographerRaw[0] : photographerRaw) as {
    id: string
    full_name: string
    studio_name: string | null
    logo_url: string | null
    plan: string | null
  } | null

  const studioName = photographer?.studio_name || photographer?.full_name || 'Frameflow'
  const plan = (photographer?.plan || 'free') as PlanKey
  const showFotonizerBadge = PLAN_LIMITS[plan]?.showFotonizerBadge ?? true

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      {/* Portal header */}
      <header style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #E5E7EB',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}>
        <div style={{ maxWidth: '672px', margin: '0 auto', padding: '0 20px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {photographer?.logo_url ? (
              <img
                src={photographer.logo_url}
                alt={studioName}
                style={{ height: '28px', width: 'auto', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <rect width="20" height="20" rx="5" fill="#C4A47C" fillOpacity="0.15"/>
                    <path d="M4 14V7.5L10 4L16 7.5V14" stroke="#C4A47C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7.5 14V10.5H12.5V14" stroke="#C4A47C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontFamily: '"DM Sans", system-ui, sans-serif', color: '#111827', fontWeight: 600, fontSize: '15px', letterSpacing: '-0.01em' }}>
                  {studioName}
                </span>
              </div>
            )}
          </div>

          {/* Fotonizer badge — only for Free plan */}
          {showFotonizerBadge && (
            <a
              href="https://fotonizer.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '20px',
                background: 'rgba(196,164,124,0.10)',
                border: '1px solid rgba(196,164,124,0.25)',
                textDecoration: 'none',
                flexShrink: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                <rect width="20" height="20" rx="5" fill="#C4A47C" fillOpacity="0.20"/>
                <path d="M4 14V7.5L10 4L16 7.5V14" stroke="#C4A47C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7.5 14V10.5H12.5V14" stroke="#C4A47C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{
                fontFamily: '"DM Sans", system-ui, sans-serif',
                fontSize: '11px',
                fontWeight: 600,
                color: '#9B7E5A',
                letterSpacing: '-0.01em',
              }}>
                Powered by Fotonizer
              </span>
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
