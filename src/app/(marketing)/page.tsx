import Link from 'next/link'
import { ArrowRight, CheckCircle2, Star, Zap, Shield, Globe, Camera, Users } from 'lucide-react'
import PricingSection from '@/components/marketing/PricingSection'
import FAQAccordion from '@/components/marketing/FAQAccordion'

const FEATURES = [
  {
    icon: '✍️',
    title: 'Digitale Verträge',
    desc: 'Rechtsgültige E-Signatur direkt im Browser. Kein Drucken, kein Scannen.',
  },
  {
    icon: '🖼️',
    title: 'Schöne Galerien',
    desc: 'Professionelle Bildgalerien mit Download-Kontrolle und Favoriten.',
  },
  {
    icon: '📅',
    title: 'Zeitplan-Builder',
    desc: 'Visueller Ablaufplan für jeden Shoot-Typ — Hochzeit, Portrait, Event.',
  },
  {
    icon: '🔗',
    title: 'Ein Link pro Kunde',
    desc: 'Kein Login nötig. Dein Kunde öffnet einfach seinen persönlichen Link.',
  },
  {
    icon: '🌍',
    title: 'Deutsch & Englisch',
    desc: 'Vollständig zweisprachig — für dich und deine internationalen Kunden.',
  },
  {
    icon: '💳',
    title: 'Stripe-Zahlungen',
    desc: 'Abonnements und Rechnungen — sicher, einfach, jederzeit kündbar.',
  },
]

const PHOTO_TYPES = [
  { emoji: '🤵', label: 'Hochzeit' },
  { emoji: '👤', label: 'Portrait' },
  { emoji: '🎉', label: 'Events' },
  { emoji: '🏢', label: 'Commercial' },
  { emoji: '🏠', label: 'Immobilien' },
  { emoji: '🎨', label: 'Fine Art' },
]

const TESTIMONIALS = [
  {
    quote: 'Ich habe früher 2 Stunden pro Kunde für Verwaltung gebraucht. Jetzt sind es 15 Minuten.',
    name: 'Sarah K.',
    role: 'Portrait-Fotografin · Berlin',
    stars: 5,
  },
  {
    quote: 'Meine Kunden kommentieren immer, wie professionell das Portal aussieht.',
    name: 'Marco R.',
    role: 'Event-Fotograf · München',
    stars: 5,
  },
  {
    quote: 'Endlich ein Tool, das von jemandem gebaut wurde, der wirklich fotografiert.',
    name: 'Lisa T.',
    role: 'Commercial-Fotografin · Hamburg',
    stars: 5,
  },
]

export default function HomePage() {
  return (
    <div style={{ background: 'var(--bg-page)', color: 'var(--text-primary)', minHeight: '100vh' }}>

      {/* ── NAVBAR ── */}
      <nav style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M4 14V7.5L10 4L16 7.5V14" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7.5 14V10.5H12.5V14" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-[17px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Studioflow
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {[
              { href: '#features', label: 'Features' },
              { href: '#pricing', label: 'Preise' },
              { href: '#faq', label: 'FAQ' },
            ].map(({ href, label }) => (
              <a key={href} href={href} className="text-[13.5px] font-medium transition-colors" style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[13.5px] font-semibold transition-colors hidden sm:block"
              style={{ color: 'var(--text-secondary)' }}>
              Anmelden
            </Link>
            <Link href="/signup"
              className="btn-shimmer flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13.5px] font-bold text-white transition-all"
              style={{ background: 'var(--accent)' }}>
              Kostenlos starten
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(196,164,124,0.12) 0%, transparent 70%)',
        }} />

        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-bold mb-8 animate-in"
            style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid rgba(196,164,124,0.2)' }}>
            <Zap className="w-3 h-3" />
            Für professionelle Fotografen
          </div>

          {/* Headline */}
          <h1 className="animate-in-delay-1 font-black mb-6"
            style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', letterSpacing: '-0.04em', lineHeight: 1.0, color: 'var(--text-primary)' }}>
            Deine Kunden verdienen mehr als einen{' '}
            <span className="text-gradient-gold">WeTransfer-Link.</span>
          </h1>

          {/* Subtext */}
          <p className="animate-in-delay-2 text-[17px] leading-relaxed max-w-2xl mx-auto mb-10"
            style={{ color: 'var(--text-secondary)' }}>
            Studioflow gibt jedem Projekt ein elegantes Kundenportal — Verträge, Galerien, Zeitpläne.
            Für Hochzeiten, Portraits, Events und alles dazwischen.
          </p>

          {/* CTAs */}
          <div className="animate-in-delay-3 flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Link href="/signup"
              className="btn-shimmer flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-bold text-white transition-all"
              style={{ background: 'var(--accent)', boxShadow: '0 4px 20px rgba(196,164,124,0.35)' }}>
              Kostenlos starten
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#features"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-semibold transition-all"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
              So funktioniert&apos;s
            </a>
          </div>

          {/* Social proof */}
          <div className="animate-in-delay-4 flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {['#C4A47C', '#8B7355', '#D4B48C', '#A8845C', '#E8C89C'].map((color, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ borderColor: 'var(--bg-page)', background: color }}>
                  {['S', 'M', 'L', 'A', 'K'][i]}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" style={{ color: 'var(--accent)' }} />
              ))}
            </div>
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Vertraut von <strong style={{ color: 'var(--text-primary)' }}>200+</strong> Fotografen in Europa
            </span>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="features" className="py-24" style={{ background: 'var(--bg-page-2)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="label-caps mb-3">So einfach geht&apos;s</p>
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
              In 3 Schritten zum professionellen Portal
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '01', icon: '📋', title: 'Projekt erstellen', desc: 'Kunde anlegen, Vertrag hochladen, Galerie vorbereiten — alles an einem Ort.' },
              { step: '02', icon: '🔗', title: 'Link senden', desc: 'Dein Kunde erhält einen einzigartigen Link zu seinem persönlichen Portal.' },
              { step: '03', icon: '✅', title: 'Fertig', desc: 'Kunde unterschreibt, sieht die Galerie, lädt Fotos herunter. Du sparst Stunden.' },
            ].map(({ step, icon, title, desc }, i) => (
              <div key={step} className={`glass-card p-7 animate-in-delay-${i + 1}`}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-3xl">{icon}</span>
                  <span className="font-mono text-[11px] font-bold" style={{ color: 'var(--accent)' }}>{step}</span>
                </div>
                <h3 className="font-bold text-[18px] mb-2" style={{ letterSpacing: '-0.02em' }}>{title}</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="label-caps mb-3">Features</p>
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
              Alles was du brauchst.{' '}
              <span className="text-gradient-gold">Nichts was du nicht brauchst.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon, title, desc }, i) => (
              <div key={title} className={`glass-card p-6 animate-in-delay-${(i % 4) + 1}`}>
                <span className="text-2xl mb-4 block">{icon}</span>
                <h3 className="font-bold text-[16px] mb-2" style={{ letterSpacing: '-0.01em' }}>{title}</h3>
                <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PHOTO TYPES ── */}
      <section className="py-20" style={{ background: 'var(--bg-page-2)' }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="label-caps mb-3">Für jeden Fotografen</p>
          <h2 className="font-black mb-10" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', letterSpacing: '-0.03em' }}>
            Studioflow funktioniert für alle Bereiche
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {PHOTO_TYPES.map(({ emoji, label }) => (
              <div key={label}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-semibold transition-all cursor-default"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                <span>{emoji}</span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="label-caps mb-3">Stimmen aus der Community</p>
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
              Fotografen lieben Studioflow
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ quote, name, role, stars }, i) => (
              <div key={name} className={`glass-card p-7 animate-in-delay-${i + 1}`}>
                <div className="flex gap-0.5 mb-5">
                  {[...Array(stars)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-current" style={{ color: 'var(--accent)' }} />
                  ))}
                </div>
                <p className="text-[14.5px] leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                  &ldquo;{quote}&rdquo;
                </p>
                <div>
                  <p className="font-bold text-[14px]">{name}</p>
                  <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24" style={{ background: 'var(--bg-page-2)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="label-caps mb-3">Preise</p>
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
              Transparent. Fair. Kündbar.
            </h2>
            <p className="text-[16px]" style={{ color: 'var(--text-secondary)' }}>
              Starte kostenlos — upgrade wenn du bereit bist.
            </p>
          </div>
          <PricingSection />
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="label-caps mb-3">FAQ</p>
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
              Häufige Fragen
            </h2>
          </div>
          <FAQAccordion />
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24" style={{ background: 'var(--bg-page-2)' }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="glass-card p-12 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(196,164,124,0.10) 0%, transparent 70%)',
            }} />
            <div className="relative">
              <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
                Bereit für professionelle Kunden-Portale?
              </h2>
              <p className="text-[16px] mb-8" style={{ color: 'var(--text-secondary)' }}>
                Starte kostenlos. Keine Kreditkarte nötig.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/signup"
                  className="btn-shimmer flex items-center gap-2 px-8 py-3.5 rounded-xl text-[15px] font-bold text-white"
                  style={{ background: 'var(--accent)', boxShadow: '0 4px 20px rgba(196,164,124,0.35)' }}>
                  Jetzt kostenlos starten
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="flex items-center justify-center gap-6 mt-8">
                {[
                  { icon: CheckCircle2, text: 'Kostenlos starten' },
                  { icon: Shield, text: 'DSGVO-konform' },
                  { icon: Globe, text: 'EU-Server' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
                  <Camera className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                </div>
                <span className="font-bold text-[15px]" style={{ letterSpacing: '-0.02em' }}>Studioflow</span>
              </div>
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                Elegante Kunden-Portale für Fotografen.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {[
                { href: '#features', label: 'Features' },
                { href: '#pricing', label: 'Preise' },
                { href: '/login', label: 'Anmelden' },
                { href: '/signup', label: 'Registrieren' },
                { href: '/impressum', label: 'Impressum' },
                { href: '/datenschutz', label: 'Datenschutz' },
                { href: '/agb', label: 'AGB' },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="text-[13px] transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{ borderTop: '1px solid var(--border-color)' }}>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              © {new Date().getFullYear()} Studioflow. Alle Rechte vorbehalten.
            </p>
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                200+ Fotografen vertrauen Studioflow
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
