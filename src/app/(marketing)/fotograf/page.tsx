import Link from 'next/link'

export const metadata = {
  title: 'Fotonizer — Dein Fotostudio-Organizer',
  description: 'Du fotografierst. Fotonizer organisiert den Rest. Buchungen, Verträge, Galerien und Kunden — alles in einer Plattform für Fotografen.',
}

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    label: 'Kunden & Projekte',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </svg>
    ),
    label: 'Buchungskalender',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    label: 'Online-Galerien',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    label: 'Automatisierungen',
  },
]

const CHECKLIST = [
  'Self-Service Buchungslinks für deine Kunden',
  'Digitale Verträge — in Sekunden signiert',
  'Private Galerien mit Download-Kontrolle',
  'Rechnungen, Anzahlungen & Forderungen',
  'Automatische E-Mail-Erinnerungen',
  'Alles DSGVO-konform auf EU-Servern',
]

export default function FotografPromoPage() {
  return (
    <div style={{ background: '#F9F9F7', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111' }}>

      {/* ── Top bar ── */}
      <div style={{ height: 4, background: 'linear-gradient(90deg,#C9A96E,#e8c99a,#C9A96E)' }} />

      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
        <span className="font-black text-[22px]" style={{ letterSpacing: '-0.04em', color: '#1A1A18' }}>
          foto<span style={{ color: '#C9A96E' }}>nizer</span>
        </span>
        <Link
          href="/signup"
          className="text-[13px] font-bold px-4 py-2 rounded-xl transition-all"
          style={{ background: '#1A1A18', color: '#fff' }}
        >
          Kostenlos starten
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section className="px-5 pt-6 pb-8 max-w-2xl mx-auto text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider mb-5"
          style={{ background: '#C9A96E18', color: '#A0784A', border: '1px solid #C9A96E40' }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A96E', display: 'inline-block' }} />
          Von Fotografen gebaut · Für Fotografen gemacht
        </div>

        <h1 className="font-black leading-tight mb-4" style={{ fontSize: 'clamp(28px, 7vw, 38px)', letterSpacing: '-0.03em', color: '#1A1A18' }}>
          Du fotografierst.{' '}
          <span style={{ color: '#C9A96E' }}>Fotonizer</span>{' '}
          organisiert den Rest.
        </h1>

        <p className="text-[15px] leading-relaxed mb-7 mx-auto max-w-sm" style={{ color: '#6B7280' }}>
          Weniger Chaos im Alltag, mehr Fokus auf das, was du wirklich liebst.
          Buchungen, Verträge, Galerien und Kunden — alles in einer Plattform.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-[15px] font-bold transition-all"
            style={{ background: '#1A1A18', color: '#fff' }}
          >
            Kostenlos starten
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-[15px] font-semibold transition-all"
            style={{ background: '#fff', color: '#374151', border: '1px solid #E5E7EB' }}
          >
            Anmelden
          </Link>
        </div>

        <p className="text-[12px] mt-3" style={{ color: '#9CA3AF' }}>
          Keine Kreditkarte · Kostenlos für immer
        </p>
      </section>

      {/* ── App Mockup ── */}
      <section className="px-4 max-w-2xl mx-auto mb-8">
        <div
          className="rounded-3xl overflow-hidden shadow-2xl"
          style={{ background: '#fff', border: '1px solid #E5E7EB' }}
        >
          {/* Window chrome */}
          <div className="flex items-center gap-1.5 px-4 py-3" style={{ background: '#F3F4F6', borderBottom: '1px solid #E5E7EB' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FC5F5A', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FDBC40', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#34C749', display: 'inline-block' }} />
            <span className="ml-3 text-[11px] font-medium" style={{ color: '#9CA3AF' }}>fotonizer.com/dashboard</span>
          </div>

          {/* Dashboard mockup */}
          <div style={{ background: '#F9F9F7', padding: '16px' }}>

            {/* Stat cards row */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: 'Shootings', value: '12', color: '#C9A96E' },
                { label: 'Offene Anfragen', value: '4', color: '#3B82F6' },
                { label: 'Umsatz (Apr)', value: '€ 2.840', color: '#10B981' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                  <p className="text-[9px] font-medium mb-1" style={{ color: '#9CA3AF' }}>{s.label}</p>
                  <p className="font-black text-[14px]" style={{ color: s.color, letterSpacing: '-0.02em' }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Upcoming bookings */}
            <div className="rounded-xl overflow-hidden mb-3" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
              <div className="px-3 py-2.5" style={{ borderBottom: '1px solid #F3F4F6' }}>
                <p className="font-bold text-[11px]" style={{ color: '#374151' }}>Nächste Shootings</p>
              </div>
              {[
                { name: 'Anna & Thomas', type: 'Hochzeit', date: '26. Apr', dot: '#EC4899' },
                { name: 'Julia Meier', type: 'Portrait', date: '28. Apr', dot: '#8B5CF6' },
                { name: 'Café Latte GmbH', type: 'Commercial', date: '02. Mai', dot: '#3B82F6' },
              ].map((b, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2"
                  style={{ borderBottom: i < 2 ? '1px solid #F9F9F7' : 'none' }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: b.dot, display: 'inline-block', flexShrink: 0 }} />
                    <div>
                      <p className="font-semibold text-[11px]" style={{ color: '#111' }}>{b.name}</p>
                      <p className="text-[9px]" style={{ color: '#9CA3AF' }}>{b.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] font-bold" style={{ color: '#6B7280' }}>{b.date}</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: '#10B98118', color: '#10B981' }}>Bestätigt</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Mini calendar strip */}
            <div className="rounded-xl p-3" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
              <p className="font-bold text-[11px] mb-2" style={{ color: '#374151' }}>April 2026</p>
              <div className="grid grid-cols-7 gap-1">
                {['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => (
                  <div key={d} className="text-center text-[8px] font-bold" style={{ color: '#9CA3AF' }}>{d}</div>
                ))}
                {Array.from({ length: 2 }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: 30 }, (_, i) => {
                  const d = i + 1
                  const isBooked = [8, 12, 19, 22, 26, 28].includes(d)
                  const isToday = d === 19
                  return (
                    <div
                      key={d}
                      className="aspect-square rounded-md flex items-center justify-center text-[9px] font-bold"
                      style={{
                        background: isToday ? '#1A1A18' : isBooked ? '#C9A96E18' : 'transparent',
                        color: isToday ? '#fff' : isBooked ? '#A0784A' : '#6B7280',
                      }}
                    >
                      {d}
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Feature Grid (like ADON) ── */}
      <section className="px-5 max-w-2xl mx-auto mb-10">
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map(f => (
            <div
              key={f.label}
              className="rounded-2xl p-4 flex flex-col items-center text-center gap-2"
              style={{ background: '#fff', border: '1px solid #E5E7EB' }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: '#C9A96E18', color: '#A0784A' }}
              >
                {f.icon}
              </div>
              <p className="font-bold text-[13px]" style={{ color: '#1A1A18' }}>{f.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Checklist ── */}
      <section className="px-5 max-w-2xl mx-auto mb-10">
        <div className="rounded-3xl p-6" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
          <h2 className="font-black text-[20px] mb-5" style={{ letterSpacing: '-0.03em', color: '#1A1A18' }}>
            Alles drin. <span style={{ color: '#C9A96E' }}>Nichts extra.</span>
          </h2>
          <div className="space-y-3">
            {CHECKLIST.map(item => (
              <div key={item} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: '#10B98118' }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-[14px]" style={{ color: '#374151' }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof ── */}
      <section className="px-5 max-w-2xl mx-auto mb-10">
        <div
          className="rounded-3xl p-6 text-center"
          style={{ background: 'linear-gradient(135deg, #1A1A18, #2D2D2A)', color: '#fff' }}
        >
          <p className="font-black text-[36px] mb-1" style={{ letterSpacing: '-0.04em', color: '#C9A96E' }}>200+</p>
          <p className="font-bold text-[16px] mb-1">Fotografen in Europa</p>
          <p className="text-[13px]" style={{ color: '#9CA3AF' }}>vertrauen Fotonizer für ihr Studio-Management</p>

          <div className="flex items-center justify-center gap-0.5 mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} className="w-5 h-5" viewBox="0 0 20 20" fill="#C9A96E">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-[12px] mt-1.5" style={{ color: '#6B7280' }}>4.9 / 5 Durchschnittsbewertung</p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-5 max-w-2xl mx-auto mb-12 text-center">
        <h2 className="font-black text-[22px] mb-2" style={{ letterSpacing: '-0.03em', color: '#1A1A18' }}>
          Bereit, mehr Zeit fürs Fotografieren zu haben?
        </h2>
        <p className="text-[14px] mb-6" style={{ color: '#6B7280' }}>
          Kostenlos starten — kein Abo, keine Kreditkarte nötig.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center justify-center gap-2 w-full max-w-xs px-6 py-4 rounded-2xl text-[16px] font-bold transition-all"
          style={{ background: '#C9A96E', color: '#fff' }}
        >
          Jetzt kostenlos registrieren →
        </Link>
        <p className="text-[11px] mt-3" style={{ color: '#9CA3AF' }}>DSGVO-konform · EU-Server · Keine Kreditkarte</p>
      </section>

      {/* ── Footer ── */}
      <footer className="px-5 pb-8 text-center max-w-2xl mx-auto">
        <div style={{ height: 1, background: '#E5E7EB', marginBottom: 24 }} />
        <span className="font-black text-[18px]" style={{ letterSpacing: '-0.04em', color: '#1A1A18' }}>
          foto<span style={{ color: '#C9A96E' }}>nizer</span>
        </span>
        <p className="text-[12px] mt-1" style={{ color: '#9CA3AF' }}>
          Studiomanagement für professionelle Fotografen.
        </p>
        <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
          {[['Impressum', '/impressum'], ['Datenschutz', '/datenschutz'], ['AGB', '/agb']].map(([label, href]) => (
            <Link key={href} href={href} className="text-[11px]" style={{ color: '#9CA3AF' }}>{label}</Link>
          ))}
        </div>
      </footer>

    </div>
  )
}
