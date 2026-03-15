import Link from 'next/link'
import { ArrowRight, CheckCircle2, Star, Zap, Shield, Globe, Camera, Users, Calendar, FileText, Images, Layout } from 'lucide-react'
import PricingSection from '@/components/marketing/PricingSection'
import FAQAccordion from '@/components/marketing/FAQAccordion'

const FEATURES = [
  {
    icon: '📅',
    title: 'Bookings & Sessions',
    desc: 'Track every shoot, session and client in one clear overview. Know exactly what\'s coming next.',
  },
  {
    icon: '✍️',
    title: 'Digital Contracts',
    desc: 'Create, send and manage contracts in seconds. Clients sign online — no printing, no scanning.',
  },
  {
    icon: '🖼️',
    title: 'Elegant Galleries',
    desc: 'Deliver images through beautiful online galleries with download control and client favorites.',
  },
  {
    icon: '🔗',
    title: 'Client Portal',
    desc: 'Each client gets a private space for their project, contracts, moodboards and gallery.',
  },
  {
    icon: '🌍',
    title: 'German & English',
    desc: 'Fully bilingual — for you and your international clients. Switch anytime.',
  },
  {
    icon: '💳',
    title: 'Invoices & Payments',
    desc: 'Create and send professional invoices directly from the platform. Simple and trackable.',
  },
]

const PHOTO_TYPES = [
  { emoji: '🤵', label: 'Wedding' },
  { emoji: '👤', label: 'Portrait' },
  { emoji: '🎉', label: 'Events' },
  { emoji: '🏢', label: 'Commercial' },
  { emoji: '🏠', label: 'Real Estate' },
  { emoji: '🎨', label: 'Fine Art' },
]

const TESTIMONIALS = [
  {
    quote: 'My clients always comment on how professional the portal looks. It sets the tone from day one.',
    name: 'Anna M.',
    role: 'Wedding Photographer · Vienna',
    stars: 5,
  },
  {
    quote: 'I save at least 3 hours a week that I used to spend on emails, PDFs and file transfers.',
    name: 'Thomas B.',
    role: 'Portrait Photographer · Berlin',
    stars: 5,
  },
  {
    quote: 'Finally a tool built by someone who actually photographs. Everything just makes sense.',
    name: 'Julia S.',
    role: 'Commercial Photographer · Zurich',
    stars: 5,
  },
]

// ── Browser Mockup wrapper ──────────────────────────────────────────
function BrowserFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`} style={{
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.10)',
      border: '1px solid rgba(0,0,0,0.08)',
      transform: 'perspective(1200px) rotateX(2deg)',
      transformOrigin: 'top center',
    }}>
      {/* Browser chrome */}
      <div style={{
        background: '#F0EFED',
        borderBottom: '1px solid #E0DDD8',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
        </div>
        <div style={{
          flex: 1,
          background: '#E4E2DE',
          borderRadius: 6,
          height: 22,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 10,
          fontSize: 11,
          color: '#9A9690',
          fontFamily: 'monospace',
        }}>
          fotonizer.com/dashboard
        </div>
      </div>
      {children}
    </div>
  )
}

// ── Dashboard Mockup ────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <BrowserFrame>
      <div style={{ background: '#F8F8F6', display: 'flex', height: 380 }}>
        {/* Sidebar */}
        <div style={{ width: 200, background: '#FFFFFF', borderRight: '1px solid #E8E4DC', padding: '16px 12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, paddingLeft: 4 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(196,164,124,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#C4A47C' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111110' }}>Fotonizer</span>
          </div>
          {[
            { label: 'Dashboard', active: true },
            { label: 'Projects', active: false },
            { label: 'Clients', active: false },
            { label: 'Galleries', active: false },
            { label: 'Contracts', active: false },
            { label: 'Invoices', active: false },
          ].map(({ label, active }) => (
            <div key={label} style={{
              padding: '7px 10px',
              borderRadius: 8,
              marginBottom: 2,
              fontSize: 12,
              fontWeight: active ? 600 : 400,
              background: active ? '#111110' : 'transparent',
              color: active ? '#FFFFFF' : '#7A7670',
            }}>
              {label}
            </div>
          ))}
        </div>
        {/* Main content */}
        <div style={{ flex: 1, padding: '20px 20px', overflow: 'hidden' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111110', marginBottom: 4 }}>Good morning 👋</div>
          <div style={{ fontSize: 12, color: '#9A9690', marginBottom: 20 }}>Here's what's happening today</div>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Active Projects', value: '12', color: '#3B82F6' },
              { label: 'Pending Contracts', value: '3', color: '#F59E0B' },
              { label: 'Galleries', value: '8', color: '#10B981' },
              { label: 'Revenue', value: '€4.2k', color: '#C4A47C' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#FFFFFF', borderRadius: 10, padding: '12px 14px', border: '1px solid #F0EDE8' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color, marginBottom: 2 }}>{value}</div>
                <div style={{ fontSize: 10, color: '#9A9690' }}>{label}</div>
              </div>
            ))}
          </div>
          {/* Recent projects */}
          <div style={{ background: '#FFFFFF', borderRadius: 10, border: '1px solid #F0EDE8', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #F0EDE8', fontSize: 11, fontWeight: 700, color: '#111110' }}>Recent Projects</div>
            {[
              { name: 'Laura & Marc Wedding', date: 'Mar 27', status: 'Active', color: '#10B981' },
              { name: 'Studio Portrait — Anna K.', date: 'Apr 3', status: 'Contract sent', color: '#F59E0B' },
              { name: 'Brand Shoot — TechCorp', date: 'Apr 10', status: 'Gallery ready', color: '#3B82F6' },
            ].map(({ name, date, status, color }) => (
              <div key={name} style={{ padding: '8px 14px', borderBottom: '1px solid #F8F7F4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#111110' }}>{name}</div>
                  <div style={{ fontSize: 10, color: '#9A9690' }}>{date}</div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color, background: `${color}15`, padding: '2px 8px', borderRadius: 999 }}>{status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

// ── Client Portal Mockup ────────────────────────────────────────────
function ClientPortalMockup() {
  return (
    <BrowserFrame>
      <div style={{ background: '#F8F7F4', height: 320 }}>
        {/* Header */}
        <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8E4DC', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(196,164,124,0.15)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#111110' }}>Anna Hochzeitsfotografie</span>
          </div>
          <div style={{ fontSize: 10, color: '#9A9690' }}>Laura & Marc · Wedding</div>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 18, fontWeight: 300, color: '#111110', marginBottom: 4 }}>Laura & Marc</div>
          <div style={{ fontSize: 11, color: '#9A9690', marginBottom: 16 }}>27 March 2026 · Vienna</div>
          {/* Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { icon: '🖼️', label: 'Gallery', sub: '248 photos ready', color: '#10B981' },
              { icon: '✍️', label: 'Contract', sub: 'Signed ✓', color: '#3B82F6' },
              { icon: '📅', label: 'Timeline', sub: 'View schedule', color: '#C4A47C' },
            ].map(({ icon, label, sub, color }) => (
              <div key={label} style={{ background: '#FFFFFF', borderRadius: 10, padding: '14px', border: '1px solid #F0EDE8' }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#111110', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 10, color }}{...{}}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

// ── Gallery Mockup ──────────────────────────────────────────────────
function GalleryMockup() {
  return (
    <BrowserFrame>
      <div style={{ background: '#111110', height: 300 }}>
        {/* Hero */}
        <div style={{ position: 'relative', height: 140, background: 'linear-gradient(135deg, #2A2520 0%, #1A1510 100%)', display: 'flex', alignItems: 'flex-end', padding: '0 20px 16px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.7) 100%)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Anna Hochzeitsfotografie</div>
            <div style={{ fontSize: 20, fontWeight: 300, color: '#FFFFFF', letterSpacing: '-0.02em' }}>Laura & Marc</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>27 März 2026 · Vienna</div>
          </div>
        </div>
        {/* Grid */}
        <div style={{ padding: '12px 12px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3 }}>
          {[
            '#3A3530', '#2E2A26', '#4A4540', '#353028', '#3F3A35',
            '#2A2520', '#403C38', '#302C28', '#4A4540', '#353028',
          ].map((bg, i) => (
            <div key={i} style={{ aspectRatio: '1', borderRadius: 4, background: bg }} />
          ))}
        </div>
      </div>
    </BrowserFrame>
  )
}

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
              Fotonizer
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {[
              { href: '#features', label: 'Features' },
              { href: '#pricing', label: 'Pricing' },
              { href: '#faq', label: 'FAQ' },
            ].map(({ href, label }) => (
              <a key={href} href={href} className="text-[13.5px] font-medium transition-colors hover:text-[var(--text-primary)]" style={{ color: 'var(--text-muted)' }}>
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[13.5px] font-semibold transition-colors hidden sm:block"
              style={{ color: 'var(--text-secondary)' }}>
              Sign in
            </Link>
            <Link href="/signup"
              className="btn-shimmer flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13.5px] font-bold text-white transition-all"
              style={{ background: 'var(--accent)' }}>
              Start free
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(196,164,124,0.12) 0%, transparent 70%)',
        }} />

        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-bold mb-8 animate-in"
            style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid rgba(196,164,124,0.2)' }}>
            <Zap className="w-3 h-3" />
            Built by photographers, for photographers.
          </div>

          {/* Headline */}
          <h1 className="animate-in-delay-1 font-black mb-6"
            style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', letterSpacing: '-0.04em', lineHeight: 1.0, color: 'var(--text-primary)' }}>
            Run your photography{' '}
            <span className="text-gradient-gold">studio in one place.</span>
          </h1>

          {/* Subtext */}
          <p className="animate-in-delay-2 text-[17px] leading-relaxed max-w-2xl mx-auto mb-10"
            style={{ color: 'var(--text-secondary)' }}>
            Manage bookings, contracts, client communication and galleries in one simple platform
            designed for modern photography studios.
          </p>

          {/* CTAs */}
          <div className="animate-in-delay-3 flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Link href="/signup"
              className="btn-shimmer flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-bold text-white transition-all"
              style={{ background: 'var(--accent)', boxShadow: '0 4px 20px rgba(196,164,124,0.35)' }}>
              Start free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#features"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-semibold transition-all"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
              View demo
            </a>
          </div>

          {/* Social proof */}
          <div className="animate-in-delay-4 flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {['#C4A47C', '#8B7355', '#D4B48C', '#A8845C', '#E8C89C'].map((color, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ borderColor: 'var(--bg-page)', background: color }}>
                  {['A', 'T', 'J', 'M', 'S'][i]}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" style={{ color: 'var(--accent)' }} />
              ))}
            </div>
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Trusted by <strong style={{ color: 'var(--text-primary)' }}>200+</strong> photographers across Europe
            </span>
          </div>
        </div>

        {/* ── HERO MOCKUP ── */}
        <div className="relative max-w-5xl mx-auto px-6 pb-24">
          <div style={{
            background: 'radial-gradient(ellipse 70% 60% at 50% 100%, rgba(196,164,124,0.10) 0%, transparent 70%)',
            position: 'absolute', inset: 0, pointerEvents: 'none',
          }} />
          <DashboardMockup />
        </div>
      </section>

      {/* ── PROBLEM SECTION ── */}
      <section className="py-24" style={{ background: 'var(--bg-page-2)' }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="label-caps mb-3">The problem</p>
          <h2 className="font-black mb-6" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
            Stop juggling five different tools.
          </h2>
          <p className="text-[17px] leading-relaxed max-w-2xl mx-auto mb-6" style={{ color: 'var(--text-secondary)' }}>
            Most photography businesses use a mix of calendars, contracts, email threads and gallery platforms.
          </p>
          <p className="text-[17px] leading-relaxed max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Fotonizer brings everything together in one clean system designed specifically for photographers.
          </p>
        </div>
      </section>

      {/* ── FEATURE SECTIONS (alternating) ── */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6 space-y-32">

          {/* 1 — Bookings */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="label-caps mb-3">Bookings</p>
              <h2 className="font-black mb-5" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', letterSpacing: '-0.03em' }}>
                Stay on top of every shoot.
              </h2>
              <p className="text-[16px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                Track bookings, sessions and clients in one clear overview.
              </p>
              <p className="text-[16px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Know exactly what&apos;s coming next and keep your schedule organized without spreadsheets or scattered tools.
              </p>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(ellipse at center, rgba(196,164,124,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <BrowserFrame>
                <div style={{ background: '#F8F8F6', padding: 20, height: 260 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111110', marginBottom: 14 }}>Upcoming Sessions</div>
                  {[
                    { name: 'Laura & Marc', type: 'Wedding', date: 'Mar 27', time: '10:00', color: '#C4A47C' },
                    { name: 'Anna K.', type: 'Portrait', date: 'Apr 3', time: '14:00', color: '#3B82F6' },
                    { name: 'TechCorp', type: 'Commercial', date: 'Apr 10', time: '09:00', color: '#10B981' },
                    { name: 'Familie Müller', type: 'Family', date: 'Apr 15', time: '16:00', color: '#F59E0B' },
                  ].map(({ name, type, date, time, color }) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#FFFFFF', borderRadius: 10, marginBottom: 8, border: '1px solid #F0EDE8' }}>
                      <div style={{ width: 4, height: 36, borderRadius: 2, background: color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#111110' }}>{name}</div>
                        <div style={{ fontSize: 10, color: '#9A9690' }}>{type}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#111110' }}>{date}</div>
                        <div style={{ fontSize: 10, color: '#9A9690' }}>{time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </BrowserFrame>
            </div>
          </div>

          {/* 2 — Contracts */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="md:order-2">
              <p className="label-caps mb-3">Contracts</p>
              <h2 className="font-black mb-5" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', letterSpacing: '-0.03em' }}>
                Contracts without the hassle.
              </h2>
              <p className="text-[16px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                Create, send and manage contracts in seconds.
              </p>
              <p className="text-[16px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Clients can review and sign online while you keep everything organized in one place.
              </p>
            </div>
            <div className="md:order-1" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <BrowserFrame>
                <div style={{ background: '#F8F8F6', padding: 20, height: 260 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111110', marginBottom: 14 }}>Photography Contract</div>
                  <div style={{ background: '#FFFFFF', borderRadius: 10, padding: 16, border: '1px solid #F0EDE8', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: '#9A9690', marginBottom: 8 }}>Client</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111110', marginBottom: 12 }}>Laura & Marc Hoffmann</div>
                    <div style={{ height: 1, background: '#F0EDE8', marginBottom: 12 }} />
                    <div style={{ fontSize: 11, color: '#9A9690', marginBottom: 6 }}>Contract terms</div>
                    {[80, 60, 90, 50].map((w, i) => (
                      <div key={i} style={{ height: 8, background: '#F0EDE8', borderRadius: 4, marginBottom: 6, width: `${w}%` }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, padding: '8px 12px', background: '#111110', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }}>
                      Sign contract ✓
                    </div>
                    <div style={{ padding: '8px 12px', background: '#F0EDE8', borderRadius: 8, fontSize: 11, color: '#7A7670', textAlign: 'center' }}>
                      Download
                    </div>
                  </div>
                </div>
              </BrowserFrame>
            </div>
          </div>

          {/* 3 — Galleries */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="label-caps mb-3">Galleries</p>
              <h2 className="font-black mb-5" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', letterSpacing: '-0.03em' }}>
                Beautiful galleries your clients will love.
              </h2>
              <p className="text-[16px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Deliver images through elegant online galleries where clients can view, download and select their favorites easily.
              </p>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <GalleryMockup />
            </div>
          </div>

          {/* 4 — Client Portal */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="md:order-2">
              <p className="label-caps mb-3">Client Portal</p>
              <h2 className="font-black mb-5" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', letterSpacing: '-0.03em' }}>
                Give every client their own portal.
              </h2>
              <p className="text-[16px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                Each client gets a private space where they can follow their project, access contracts, share moodboards and view their gallery.
              </p>
              <p className="text-[16px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                This creates a premium experience that photographers and clients both love.
              </p>
            </div>
            <div className="md:order-1" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(ellipse at center, rgba(196,164,124,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <ClientPortalMockup />
            </div>
          </div>

        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="py-24" style={{ background: 'var(--bg-page-2)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="label-caps mb-3">Everything included</p>
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
              Built for real photography workflows.
            </h2>
            <p className="text-[16px] max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              From the first booking to the final gallery delivery, Fotonizer supports every step of your process.
              No generic business tools. Just what photographers actually need.
            </p>
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
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="label-caps mb-3">For every photographer</p>
          <h2 className="font-black mb-10" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', letterSpacing: '-0.03em' }}>
            Fotonizer works for every style and genre
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
      <section className="py-24" style={{ background: 'var(--bg-page-2)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="label-caps mb-3">What photographers say</p>
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
              Photographers love Fotonizer
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
      <section id="pricing" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="label-caps mb-3">Pricing</p>
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
              Transparent. Fair. Cancel anytime.
            </h2>
            <p className="text-[16px]" style={{ color: 'var(--text-secondary)' }}>
              Start free — upgrade when you&apos;re ready.
            </p>
          </div>
          <PricingSection />
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24" style={{ background: 'var(--bg-page-2)' }}>
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="label-caps mb-3">FAQ</p>
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
              Common questions
            </h2>
          </div>
          <FAQAccordion />
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="glass-card p-12 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(196,164,124,0.10) 0%, transparent 70%)',
            }} />
            <div className="relative">
              <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
                Run your photography business like a pro.
              </h2>
              <p className="text-[16px] mb-8" style={{ color: 'var(--text-secondary)' }}>
                Join photographers who are simplifying their workflow with Fotonizer.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/signup"
                  className="btn-shimmer flex items-center gap-2 px-8 py-3.5 rounded-xl text-[15px] font-bold text-white"
                  style={{ background: 'var(--accent)', boxShadow: '0 4px 20px rgba(196,164,124,0.35)' }}>
                  Start free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#features"
                  className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-[15px] font-semibold transition-all"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  Book a demo
                </a>
              </div>
              <div className="flex items-center justify-center gap-6 mt-8">
                {[
                  { icon: CheckCircle2, text: 'Free to start' },
                  { icon: Shield, text: 'GDPR compliant' },
                  { icon: Globe, text: 'EU servers' },
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
                <span className="font-bold text-[15px]" style={{ letterSpacing: '-0.02em' }}>Fotonizer</span>
              </div>
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                Studio management for professional photographers.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {[
                { href: '#features', label: 'Features' },
                { href: '#pricing', label: 'Pricing' },
                { href: '/login', label: 'Sign in' },
                { href: '/signup', label: 'Sign up' },
                { href: '/impressum', label: 'Impressum' },
                { href: '/datenschutz', label: 'Privacy' },
                { href: '/agb', label: 'Terms' },
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
              © {new Date().getFullYear()} Fotonizer. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                200+ photographers trust Fotonizer
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
