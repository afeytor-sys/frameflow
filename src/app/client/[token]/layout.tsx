import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'

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
      .select('id, client_token, custom_slug, photographer:photographers(full_name, studio_name, logo_url)')
      .eq('client_token', token)
      .single()
    project = data
  } else {
    // Try custom_slug first
    const { data } = await supabase
      .from('projects')
      .select('id, client_token, custom_slug, photographer:photographers(full_name, studio_name, logo_url)')
      .eq('custom_slug', token)
      .single()
    project = data

    // Fallback: also try client_token (short tokens / legacy)
    if (!project) {
      const { data: data2 } = await supabase
        .from('projects')
        .select('id, client_token, custom_slug, photographer:photographers(full_name, studio_name, logo_url)')
        .eq('client_token', token)
        .single()
      project = data2
    }
  }

  if (!project) notFound()

  const photographerRaw = project.photographer
  const photographer = (Array.isArray(photographerRaw) ? photographerRaw[0] : photographerRaw) as {
    full_name: string
    studio_name: string | null
    logo_url: string | null
  } | null

  const studioName = photographer?.studio_name || photographer?.full_name || 'Frameflow'

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
        <div style={{ maxWidth: '672px', margin: '0 auto', padding: '0 20px', height: '52px', display: 'flex', alignItems: 'center' }}>
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
        </div>
      </header>

      {/* Content */}
      <main>
        {children}
      </main>
    </div>
  )
}
