'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { FileText, Images, Clock, Link2, Globe, CreditCard, Check } from 'lucide-react'
import FAQAccordion from '@/components/marketing/FAQAccordion'
import PricingSection from '@/components/marketing/PricingSection'

const CD = { fontFamily: 'Clash Display, system-ui, sans-serif' }
const SA = { fontFamily: 'Satoshi, system-ui, sans-serif' }

// ── Scroll-reveal hook ──────────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed')
          obs.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function RevealSection({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useScrollReveal()
  return (
    <div
      ref={ref}
      className={`reveal-section ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export default function LandingPage() {
  return (
    <>
      <style>{`
        /* ── Scroll reveal ── */
        .reveal-section {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.65s cubic-bezier(0.16,1,0.3,1), transform 0.65s cubic-bezier(0.16,1,0.3,1);
        }
        .reveal-section.revealed {
          opacity: 1;
          transform: translateY(0);
        }

        /* ── Hero float ── */
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        .hero-float {
          animation: heroFloat 5s ease-in-out infinite;
        }

        /* ── Feature card hover ── */
        .feature-card {
          transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease;
        }
        .feature-card:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 20px 60px rgba(196,164,124,0.22), 0 4px 16px rgba(0,0,0,0.06);
        }
        .feature-card:hover .feature-icon {
          transform: scale(1.12) rotate(-3deg);
          transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .feature-icon {
          transition: transform 0.3s ease;
        }

        /* ── Testimonial card hover ── */
        .testimonial-card {
          transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease;
        }
        .testimonial-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(196,164,124,0.18), 0 2px 8px rgba(0,0,0,0.05);
        }

        /* ── Primary button ── */
        .btn-hero-primary {
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.15s ease;
        }
        .btn-hero-primary:hover {
          transform: scale(1.04);
          box-shadow: 0 8px 32px rgba(196,164,124,0.35);
        }

        /* ── Radial glow ── */
        .section-glow {
          position: relative;
        }
        .section-glow::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, rgba(196,164,124,0.12) 0%, transparent 65%);
          pointer-events: none;
          z-index: 0;
        }
        .section-glow > * {
          position: relative;
          z-index: 1;
        }
      `}</style>

      <div className="bg-[#F8F7F4] text-[#111110]" style={SA}>

        {/* ── NAV ── */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#F8F7F4]/90 backdrop-blur-md border-b border-[#E4E1DC]">
          <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="font-semibold text-[#111110]"
              style={{ ...CD, fontSize: '17px', letterSpacing: '-0.02em' }}
            >
              Studioflow
            </Link>

            <div className="hidden md:flex items-center gap-6">
              {[
                { label: 'Features', href: '#features' },
                { label: 'Preise', href: '#pricing' },
                { label: 'FAQ', href: '#faq' },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="text-[13px] font-medium text-[#7A7670] hover:text-[#111110] transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-[13px] font-semibold text-[#7A7670] hover:text-[#111110] transition-colors px-3 py-1.5"
              >
                Anmelden
              </Link>
              <Link
                href="/signup"
                className="btn-hero-primary text-[13px] font-semibold bg-[#111110] text-[#F8F7F4] px-4 py-1.5 rounded-md"
                style={{ letterSpacing: '0.01em' }}
              >
                Kostenlos starten
              </Link>
            </div>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="pt-36 pb-28 px-6 overflow-hidden">
          <div className="max-w-[960px] mx-auto text-center">

            {/* Eyebrow */}
            <RevealSection>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E4E1DC] bg-white mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D9E6B]" />
                <span className="text-[12px] font-semibold text-[#7A7670] uppercase tracking-wide">
                  Für Fotografen in Deutschland & Europa
                </span>
              </div>
            </RevealSection>

            <RevealSection delay={80}>
              <h1
                className="text-[#111110] font-semibold leading-[1.02] mb-7"
                style={{ ...CD, fontSize: 'clamp(52px, 9vw, 92px)', letterSpacing: '-0.04em' }}
              >
                Deine Kunden verdienen mehr als einen WeTransfer-Link.
              </h1>
            </RevealSection>

            <RevealSection delay={160}>
              <p
                className="text-[#7A7670] leading-relaxed mb-10 max-w-[640px] mx-auto"
                style={{ fontSize: '19px' }}
              >
                Studioflow gibt jedem Projekt ein elegantes Kundenportal — Verträge, Galerien, Zeitpläne.
                Für Hochzeiten, Portraits, Events und alles dazwischen.
              </p>
            </RevealSection>

            <RevealSection delay={220}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
                <Link
                  href="/signup"
                  className="btn-hero-primary w-full sm:w-auto px-7 py-3.5 bg-[#111110] text-[#F8F7F4] text-[14px] font-semibold rounded-lg"
                  style={{ letterSpacing: '0.01em' }}
                >
                  Kostenlos starten
                </Link>
                <a
                  href="#features"
                  className="w-full sm:w-auto px-7 py-3.5 border border-[#E4E1DC] text-[#111110] text-[14px] font-semibold rounded-lg hover:bg-white hover:shadow-sm transition-all"
                >
                  So funktioniert es ↓
                </a>
              </div>
            </RevealSection>

            {/* Social proof */}
            <RevealSection delay={300}>
              <div className="flex items-center justify-center gap-3">
                <div className="flex -space-x-2">
                  {['S', 'M', 'L', 'A', 'K'].map((initial, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-[#F8F7F4] flex items-center justify-center text-[11px] font-semibold text-white"
                      style={{ background: ['#C8A882', '#2D9E6B', '#111110', '#D4881A', '#7A7670'][i] }}
                    >
                      {initial}
                    </div>
                  ))}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-3.5 h-3.5 text-[#C8A882]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-[12px] text-[#7A7670] mt-0.5">Vertrauen von 200+ Fotografen in Europa</p>
                </div>
              </div>
            </RevealSection>

            {/* Hero floating mockup */}
            <RevealSection delay={400}>
              <div className="mt-16 hero-float">
                <div
                  className="mx-auto max-w-[680px] rounded-2xl overflow-hidden"
                  style={{
                    background: 'white',
                    border: '1px solid #E4E1DC',
                    boxShadow: '0 32px 80px rgba(17,17,16,0.12), 0 8px 24px rgba(196,164,124,0.15)',
                  }}
                >
                  {/* Mock browser bar */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E4E1DC] bg-[#F8F7F4]">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                      <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                      <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                    </div>
                    <div className="flex-1 mx-4 h-6 rounded-md bg-white border border-[#E4E1DC] flex items-center px-3">
                      <span className="text-[11px] text-[#B0ACA6]">studioflow.app/client/abc123</span>
                    </div>
                  </div>
                  {/* Mock portal content */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#C8A882]/20 flex items-center justify-center">
                        <span className="text-[16px]">📸</span>
                      </div>
                      <div>
                        <div className="h-3 w-32 bg-[#111110] rounded-full mb-1.5" />
                        <div className="h-2.5 w-20 bg-[#E4E1DC] rounded-full" />
                      </div>
                      <div className="ml-auto px-2.5 py-1 rounded-full bg-[#2D9E6B]/10 text-[#2D9E6B] text-[11px] font-semibold">
                        Unterschrieben ✓
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="aspect-square rounded-lg"
                          style={{
                            background: `hsl(${30 + i * 15}, ${20 + i * 5}%, ${85 - i * 3}%)`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 bg-[#E4E1DC] rounded-full" />
                      <div className="h-2 w-16 bg-[#C8A882]/40 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="features" className="py-28 px-6 bg-white border-y border-[#E4E1DC] section-glow">
          <div className="max-w-[1200px] mx-auto">
            <RevealSection>
              <div className="text-center mb-20">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#B0ACA6] mb-3">So einfach geht's</p>
                <h2
                  className="text-[#111110] font-semibold"
                  style={{ ...CD, fontSize: 'clamp(36px, 4.5vw, 54px)', letterSpacing: '-0.03em' }}
                >
                  In 3 Schritten zum Kundenportal
                </h2>
              </div>
            </RevealSection>

            <div className="grid md:grid-cols-3 gap-10">
              {[
                {
                  num: '01',
                  title: 'Projekt erstellen',
                  desc: 'Kunden anlegen, Vertrag hochladen, Galerie vorbereiten — alles an einem Ort.',
                  icon: FileText,
                },
                {
                  num: '02',
                  title: 'Einen Link senden',
                  desc: 'Dein Kunde erhält einen einzigartigen Link — kein Login, kein Passwort nötig.',
                  icon: Link2,
                },
                {
                  num: '03',
                  title: 'Fertig.',
                  desc: 'Kunde unterschreibt, lädt Fotos herunter, markiert Favoriten. Du bekommst eine Benachrichtigung.',
                  icon: Check,
                },
              ].map(({ num, title, desc, icon: Icon }, i) => (
                <RevealSection key={num} delay={i * 100}>
                  <div className="relative">
                    <div className="flex items-start gap-4 mb-5">
                      <span
                        className="text-[#C8A882] font-semibold flex-shrink-0 mt-0.5"
                        style={{ ...CD, fontSize: '13px' }}
                      >
                        {num}
                      </span>
                      <div className="w-11 h-11 rounded-xl bg-[#F2F0EC] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-[#111110]" />
                      </div>
                    </div>
                    <h3
                      className="text-[#111110] font-semibold mb-2.5"
                      style={{ ...CD, fontSize: '22px', letterSpacing: '-0.02em' }}
                    >
                      {title}
                    </h3>
                    <p className="text-[#7A7670] text-[15px] leading-relaxed">{desc}</p>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES GRID ── */}
        <section className="py-28 px-6">
          <div className="max-w-[1200px] mx-auto">
            <RevealSection>
              <div className="text-center mb-20">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#B0ACA6] mb-3">Alles inklusive</p>
                <h2
                  className="text-[#111110] font-semibold"
                  style={{ ...CD, fontSize: 'clamp(36px, 4.5vw, 54px)', letterSpacing: '-0.03em' }}
                >
                  Alles was du brauchst
                </h2>
              </div>
            </RevealSection>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  icon: FileText,
                  title: 'Digitale Verträge',
                  desc: 'Rechtsgültige E-Signatur nach eIDAS. Unterschriebenes PDF wird automatisch generiert.',
                },
                {
                  icon: Images,
                  title: 'Schöne Galerien',
                  desc: 'Masonry-Grid, Lightbox, Favoriten markieren, Download-Kontrolle — alles inklusive.',
                },
                {
                  icon: Clock,
                  title: 'Zeitplan-Builder',
                  desc: 'Visueller Ablaufplan für jeden Shoot-Typ. Für Hochzeiten, Events, Portraits.',
                },
                {
                  icon: Link2,
                  title: 'Ein Link pro Kunde',
                  desc: 'Kein Login nötig. Dein Kunde öffnet seinen einzigartigen Link — fertig.',
                },
                {
                  icon: Globe,
                  title: 'Zweisprachig',
                  desc: 'Vollständig auf Deutsch und Englisch. Perfekt für internationale Kunden.',
                },
                {
                  icon: CreditCard,
                  title: 'Faire Preise',
                  desc: 'Kostenlos starten. Upgrade jederzeit möglich. Keine versteckten Kosten.',
                },
              ].map(({ icon: Icon, title, desc }, i) => (
                <RevealSection key={title} delay={i * 60}>
                  <div
                    className="feature-card bg-white rounded-2xl p-7 border border-[#E4E1DC] cursor-default"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                  >
                    <div className="feature-icon w-11 h-11 rounded-xl bg-[#F2F0EC] flex items-center justify-center mb-5">
                      <Icon className="w-5 h-5 text-[#111110]" />
                    </div>
                    <h3
                      className="text-[#111110] font-semibold mb-2.5"
                      style={{ ...CD, fontSize: '18px', letterSpacing: '-0.02em' }}
                    >
                      {title}
                    </h3>
                    <p className="text-[#7A7670] text-[14px] leading-relaxed">{desc}</p>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── PHOTOGRAPHY TYPES ── */}
        <section className="py-20 px-6 bg-white border-y border-[#E4E1DC]">
          <div className="max-w-[1200px] mx-auto text-center">
            <RevealSection>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#B0ACA6] mb-8">Für jeden Fotografen</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {[
                  { emoji: '🤵', label: 'Hochzeit' },
                  { emoji: '👤', label: 'Portrait' },
                  { emoji: '🎉', label: 'Events' },
                  { emoji: '🏢', label: 'Commercial' },
                  { emoji: '🏠', label: 'Immobilien' },
                  { emoji: '🎨', label: 'Fine Art' },
                ].map(({ emoji, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#E4E1DC] bg-[#F8F7F4] text-[14px] font-medium text-[#111110] hover:border-[#C8A882] hover:bg-white transition-all cursor-default"
                  >
                    <span>{emoji}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </RevealSection>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="py-28 px-6 section-glow">
          <div className="max-w-[1200px] mx-auto">
            <RevealSection>
              <div className="text-center mb-20">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#B0ACA6] mb-3">Stimmen aus der Community</p>
                <h2
                  className="text-[#111110] font-semibold"
                  style={{ ...CD, fontSize: 'clamp(36px, 4.5vw, 54px)', letterSpacing: '-0.03em' }}
                >
                  Was Fotografen sagen
                </h2>
              </div>
            </RevealSection>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  quote: 'Früher habe ich 2 Stunden pro Kunde für Verwaltung gebraucht. Jetzt sind es 15 Minuten.',
                  name: 'Sarah K.',
                  role: 'Portrait-Fotografin · Berlin',
                  initial: 'S',
                  color: '#C8A882',
                },
                {
                  quote: 'Meine Kunden kommentieren immer, wie professionell das Portal aussieht.',
                  name: 'Marco R.',
                  role: 'Event-Fotograf · München',
                  initial: 'M',
                  color: '#2D9E6B',
                },
                {
                  quote: 'Endlich ein Tool, das von jemandem gebaut wurde, der wirklich fotografiert.',
                  name: 'Lisa T.',
                  role: 'Commercial-Fotografin · Hamburg',
                  initial: 'L',
                  color: '#111110',
                },
              ].map(({ quote, name, role, initial, color }, i) => (
                <RevealSection key={name} delay={i * 100}>
                  <div
                    className="testimonial-card bg-white rounded-2xl p-8 border border-[#E4E1DC] h-full"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                  >
                    <div className="flex gap-0.5 mb-6">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-4 h-4 text-[#C8A882]" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-[#111110] text-[15px] leading-relaxed mb-6">"{quote}"</p>
                    <div className="flex items-center gap-3 mt-auto">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
                        style={{ background: color }}
                      >
                        {initial}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-[#111110]">{name}</p>
                        <p className="text-[12px] text-[#7A7670] mt-0.5">{role}</p>
                      </div>
                    </div>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" className="py-28 px-6 bg-white border-y border-[#E4E1DC]">
          <div className="max-w-[1200px] mx-auto">
            <RevealSection>
              <div className="text-center mb-16">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#B0ACA6] mb-3">Transparent & fair</p>
                <h2
                  className="text-[#111110] font-semibold"
                  style={{ ...CD, fontSize: 'clamp(36px, 4.5vw, 54px)', letterSpacing: '-0.03em' }}
                >
                  Einfache Preise
                </h2>
              </div>
            </RevealSection>
            <RevealSection delay={100}>
              <PricingSection />
            </RevealSection>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="py-28 px-6">
          <div className="max-w-[720px] mx-auto">
            <RevealSection>
              <div className="text-center mb-16">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#B0ACA6] mb-3">Häufige Fragen</p>
                <h2
                  className="text-[#111110] font-semibold"
                  style={{ ...CD, fontSize: 'clamp(36px, 4.5vw, 54px)', letterSpacing: '-0.03em' }}
                >
                  FAQ
                </h2>
              </div>
            </RevealSection>
            <RevealSection delay={80}>
              <FAQAccordion />
            </RevealSection>
          </div>
        </section>

        {/* ── CTA BANNER ── */}
        <section className="py-28 px-6 bg-[#111110] section-glow" style={{ '--section-glow-color': 'rgba(196,164,124,0.08)' } as React.CSSProperties}>
          <RevealSection>
            <div className="max-w-[700px] mx-auto text-center">
              <h2
                className="text-[#F8F7F4] font-semibold mb-5"
                style={{ ...CD, fontSize: 'clamp(40px, 5.5vw, 64px)', letterSpacing: '-0.04em' }}
              >
                Bereit für professionelle Kundenportale?
              </h2>
              <p className="text-[#7A7670] text-[17px] mb-10 leading-relaxed">
                Kostenlos starten. Keine Kreditkarte. Upgrade jederzeit möglich.
              </p>
              <Link
                href="/signup"
                className="btn-hero-primary inline-flex items-center gap-2 px-8 py-4 bg-[#C8A882] text-[#111110] text-[15px] font-semibold rounded-xl"
                style={{ letterSpacing: '0.01em' }}
              >
                Jetzt kostenlos starten →
              </Link>
            </div>
          </RevealSection>
        </section>

        {/* ── FOOTER ── */}
        <footer className="bg-[#111110] border-t border-white/[0.06] px-6 py-14">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-12">
              <div>
                <p
                  className="text-[#F8F7F4] font-semibold mb-2"
                  style={{ ...CD, fontSize: '17px', letterSpacing: '-0.02em' }}
                >
                  Studioflow
                </p>
                <p className="text-[#7A7670] text-[13px] max-w-[240px] leading-relaxed">
                  Elegante Kundenportale für Fotografen.
                </p>
              </div>

              <div className="flex flex-wrap gap-x-12 gap-y-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7A7670]/60 mb-3">Produkt</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Features', href: '#features' },
                      { label: 'Preise', href: '#pricing' },
                      { label: 'Blog', href: '/blog' },
                    ].map(({ label, href }) => (
                      <a key={label} href={href} className="block text-[13px] text-[#7A7670] hover:text-[#F8F7F4] transition-colors">
                        {label}
                      </a>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7A7670]/60 mb-3">Konto</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Anmelden', href: '/login' },
                      { label: 'Registrieren', href: '/signup' },
                    ].map(({ label, href }) => (
                      <Link key={label} href={href} className="block text-[13px] text-[#7A7670] hover:text-[#F8F7F4] transition-colors">
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7A7670]/60 mb-3">Rechtliches</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Impressum', href: '/impressum' },
                      { label: 'Datenschutz', href: '/datenschutz' },
                      { label: 'AGB', href: '/agb' },
                    ].map(({ label, href }) => (
                      <Link key={label} href={href} className="block text-[13px] text-[#7A7670] hover:text-[#F8F7F4] transition-colors">
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[12px] text-[#7A7670]">
                © {new Date().getFullYear()} Studioflow. Alle Rechte vorbehalten.
              </p>
              <div className="flex items-center gap-4">
                <Link href="/login" className="text-[12px] text-[#7A7670] hover:text-[#F8F7F4] transition-colors">EN</Link>
                <span className="text-[#7A7670]/30">|</span>
                <Link href="/login" className="text-[12px] text-[#F8F7F4] font-medium">DE</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
