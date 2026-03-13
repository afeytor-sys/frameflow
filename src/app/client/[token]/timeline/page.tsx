import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, MapPin, Timer } from 'lucide-react'

interface TimelineEvent {
  id: string
  time: string
  title: string
  location?: string
  duration_minutes?: number
  phase: 'preparation' | 'shoot' | 'wrap' | 'other'
  notes?: string
}

const PHASE_LABELS: Record<string, string> = {
  preparation: 'Vorbereitung',
  shoot: 'Shooting',
  wrap: 'Abschluss',
  other: 'Sonstiges',
}

const PHASE_COLORS: Record<string, string> = {
  preparation: 'bg-[#C8A882]/10 text-[#C8A882] border-[#C8A882]/20',
  shoot: 'bg-[#1A1A1A]/10 text-[#1A1A1A] border-[#1A1A1A]/20',
  wrap: 'bg-[#3DBA6F]/10 text-[#3DBA6F] border-[#3DBA6F]/20',
  other: 'bg-[#6B6B6B]/10 text-[#6B6B6B] border-[#6B6B6B]/20',
}

const PHASE_DOT: Record<string, string> = {
  preparation: 'bg-[#C8A882]',
  shoot: 'bg-[#1A1A1A]',
  wrap: 'bg-[#3DBA6F]',
  other: 'bg-[#6B6B6B]',
}

export default async function ClientTimelinePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, shoot_date, client:clients(full_name)')
    .eq('client_token', token)
    .single()

  if (!project) notFound()

  const { data: timeline } = await supabase
    .from('timelines')
    .select('events')
    .eq('project_id', project.id)
    .single()

  const events: TimelineEvent[] = timeline?.events || []

  // Group by phase
  const phases = ['preparation', 'shoot', 'wrap', 'other'] as const
  const grouped = phases.reduce((acc, phase) => {
    const phaseEvents = events.filter((e) => e.phase === phase)
    if (phaseEvents.length > 0) acc[phase] = phaseEvents
    return acc
  }, {} as Record<string, TimelineEvent[]>)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/client/${token}`}
          className="inline-flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Link>
        <h1 className="font-display text-xl font-semibold text-[#1A1A1A]">📅 Zeitplan</h1>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-[#E8E8E4]">
          <Clock className="w-10 h-10 text-[#E8E8E4] mx-auto mb-3" />
          <p className="text-[#6B6B6B] text-sm">Der Zeitplan wird noch vorbereitet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([phase, phaseEvents]) => (
            <div key={phase}>
              {/* Phase header */}
              <div className="flex items-center gap-3 mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${PHASE_COLORS[phase]}`}>
                  {PHASE_LABELS[phase]}
                </span>
                <div className="flex-1 h-px bg-[#E8E8E4]" />
              </div>

              {/* Events */}
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[#E8E8E4]" />

                <div className="space-y-4">
                  {phaseEvents
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((event) => (
                      <div key={event.id} className="flex gap-4">
                        {/* Dot */}
                        <div className="flex-shrink-0 w-10 flex items-start justify-center pt-1">
                          <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${PHASE_DOT[event.phase]}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-white rounded-xl border border-[#E8E8E4] p-4 mb-1">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <p className="font-medium text-[#1A1A1A] text-sm">{event.title}</p>
                              {event.location && (
                                <div className="flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3 text-[#6B6B6B]" />
                                  <p className="text-xs text-[#6B6B6B]">{event.location}</p>
                                </div>
                              )}
                              {event.notes && (
                                <p className="text-xs text-[#6B6B6B] mt-1.5 leading-relaxed">{event.notes}</p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-mono text-sm font-medium text-[#1A1A1A]">{event.time}</p>
                              {event.duration_minutes && (
                                <div className="flex items-center gap-1 justify-end mt-0.5">
                                  <Timer className="w-3 h-3 text-[#6B6B6B]" />
                                  <p className="text-xs text-[#6B6B6B]">{event.duration_minutes} Min.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
