import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Clock, MapPin, Video, ArrowRight, Globe } from 'lucide-react'
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
  return {
    title: `${name} — Online buchen`,
    description: `Buche direkt online einen Termin bei ${name}.`,
  }
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} Min.`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} Std. ${m} Min.` : `${h} Std.`
}

const LOCATION_LABELS: Record<string, string> = {
  studio: 'Studio',
  external: 'Outdoor / Extern',
  online: 'Online (Video Call)',
}

const LOCATION_COLORS: Record<string, string> = {
  studio: '#C9A96E',
  external: '#10B981',
  online: '#6366F1',
}

export default async function PhotographerBookingPage({ params }: Props) {
  const { photographerSlug } = await params
  const supabase = createServiceClient()

  const { data: photographer } = await supabase
    .from('photographers')
    .select('id, full_name, studio_name, logo_url, slug, website, address_city')
    .eq('slug', photographerSlug)
    .maybeSingle()

  if (!photographer) notFound()

  const { data: bookingTypes } = await supabase
    .from('booking_types')
    .select('id, slug, title, description, duration_minutes, location_type, price, currency, availability_type, anzahlung_enabled, anzahlung_amount, anzahlung_type')
    .eq('photographer_id', photographer.id)
    .eq('active', true)
    .order('created_at', { ascending: true })

  const types = bookingTypes ?? []
  const studioName = photographer.studio_name || photographer.full_name || ''
  const initials = studioName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="min-h-screen" style={{ background: '#F7F6F3', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Hero */}
      <div style={{ background: '#1A1A18' }}>
        <div className="max-w-xl mx-auto px-5 py-10 sm:py-14 text-center">
          {/* Logo / Avatar */}
          {photographer.logo_url ? (
            <img
              src={photographer.logo_url}
              alt={studioName}
              className="w-20 h-20 rounded-full object-cover mx-auto mb-5"
              style={{ border: '3px solid rgba(201,169,110,0.4)', boxShadow: '0 0 0 6px rgba(201,169,110,0.08)' }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center text-[24px] font-black"
              style={{ background: 'rgba(201,169,110,0.15)', color: '#C9A96E', border: '2px solid rgba(201,169,110,0.3)' }}
            >
              {initials}
            </div>
          )}

          <h1
            className="font-black text-[26px] sm:text-[32px] mb-2"
            style={{ color: '#FAFAF8', letterSpacing: '-0.04em' }}
          >
            {studioName}
          </h1>

          <p className="text-[14px] mb-5" style={{ color: 'rgba(250,250,248,0.5)' }}>
            Buche deinen Termin direkt online
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            {photographer.address_city && (
              <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'rgba(250,250,248,0.4)' }}>
                <MapPin className="w-3 h-3" />{photographer.address_city}
              </span>
            )}
            {photographer.website && (
              <a
                href={photographer.website.startsWith('http') ? photographer.website : `https://${photographer.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[12px] transition-opacity hover:opacity-80"
                style={{ color: '#C9A96E' }}
              >
                <Globe className="w-3 h-3" />{photographer.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Booking types */}
      <div className="max-w-xl mx-auto px-4 py-8 sm:py-10">

        {types.length === 0 ? (
          <div className="text-center py-16">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(201,169,110,0.1)' }}
            >
              <Clock className="w-6 h-6" style={{ color: '#C9A96E' }} />
            </div>
            <p className="font-semibold text-[15px]" style={{ color: '#4A4845' }}>Noch keine Leistungen verfügbar</p>
            <p className="text-[13px] mt-1" style={{ color: '#9A9690' }}>Schau später noch einmal vorbei.</p>
          </div>
        ) : (
          <>
            <p className="text-[12px] font-semibold uppercase tracking-widest mb-5 text-center" style={{ color: '#9A9690' }}>
              {types.length === 1 ? '1 Leistung verfügbar' : `${types.length} Leistungen verfügbar`}
            </p>

            <div className="space-y-3">
              {types.map(bt => {
                const accent = LOCATION_COLORS[bt.location_type] ?? '#C9A96E'
                const isFree = bt.price === 0
                const isRequest = bt.availability_type === 'request'

                return (
                  <Link
                    key={bt.id}
                    href={`/b/${photographerSlug}/${bt.slug}`}
                    className="group flex items-stretch rounded-2xl overflow-hidden transition-all duration-150 hover:shadow-md hover:-translate-y-px"
                    style={{
                      background: '#fff',
                      border: '1px solid rgba(0,0,0,0.07)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                      textDecoration: 'none',
                    }}
                  >
                    {/* Left accent */}
                    <div className="w-1 flex-shrink-0" style={{ background: accent }} />

                    {/* Content */}
                    <div className="flex-1 min-w-0 px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h2
                            className="font-bold text-[15px] leading-snug mb-1.5 transition-colors group-hover:text-[var(--accent)]"
                            style={{ color: '#111110', letterSpacing: '-0.01em' }}
                          >
                            {bt.title}
                          </h2>

                          {/* Chips */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#F5F4F1', color: '#7A7670' }}>
                              <Clock className="w-2.5 h-2.5" />
                              {formatDuration(bt.duration_minutes)}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#F5F4F1', color: '#7A7670' }}>
                              {bt.location_type === 'online'
                                ? <Video className="w-2.5 h-2.5" />
                                : <MapPin className="w-2.5 h-2.5" />}
                              {LOCATION_LABELS[bt.location_type]}
                            </span>
                            {isRequest && (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366F1' }}>
                                Anfrage
                              </span>
                            )}
                          </div>

                          {bt.description && (
                            <p
                              className="text-[12px] mt-2 leading-relaxed"
                              style={{
                                color: '#9A9690',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              } as React.CSSProperties}
                            >
                              {bt.description}
                            </p>
                          )}
                        </div>

                        {/* Price + arrow */}
                        <div className="flex flex-col items-end justify-between flex-shrink-0 self-stretch">
                          <div className="text-right">
                            {isFree ? (
                              <span className="text-[12px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                                Kostenlos
                              </span>
                            ) : (
                              <span className="text-[16px] font-black" style={{ color: accent, letterSpacing: '-0.02em' }}>
                                {formatPrice(bt.price)}
                              </span>
                            )}
                          </div>
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center mt-2 transition-all group-hover:scale-110"
                            style={{ background: `${accent}18`, color: accent }}
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <a
            href="https://fotonizer.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] transition-opacity hover:opacity-70"
            style={{ color: '#B0ACA6', textDecoration: 'none' }}
          >
            Powered by{' '}
            <span style={{ color: '#C9A96E', fontWeight: 700 }}>Fotonizer</span>
          </a>
        </div>
      </div>
    </div>
  )
}
