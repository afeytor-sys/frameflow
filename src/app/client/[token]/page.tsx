import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, daysUntil } from '@/lib/utils'
import { FileText, Images, Clock, CheckCircle2, ChevronRight, PenLine } from 'lucide-react'
import WeatherWidget from '@/components/client-portal/WeatherWidget'
import MoodBoard from '@/components/client-portal/MoodBoard'

export default async function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*, client:clients(full_name, email)')
    .eq('client_token', token)
    .single()

  if (!project) notFound()

  const client = project.client as { full_name: string; email?: string }

  const [
    { data: contracts },
    { data: gallery },
    { data: timeline },
  ] = await Promise.all([
    supabase.from('contracts').select('id, title, status').eq('project_id', project.id),
    supabase.from('galleries').select('id, status, view_count').eq('project_id', project.id).eq('status', 'active').single(),
    supabase.from('timelines').select('id, events').eq('project_id', project.id).single(),
  ])

  const days = project.shoot_date ? daysUntil(project.shoot_date) : null
  const isDelivered = project.status === 'delivered' || project.status === 'completed'
  const firstName = client.full_name.split(' ')[0]
  const latestContract = contracts?.[0]
  const timelineEvents = timeline?.events || []

  return (
    <div className="max-w-2xl mx-auto px-5 py-10 animate-in">

      {/* Greeting */}
      <div className="mb-8">
        <h1 className="font-display text-[#0D0D0C] font-semibold mb-3" style={{ fontSize: '32px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Hallo, {firstName} 👋
        </h1>

        {/* Shoot date pill */}
        {project.shoot_date && (
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[13px] font-medium mb-4 ${
            isDelivered
              ? 'bg-[#2A9B68]/8 text-[#2A9B68]'
              : days === 0
              ? 'bg-[#C43B2C]/8 text-[#C43B2C]'
              : 'bg-[#C4A47C]/10 text-[#8A6E4E]'
          }`}>
            {isDelivered ? (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Deine Fotos sind fertig!</>
            ) : days === 0 ? (
              <>📸 Dein Shooting ist heute!</>
            ) : days !== null && days < 0 ? (
              <>📸 Shooting war am {formatDate(project.shoot_date, 'de')}</>
            ) : (
              <>🗓 Dein Shooting ist in {days} {days === 1 ? 'Tag' : 'Tagen'}</>
            )}
          </div>
        )}

        <p className="text-[#6E6A63] text-[14px]">
          {project.title}
          {project.shoot_date && (
            <span className="text-[#A8A49E]"> · {formatDate(project.shoot_date, 'de')}</span>
          )}
        </p>

        {/* Weather — only if shoot is within 14 days */}
        {project.shoot_date && !isDelivered && days !== null && days >= 0 && days <= 14 && (
          <div className="mt-4">
            <WeatherWidget
              date={project.shoot_date}
              location={project.location || 'Deutschland'}
            />
          </div>
        )}
      </div>

      {/* Portal cards */}
      <div className="space-y-2.5">

        {/* Contract */}
        {latestContract && (
          <Link
            href={`/client/${token}/contract`}
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[#E2DED8] hover:border-[#C4C0BA] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all group"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              latestContract.status === 'signed' ? 'bg-[#2A9B68]/8' : 'bg-[#CC8415]/8'
            }`}>
              {latestContract.status === 'signed'
                ? <CheckCircle2 className="w-5 h-5 text-[#2A9B68]" />
                : <PenLine className="w-5 h-5 text-[#CC8415]" />
              }
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#0D0D0C] text-[14px]">Vertrag</p>
              <p className="text-[12.5px] text-[#A8A49E] mt-0.5">
                {latestContract.status === 'signed'
                  ? 'Unterschrieben ✓'
                  : latestContract.status === 'viewed'
                  ? 'Angesehen — bitte unterschreiben'
                  : 'Bereit zur Unterschrift'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {latestContract.status !== 'signed' && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#CC8415]/8 text-[#CC8415]">
                  Ausstehend
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-[#C4C0BA] group-hover:text-[#C4A47C] transition-colors" />
            </div>
          </Link>
        )}

        {/* Gallery */}
        {gallery && (
          <Link
            href={`/client/${token}/gallery`}
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[#E2DED8] hover:border-[#C4C0BA] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#C4A47C]/8 flex items-center justify-center flex-shrink-0">
              <Images className="w-5 h-5 text-[#C4A47C]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#0D0D0C] text-[14px]">Galerie</p>
              <p className="text-[12.5px] text-[#A8A49E] mt-0.5">
                {isDelivered ? 'Deine Fotos sind bereit' : 'Galerie verfügbar'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#C4C0BA] group-hover:text-[#C4A47C] transition-colors" />
          </Link>
        )}

        {/* Timeline */}
        {timelineEvents.length > 0 && (
          <Link
            href={`/client/${token}/timeline`}
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[#E2DED8] hover:border-[#C4C0BA] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#6E6A63]/8 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-[#6E6A63]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#0D0D0C] text-[14px]">Zeitplan</p>
              <p className="text-[12.5px] text-[#A8A49E] mt-0.5">
                {timelineEvents.length} {timelineEvents.length === 1 ? 'Eintrag' : 'Einträge'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#C4C0BA] group-hover:text-[#C4A47C] transition-colors" />
          </Link>
        )}

        {/* Empty state */}
        {!latestContract && !gallery && timelineEvents.length === 0 && (
          <div className="text-center py-14 bg-white rounded-xl border border-[#E2DED8]">
            <div className="w-12 h-12 rounded-full bg-[#F0EEE9] flex items-center justify-center mx-auto mb-3">
              <FileText className="w-5 h-5 text-[#C4C0BA]" />
            </div>
            <p className="text-[#A8A49E] text-[13.5px]">
              Dein Fotograf bereitet noch alles vor.
            </p>
            <p className="text-[#C4C0BA] text-[12px] mt-1">Schau bald wieder vorbei!</p>
          </div>
        )}
      </div>

      {/* Moodboard — always visible for client to add inspirations */}
      <MoodBoard projectId={project.id} token={token} />
    </div>
  )
}
