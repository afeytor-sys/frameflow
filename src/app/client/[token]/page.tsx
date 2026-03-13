import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, daysUntil } from '@/lib/utils'
import { FileText, Images, Clock, Check, ChevronRight } from 'lucide-react'

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

  // Fetch related data
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
  const photoCount = 0 // Will be populated in Phase 3
  const timelineEvents = timeline?.events || []

  return (
    <div className="space-y-8 animate-in">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-[#1A1A1A] mb-2">
          Hallo {firstName} 👋
        </h1>

        {/* Shoot date countdown */}
        {project.shoot_date && (
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
            isDelivered
              ? 'bg-[#3DBA6F]/10 text-[#3DBA6F]'
              : days === 0
              ? 'bg-[#E84C1A]/10 text-[#E84C1A]'
              : days !== null && days < 0
              ? 'bg-[#C8A882]/10 text-[#C8A882]'
              : 'bg-[#C8A882]/10 text-[#C8A882]'
          }`}>
            {isDelivered ? (
              <>✨ Deine Fotos sind fertig!</>
            ) : days === 0 ? (
              <>📸 Dein Shooting ist heute!</>
            ) : days !== null && days < 0 ? (
              <>📸 Shooting war am {formatDate(project.shoot_date, 'de')}</>
            ) : (
              <>🎉 Dein Shooting ist in {days} {days === 1 ? 'Tag' : 'Tagen'}</>
            )}
          </div>
        )}

        <p className="text-[#6B6B6B] text-sm mt-3">
          {project.title}
          {project.shoot_date && ` · ${formatDate(project.shoot_date, 'de')}`}
        </p>
      </div>

      {/* Portal cards */}
      <div className="space-y-3">
        {/* Contract card */}
        {latestContract && (
          <Link
            href={`/client/${token}/contract`}
            className="flex items-center gap-4 p-5 bg-white rounded-xl border border-[#E8E8E4] hover:border-[#C8A882]/30 hover:shadow-sm transition-all group"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              latestContract.status === 'signed'
                ? 'bg-[#3DBA6F]/10'
                : 'bg-[#E8A21A]/10'
            }`}>
              {latestContract.status === 'signed'
                ? <Check className="w-5 h-5 text-[#3DBA6F]" />
                : <FileText className="w-5 h-5 text-[#E8A21A]" />
              }
            </div>
            <div className="flex-1">
              <p className="font-medium text-[#1A1A1A]">📋 Vertrag</p>
              <p className="text-sm text-[#6B6B6B] mt-0.5">
                {latestContract.status === 'signed'
                  ? 'Unterschrieben ✅'
                  : latestContract.status === 'viewed'
                  ? 'Angesehen — bitte unterschreiben'
                  : 'Bereit zur Unterschrift'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#E8E8E4] group-hover:text-[#C8A882] transition-colors" />
          </Link>
        )}

        {/* Gallery card */}
        {gallery && (
          <Link
            href={`/client/${token}/gallery`}
            className="flex items-center gap-4 p-5 bg-white rounded-xl border border-[#E8E8E4] hover:border-[#C8A882]/30 hover:shadow-sm transition-all group"
          >
            <div className="w-11 h-11 rounded-xl bg-[#C8A882]/10 flex items-center justify-center flex-shrink-0">
              <Images className="w-5 h-5 text-[#C8A882]" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-[#1A1A1A]">🖼️ Galerie</p>
              <p className="text-sm text-[#6B6B6B] mt-0.5">
                {isDelivered ? 'Deine Fotos sind bereit' : 'Galerie verfügbar'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#E8E8E4] group-hover:text-[#C8A882] transition-colors" />
          </Link>
        )}

        {/* Timeline card */}
        {timelineEvents.length > 0 && (
          <Link
            href={`/client/${token}/timeline`}
            className="flex items-center gap-4 p-5 bg-white rounded-xl border border-[#E8E8E4] hover:border-[#C8A882]/30 hover:shadow-sm transition-all group"
          >
            <div className="w-11 h-11 rounded-xl bg-[#6B6B6B]/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-[#6B6B6B]" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-[#1A1A1A]">📅 Zeitplan</p>
              <p className="text-sm text-[#6B6B6B] mt-0.5">
                {timelineEvents.length} {timelineEvents.length === 1 ? 'Eintrag' : 'Einträge'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#E8E8E4] group-hover:text-[#C8A882] transition-colors" />
          </Link>
        )}

        {/* Empty state */}
        {!latestContract && !gallery && timelineEvents.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-[#E8E8E4]">
            <p className="text-[#6B6B6B] text-sm">
              Dein Fotograf bereitet noch alles vor. Schau bald wieder vorbei!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
