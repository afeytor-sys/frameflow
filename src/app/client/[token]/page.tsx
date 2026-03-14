import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, daysUntil } from '@/lib/utils'
import { FileText, Images, Clock, CheckCircle2, ChevronRight, PenLine, Calendar } from 'lucide-react'
import WeatherWidget from '@/components/client-portal/WeatherWidget'
import MoodBoard from '@/components/client-portal/MoodBoard'

export default async function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*, client:clients(full_name, email), photographer:photographers(studio_name, full_name, logo_url, plan)')
    .eq('client_token', token)
    .single()

  if (!project) notFound()

  const client = project.client as { full_name: string; email?: string }
  const photographer = (Array.isArray(project.photographer) ? project.photographer[0] : project.photographer) as { studio_name: string | null; full_name: string; logo_url: string | null; plan: string } | null

  const [
    { data: contracts },
    { data: gallery },
    { data: timeline },
  ] = await Promise.all([
    supabase.from('contracts').select('id, title, status').eq('project_id', project.id),
    supabase.from('galleries').select('id, status, view_count, download_count').eq('project_id', project.id).eq('status', 'active').single(),
    supabase.from('timelines').select('id, events').eq('project_id', project.id).single(),
  ])

  // Photo count for gallery card
  let photoCount = 0
  if (gallery) {
    const { count } = await supabase.from('photos').select('id', { count: 'exact', head: true }).eq('gallery_id', gallery.id)
    photoCount = count || 0
  }

  const days = project.shoot_date ? daysUntil(project.shoot_date) : null
  const isDelivered = project.status === 'delivered' || project.status === 'completed'
  const firstName = client.full_name.split(' ')[0]
  const latestContract = contracts?.[0]
  const timelineEvents = (timeline?.events as { id: string; time: string; title: string; phase: string }[]) || []
  const nextEvent = timelineEvents[0]

  const studioName = photographer?.studio_name || photographer?.full_name || 'Studioflow'

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <div className="max-w-lg mx-auto px-5 py-10">

        {/* Studio branding */}
        <div className="flex items-center gap-2 mb-8 animate-in">
          {photographer?.logo_url ? (
            <img src={photographer.logo_url} alt={studioName} className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: 'var(--accent)' }}>
              {studioName[0]}
            </div>
          )}
          <span className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>{studioName}</span>
        </div>

        {/* Greeting */}
        <div className="mb-8 animate-in-delay-1">
          <h1 className="font-black mb-3" style={{ fontSize: 'clamp(2rem, 6vw, 2.8rem)', letterSpacing: '-0.035em', lineHeight: 1.05, color: 'var(--text-primary)' }}>
            Hallo, {firstName} 👋
          </h1>

          {/* Shoot date pill */}
          {project.shoot_date && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[13px] font-semibold mb-4"
              style={{
                background: isDelivered
                  ? 'rgba(42,155,104,0.10)'
                  : days === 0
                  ? 'rgba(196,59,44,0.08)'
                  : 'var(--accent-muted)',
                color: isDelivered
                  ? '#2A9B68'
                  : days === 0
                  ? '#C43B2C'
                  : 'var(--accent)',
              }}>
              <Calendar className="w-3.5 h-3.5" />
              {isDelivered ? (
                'Deine Fotos sind fertig! 🎉'
              ) : days === 0 ? (
                'Dein Shooting ist heute! 📸'
              ) : days !== null && days < 0 ? (
                `Shooting war am ${formatDate(project.shoot_date, 'de')}`
              ) : (
                `Shooting in ${days} ${days === 1 ? 'Tag' : 'Tagen'}`
              )}
            </div>
          )}

          <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            {project.title}
            {project.shoot_date && (
              <span style={{ color: 'var(--text-muted)' }}> · {formatDate(project.shoot_date, 'de')}</span>
            )}
          </p>

          {/* Weather */}
          {project.shoot_date && !isDelivered && days !== null && days >= 0 && days <= 30 && (
            <div className="mt-4">
              <WeatherWidget date={project.shoot_date} location={project.location || 'Deutschland'} />
            </div>
          )}
        </div>

        {/* Portal cards */}
        <div className="space-y-3">

          {/* Contract card */}
          {latestContract && (
            <Link href={`/client/${token}/contract`}
              className="group block rounded-2xl overflow-hidden transition-all duration-300 animate-in-delay-1 hover:-translate-y-0.5"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              {/* Top accent bar */}
              <div className="h-1 w-full" style={{
                background: latestContract.status === 'signed'
                  ? 'linear-gradient(90deg, #2A9B68, #3DBA6F)'
                  : 'linear-gradient(90deg, var(--accent), #D4B48C)',
              }} />

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: latestContract.status === 'signed'
                          ? 'rgba(42,155,104,0.10)'
                          : 'var(--accent-muted)',
                      }}>
                      {latestContract.status === 'signed'
                        ? <CheckCircle2 className="w-5 h-5" style={{ color: '#2A9B68' }} />
                        : <PenLine className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                      }
                    </div>
                    <div>
                      <p className="font-bold text-[15px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                        Vertrag
                      </p>
                      <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {latestContract.status === 'signed'
                          ? 'Unterschrieben ✓'
                          : latestContract.status === 'viewed'
                          ? 'Angesehen — bitte unterschreiben'
                          : 'Bereit zur Unterschrift'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {latestContract.status !== 'signed' && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                        style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                        Ausstehend
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                      style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>

                {/* Progress bar for contract status */}
                {latestContract.status !== 'signed' && (
                  <div className="mt-4">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {['draft', 'sent', 'viewed', 'signed'].map((s, i) => {
                        const statuses = ['draft', 'sent', 'viewed', 'signed']
                        const currentIdx = statuses.indexOf(latestContract.status)
                        const isActive = i <= currentIdx
                        return (
                          <div key={s} className="flex-1 h-1 rounded-full transition-all"
                            style={{ background: isActive ? 'var(--accent)' : 'var(--border-color)' }} />
                        )
                      })}
                    </div>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {latestContract.status === 'draft' ? 'Entwurf' : latestContract.status === 'sent' ? 'Gesendet' : 'Angesehen'}
                    </p>
                  </div>
                )}
              </div>
            </Link>
          )}

          {/* Gallery card */}
          {gallery && (
            <Link href={`/client/${token}/gallery`}
              className="group block rounded-2xl overflow-hidden transition-all duration-300 animate-in-delay-2 hover:-translate-y-0.5"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <div className="h-1 w-full" style={{
                background: 'linear-gradient(90deg, var(--accent), #E8C89C)',
              }} />

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'var(--accent-muted)' }}>
                      <Images className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <p className="font-bold text-[15px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                        Galerie
                      </p>
                      <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {photoCount > 0
                          ? `${photoCount} ${photoCount === 1 ? 'Foto' : 'Fotos'} bereit`
                          : isDelivered ? 'Deine Fotos sind bereit' : 'Galerie verfügbar'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {photoCount > 0 && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                        style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                        {photoCount} Fotos
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                      style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>

                {/* Stats row */}
                {(gallery.view_count > 0 || gallery.download_count > 0) && (
                  <div className="flex items-center gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                    {gallery.view_count > 0 && (
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        👁 {gallery.view_count} Aufrufe
                      </span>
                    )}
                    {gallery.download_count > 0 && (
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        ⬇️ {gallery.download_count} Downloads
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          )}

          {/* Timeline card */}
          {timelineEvents.length > 0 && (
            <Link href={`/client/${token}/timeline`}
              className="group block rounded-2xl overflow-hidden transition-all duration-300 animate-in-delay-3 hover:-translate-y-0.5"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <div className="h-1 w-full" style={{
                background: 'linear-gradient(90deg, #6B7280, #9CA3AF)',
              }} />

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(107,114,128,0.10)' }}>
                      <Clock className="w-5 h-5" style={{ color: '#6B7280' }} />
                    </div>
                    <div>
                      <p className="font-bold text-[15px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                        Zeitplan
                      </p>
                      <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {timelineEvents.length} {timelineEvents.length === 1 ? 'Eintrag' : 'Einträge'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 flex-shrink-0 mt-3"
                    style={{ color: 'var(--text-muted)' }} />
                </div>

                {/* Next event preview */}
                {nextEvent && (
                  <div className="mt-4 pt-4 flex items-center gap-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold"
                      style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                      {nextEvent.time}
                    </div>
                    <div>
                      <p className="text-[12.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {nextEvent.title}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Erster Eintrag</p>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          )}

          {/* Empty state */}
          {!latestContract && !gallery && timelineEvents.length === 0 && (
            <div className="text-center py-14 rounded-2xl animate-in-delay-1"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: 'var(--bg-hover)' }}>
                <FileText className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              </div>
              <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
                Dein Fotograf bereitet noch alles vor.
              </p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Schau bald wieder vorbei!
              </p>
            </div>
          )}
        </div>

        {/* Moodboard */}
        <MoodBoard projectId={project.id} token={token} />
      </div>
    </div>
  )
}
