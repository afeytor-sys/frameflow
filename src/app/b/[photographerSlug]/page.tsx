import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Clock, MapPin, Video, Euro } from 'lucide-react'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ photographerSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { photographerSlug } = await params
  const supabase = createServiceClient()
  const { data: p } = await supabase
    .from('photographers')
    .select('full_name, studio_name')
    .eq('slug', photographerSlug)
    .maybeSingle()
  const name = p?.studio_name || p?.full_name || photographerSlug
  return { title: `${name} — Buchung` }
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

const LOCATION_LABELS: Record<string, string> = {
  studio: 'Studio',
  external: 'Outdoor / Extern',
  online: 'Online (Video Call)',
}

export default async function PhotographerBookingPage({ params }: Props) {
  const { photographerSlug } = await params
  const supabase = createServiceClient()

  const { data: photographer } = await supabase
    .from('photographers')
    .select('id, full_name, studio_name, logo_url, slug')
    .eq('slug', photographerSlug)
    .maybeSingle()

  if (!photographer) notFound()

  const { data: bookingTypes } = await supabase
    .from('booking_types')
    .select('id, slug, title, description, duration_minutes, location_type, price, currency')
    .eq('photographer_id', photographer.id)
    .eq('active', true)
    .order('created_at', { ascending: true })

  const types = bookingTypes ?? []
  const studioName = photographer.studio_name || photographer.full_name || ''

  return (
    <div className="min-h-screen" style={{ background: '#F5F4F1', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">

        {/* Header */}
        <div className="mb-10 text-center">
          {photographer.logo_url && (
            <img
              src={photographer.logo_url}
              alt={studioName}
              className="w-16 h-16 rounded-full object-cover mx-auto mb-4"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.10)' }}
            />
          )}
          <h1
            className="font-black text-[28px] sm:text-[36px] mb-2"
            style={{ color: '#111110', letterSpacing: '-0.04em' }}
          >
            {studioName}
          </h1>
          <p className="text-[15px]" style={{ color: '#7A7670' }}>
            Wähle eine Leistung, um einen Termin zu buchen
          </p>
        </div>

        {/* Grid */}
        {types.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[15px]" style={{ color: '#7A7670' }}>Keine Buchungstypen verfügbar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {types.map(bt => (
              <Link
                key={bt.id}
                href={`/b/${photographerSlug}/${bt.slug}`}
                className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
                onMouseEnter={undefined}
              >
                {/* Card body */}
                <div className="p-6 flex flex-col flex-1">
                  <h2
                    className="font-black text-[18px] mb-2 leading-tight group-hover:text-[#C4A47C] transition-colors"
                    style={{ color: '#111110', letterSpacing: '-0.02em' }}
                  >
                    {bt.title}
                  </h2>

                  {bt.description && (
                    <p
                      className="text-[13px] leading-relaxed mb-4 flex-1"
                      style={{
                        color: '#7A7670',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {bt.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-auto pt-4" style={{ borderTop: '1px solid #F0EDE8' }}>
                    <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: '#7A7670' }}>
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      {bt.duration_minutes < 60
                        ? `${bt.duration_minutes} Min.`
                        : bt.duration_minutes === 60
                          ? '1 Std.'
                          : `${bt.duration_minutes / 60} Std.`}
                    </span>

                    <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: '#7A7670' }}>
                      {bt.location_type === 'online'
                        ? <Video className="w-3.5 h-3.5 flex-shrink-0" />
                        : <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      }
                      {LOCATION_LABELS[bt.location_type] ?? bt.location_type}
                    </span>

                    {bt.price > 0 && (
                      <span className="flex items-center gap-1 text-[13px] font-bold ml-auto" style={{ color: '#C4A47C' }}>
                        <Euro className="w-3.5 h-3.5 flex-shrink-0" />
                        {formatPrice(bt.price).replace('€', '').trim()}€
                      </span>
                    )}
                  </div>
                </div>

                {/* CTA bar */}
                <div
                  className="px-6 py-3 flex items-center justify-between text-[13px] font-semibold transition-colors"
                  style={{ background: '#F8F7F4', borderTop: '1px solid #F0EDE8', color: '#7A7670' }}
                >
                  <span>Termin buchen</span>
                  <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <p className="text-center text-[11px] mt-12" style={{ color: '#B0ACA6' }}>
          Powered by <span style={{ color: '#C4A47C' }}>Fotonizer</span>
        </p>
      </div>
    </div>
  )
}
