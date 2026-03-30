'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Star, Zap, Shield, Globe } from 'lucide-react'

// ── Glass primitives ──────────────────────────────────────────────────
const glass = {
  light: {
    bg:     'rgba(255,255,255,0.62)',
    border: 'rgba(255,255,255,0.85)',
    shadow: '0 8px 32px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)',
  },
  mid: {
    bg:     'rgba(255,255,255,0.42)',
    border: 'rgba(255,255,255,0.65)',
    shadow: '0 12px 40px rgba(0,0,0,0.09), inset 0 1px 0 rgba(255,255,255,0.8)',
  },
  dark: {
    bg:     'rgba(255,255,255,0.22)',
    border: 'rgba(255,255,255,0.38)',
    shadow: '0 16px 48px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.5)',
  },
}

function GlassCard({ children, style = {}, level = 'mid' }: {
  children: React.ReactNode
  style?: React.CSSProperties
  level?: 'light' | 'mid' | 'dark'
}) {
  const g = glass[level]
  return (
    <div style={{
      background: g.bg,
      border: `1px solid ${g.border}`,
      boxShadow: g.shadow,
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderRadius: 20,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── Background gradient (no photo) ───────────────────────────────────
function Background() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' }}>
      {/* Soft warm gradient base */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #f0ebe3 0%, #e8e0d5 30%, #ddd5c8 60%, #e6dfd8 100%)' }} />
      {/* Subtle warm accent blobs */}
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(196,164,124,0.25) 0%, transparent 70%)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '55%', height: '55%', background: 'radial-gradient(circle, rgba(168,185,210,0.20) 0%, transparent 70%)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', top: '40%', right: '20%', width: '35%', height: '35%', background: 'radial-gradient(circle, rgba(196,164,124,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />
      {/* Grain */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '180px' }} />
    </div>
  )
}

// ── Dashboard mockup (glass style) ───────────────────────────────────
function GlassDashboard() {
  return (
    <div style={{
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.6)',
      backdropFilter: 'blur(40px)',
      WebkitBackdropFilter: 'blur(40px)',
    }}>
      {/* Browser bar */}
      <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.8)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#FF5F57','#FEBC2E','#28C840'].map((c,i) => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.06)', borderRadius: 5, height: 18, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 9, color: 'rgba(0,0,0,0.35)', fontFamily: 'monospace' }}>fotonizer.com/dashboard</div>
      </div>

      {/* Body */}
      <div style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(40px)', display: 'flex', height: 300 }}>
        {/* Sidebar */}
        <div style={{ width: 150, background: 'rgba(255,255,255,0.5)', borderRight: '1px solid rgba(255,255,255,0.6)', padding: '14px 10px', backdropFilter: 'blur(20px)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 18, paddingLeft: 4 }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(168,132,92,0.2)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#2A2520' }}>Fotonizer</span>
          </div>
          {[
            ['Dashboard', true], ['Inbox', false], ['Bookings', false], ['Projects', false],
            ['Pipeline', false], ['Clients', false], ['Galleries', false], ['Contracts', false],
            ['Invoices', false], ['Analytics', false],
          ].map(([label, active]) => (
            <div key={label as string} style={{
              padding: '5px 8px', borderRadius: 7, marginBottom: 2,
              fontSize: 9.5, fontWeight: active ? 600 : 400,
              background: active ? 'rgba(168,132,92,0.15)' : 'transparent',
              color: active ? '#8A6A3C' : 'rgba(0,0,0,0.4)',
              backdropFilter: active ? 'blur(8px)' : 'none',
              border: active ? '1px solid rgba(168,132,92,0.2)' : '1px solid transparent',
            }}>{label as string}</div>
          ))}
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: '16px', overflow: 'hidden' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1510', marginBottom: 2 }}>Good morning 👋</div>
          <div style={{ fontSize: 8.5, color: 'rgba(0,0,0,0.4)', marginBottom: 14 }}>Here&apos;s what&apos;s happening today</div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
            {[{ v: '12', l: 'Projects', c: '#5B8DEF' }, { v: '3', l: 'Invoices', c: '#F59E0B' }, { v: '8', l: 'Galleries', c: '#34C77B' }, { v: '€4.2k', l: 'Revenue', c: '#A8845C' }].map(({ v, l, c }) => (
              <div key={l} style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 9, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', backdropFilter: 'blur(12px)' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: c, marginBottom: 1 }}>{v}</div>
                <div style={{ fontSize: 7.5, color: 'rgba(0,0,0,0.4)' }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Recent projects */}
          <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.75)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', backdropFilter: 'blur(16px)', overflow: 'hidden' }}>
            <div style={{ padding: '7px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: 9, fontWeight: 700, color: '#1A1510' }}>Recent Projects</div>
            {[{ n: 'Laura & Marc Wedding', d: 'Mar 27', s: 'Active', c: '#34C77B' }, { n: 'Portrait — Anna K.', d: 'Apr 3', s: 'Contract', c: '#F59E0B' }, { n: 'Brand Shoot TechCorp', d: 'Apr 10', s: 'Gallery', c: '#5B8DEF' }].map(({ n, d, s, c }) => (
              <div key={n} style={{ padding: '6px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#2A2520' }}>{n}</div>
                  <div style={{ fontSize: 8, color: 'rgba(0,0,0,0.35)' }}>{d}</div>
                </div>
                <div style={{ fontSize: 8, fontWeight: 600, color: c, background: `${c}20`, padding: '2px 7px', borderRadius: 999, border: `1px solid ${c}30` }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Feature card ──────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <GlassCard level="light" style={{ padding: '28px', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}>
      <span style={{ fontSize: 28, display: 'block', marginBottom: 16 }}>{icon}</span>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1510', marginBottom: 8, letterSpacing: '-0.02em' }}>{title}</h3>
      <p style={{ fontSize: 13.5, color: 'rgba(0,0,0,0.5)', lineHeight: 1.65 }}>{desc}</p>
    </GlassCard>
  )
}

// ── Section wrapper — full-width glass panel ──────────────────────────
function GlassSection({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.30)',
      backdropFilter: 'blur(28px)',
      WebkitBackdropFilter: 'blur(28px)',
      borderTop: '1px solid rgba(255,255,255,0.55)',
      borderBottom: '1px solid rgba(255,255,255,0.35)',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────
export default function GlassDemoPage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')

  return (
    <div style={{ position: 'relative', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif' }}>
      <Background />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── NAVBAR ── */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            height: 64,
            background: 'rgba(255,255,255,0.52)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            borderBottom: '1px solid rgba(255,255,255,0.65)',
            padding: '0 48px',
            boxShadow: '0 1px 0 rgba(255,255,255,0.5), 0 4px 24px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(168,132,92,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(168,132,92,0.2)' }}>
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                  <path d="M4 14V7.5L10 4L16 7.5V14" stroke="#A8845C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7.5 14V10.5H12.5V14" stroke="#A8845C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#1A1510', letterSpacing: '-0.03em' }}>Fotonizer</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              {['Features', 'Pricing', 'FAQ', 'Blog'].map(l => (
                <a key={l} href="#" style={{ fontSize: 14, fontWeight: 500, color: 'rgba(0,0,0,0.48)', textDecoration: 'none' }}>{l}</a>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <a href="#" style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(0,0,0,0.48)', textDecoration: 'none' }}>Sign in</a>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 12, background: '#A8845C', fontSize: 13.5, fontWeight: 700, color: '#FFF', cursor: 'pointer', boxShadow: '0 4px 16px rgba(168,132,92,0.35)' }}>
                Start free <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </nav>

        {/* ── HERO — transparent, image shows through most here ── */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '110px 48px 90px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 100, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', marginBottom: 44, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <Zap size={13} color="#A8845C" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#8A6A3C' }}>Built by photographers, for photographers</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.8rem, 6vw, 5.5rem)', fontWeight: 900, color: '#1A1510', letterSpacing: '-0.045em', lineHeight: 1.05, marginBottom: 28 }}>
            Your photography studio.
            <br />
            <span style={{ background: 'linear-gradient(135deg, #A8845C 0%, #C4A47C 50%, #8A6A3C 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              All in one place.
            </span>
          </h1>
          <p style={{ fontSize: 19, color: 'rgba(0,0,0,0.52)', lineHeight: 1.65, maxWidth: 580, margin: '0 auto 48px' }}>
            Manage bookings, contracts, galleries and client communication — in one clean platform built for modern studios.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 64 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 14, background: '#A8845C', fontSize: 15, fontWeight: 700, color: '#FFF', cursor: 'pointer', boxShadow: '0 8px 28px rgba(168,132,92,0.40)' }}>
              Start free <ArrowRight size={16} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 14, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', fontSize: 15, fontWeight: 600, color: 'rgba(0,0,0,0.58)', cursor: 'pointer' }}>
              View demo
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 80 }}>
            <div style={{ display: 'flex' }}>
              {['#C4A47C','#8B7355','#D4B48C','#A8845C','#E8C89C'].map((color, i) => (
                <div key={i} style={{ width: 34, height: 34, borderRadius: '50%', background: color, border: '2.5px solid rgba(255,255,255,0.9)', marginLeft: i === 0 ? 0 : -10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#FFF', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>{['A','T','J','M','S'][i]}</div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#A8845C" color="#A8845C" />)}
            </div>
            <span style={{ fontSize: 13.5, color: 'rgba(0,0,0,0.45)' }}>Trusted by <strong style={{ color: '#1A1510' }}>200+ photographers</strong> across Europe</span>
          </div>
          <GlassDashboard />
        </section>

        {/* ── PROBLEM ── glass panel, full-width */}
        <GlassSection style={{ padding: '80px 48px' }}>
          <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#A8845C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 }}>The Problem</p>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#1A1510', letterSpacing: '-0.035em', lineHeight: 1.1, marginBottom: 22 }}>
              Stop juggling five different tools.
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(0,0,0,0.5)', lineHeight: 1.65, marginBottom: 14 }}>
              Most photography businesses use a mix of calendars, contracts, email threads and gallery platforms.
            </p>
            <p style={{ fontSize: 17, color: 'rgba(0,0,0,0.5)', lineHeight: 1.65 }}>
              Fotonizer brings everything together in one clean system — built specifically for photographers.
            </p>
          </div>
        </GlassSection>

        {/* ── FEATURES GRID ── transparent, cards float on photo */}
        <section id="features" style={{ padding: '96px 48px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#A8845C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>Everything included</p>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#1A1510', letterSpacing: '-0.035em', lineHeight: 1.1, marginBottom: 14 }}>Built for real photo workflows.</h2>
              <p style={{ fontSize: 17, color: 'rgba(0,0,0,0.48)', maxWidth: 500, margin: '0 auto' }}>From the first booking to the final gallery delivery — every step covered.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { icon: '📬', title: 'Inbox', desc: 'Every client conversation in one place. No more lost emails.' },
                { icon: '📋', title: 'Forms', desc: 'Capture inquiries automatically. Every lead lands in your dashboard.' },
                { icon: '🖼️', title: 'Galleries', desc: 'Deliver beautiful online galleries with download control and client favorites.' },
                { icon: '✍️', title: 'Contracts', desc: 'Send and sign contracts in minutes. Clients sign online.' },
                { icon: '📅', title: 'Bookings', desc: "All sessions in one clear overview. Always know what's next." },
                { icon: '📊', title: 'Analytics', desc: 'Revenue, conversion and growth at a glance. Understand your studio.' },
                { icon: '💌', title: 'Email Templates', desc: 'Write once, send forever. Smart variables for personal-feeling messages.' },
                { icon: '👥', title: 'Client CRM', desc: 'Every client, project and interaction — organized and searchable.' },
                { icon: '💳', title: 'Invoices', desc: 'Professional invoices created and sent directly from the platform.' },
              ].map(({ icon, title, desc }) => (
                <FeatureCard key={title} icon={icon} title={title} desc={desc} />
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ── glass panel */}
        <GlassSection style={{ padding: '96px 48px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#A8845C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>What photographers say</p>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#1A1510', letterSpacing: '-0.035em' }}>Photographers love Fotonizer</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { quote: 'My clients always comment on how professional the portal looks. It sets the tone from day one.', name: 'Anna M.', role: 'Wedding Photographer · Vienna' },
                { quote: 'I save at least 3 hours a week that I used to spend on emails, PDFs and file transfers.', name: 'Thomas B.', role: 'Portrait Photographer · Berlin' },
                { quote: 'Finally a tool built by someone who actually photographs. Everything just makes sense.', name: 'Julia S.', role: 'Commercial Photographer · Zurich' },
              ].map(({ quote, name, role }) => (
                <GlassCard key={name} level="light" style={{ padding: '32px' }}>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 20 }}>
                    {[...Array(5)].map((_, i) => <Star key={i} size={15} fill="#A8845C" color="#A8845C" />)}
                  </div>
                  <p style={{ fontSize: 14.5, color: 'rgba(0,0,0,0.58)', lineHeight: 1.65, marginBottom: 24 }}>&ldquo;{quote}&rdquo;</p>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1510' }}>{name}</p>
                    <p style={{ fontSize: 12.5, color: 'rgba(0,0,0,0.4)', marginTop: 3 }}>{role}</p>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </GlassSection>

        {/* ── PRICING ── transparent, cards float */}
        <section id="pricing" style={{ padding: '96px 48px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#A8845C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>Pricing</p>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#1A1510', letterSpacing: '-0.035em', marginBottom: 12 }}>Transparent. Fair. Cancel anytime.</h2>
              <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.45)', marginBottom: 32 }}>Start free — upgrade when you&apos;re ready.</p>
              <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 12, padding: 4, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', gap: 4 }}>
                {(['monthly', 'annual'] as const).map(b => (
                  <button key={b} onClick={() => setBilling(b)} style={{ padding: '8px 22px', borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', border: 'none', background: billing === b ? '#A8845C' : 'transparent', color: billing === b ? '#FFF' : 'rgba(0,0,0,0.45)', transition: 'all 0.2s ease', boxShadow: billing === b ? '0 2px 10px rgba(168,132,92,0.35)' : 'none' }}>
                    {b === 'monthly' ? 'Monthly' : 'Annual'}{b === 'annual' && billing === 'annual' && <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.25)', borderRadius: 6, padding: '1px 7px', marginLeft: 7 }}>−20%</span>}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { name: 'Free', price: '0', desc: 'Get started, no card needed', features: ['1 active project', '5 clients', 'Basic gallery', 'Inquiry form'], popular: false },
                { name: 'Pro', price: billing === 'monthly' ? '29' : '23', desc: 'Everything you need to run your studio', features: ['Unlimited projects', 'Unlimited clients', 'Custom galleries', 'Contracts + e-sign', 'Invoices', 'Email templates', 'Analytics'], popular: true },
                { name: 'Studio', price: billing === 'monthly' ? '79' : '63', desc: 'For teams and busy studios', features: ['Everything in Pro', 'Team members', 'Pipeline CRM', 'Priority support', 'Custom domain', 'Automations'], popular: false },
              ].map(({ name, price, desc, features, popular }) => (
                <GlassCard key={name} level={popular ? 'mid' : 'light'} style={{ padding: '32px', position: 'relative', border: popular ? '1.5px solid rgba(168,132,92,0.35)' : undefined }}>
                  {popular && (
                    <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: '#A8845C', color: '#FFF', fontSize: 11, fontWeight: 700, padding: '4px 16px', borderRadius: 100, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(168,132,92,0.4)' }}>
                      Most popular
                    </div>
                  )}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1510', marginBottom: 6 }}>{name}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                      <span style={{ fontSize: 42, fontWeight: 900, color: '#1A1510', letterSpacing: '-0.04em' }}>€{price}</span>
                      <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.4)', fontWeight: 500 }}>/mo</span>
                    </div>
                    <p style={{ fontSize: 13.5, color: 'rgba(0,0,0,0.45)', lineHeight: 1.5 }}>{desc}</p>
                  </div>
                  <div style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: 'rgba(0,0,0,0.58)' }}>
                        <CheckCircle2 size={14} color="#A8845C" />{f}
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '12px', borderRadius: 12, textAlign: 'center', fontSize: 14, fontWeight: 700, cursor: 'pointer', background: popular ? '#A8845C' : 'rgba(255,255,255,0.7)', color: popular ? '#FFF' : '#1A1510', border: popular ? 'none' : '1px solid rgba(255,255,255,0.9)', boxShadow: popular ? '0 6px 20px rgba(168,132,92,0.38)' : '0 2px 8px rgba(0,0,0,0.05)' }}>
                    {name === 'Free' ? 'Start for free' : `Get ${name}`}
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ── glass panel */}
        <GlassSection style={{ padding: '96px 48px 110px' }}>
          <div style={{ maxWidth: 740, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 900, color: '#1A1510', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 20 }}>
              Run your photography business like a pro.
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(0,0,0,0.45)', marginBottom: 40 }}>
              Join photographers who simplify their workflow with Fotonizer.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 36px', borderRadius: 14, background: '#A8845C', fontSize: 15, fontWeight: 700, color: '#FFF', cursor: 'pointer', boxShadow: '0 8px 28px rgba(168,132,92,0.40)' }}>
                Start for free <ArrowRight size={16} />
              </div>
              <div style={{ padding: '14px 28px', borderRadius: 14, background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', fontSize: 15, fontWeight: 600, color: 'rgba(0,0,0,0.55)', cursor: 'pointer' }}>
                Book a demo
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
              {[['Free to start', CheckCircle2], ['GDPR compliant', Shield], ['EU servers', Globe]].map(([text, Icon]) => (
                <div key={text as string} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'rgba(0,0,0,0.4)' }}>
                  {/* @ts-expect-error dynamic icon */}
                  <Icon size={14} color="#A8845C" />{text}
                </div>
              ))}
            </div>
          </div>
        </GlassSection>

        {/* ── FOOTER ── */}
        <footer style={{ background: 'rgba(255,255,255,0.40)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', borderTop: '1px solid rgba(255,255,255,0.65)', padding: '48px 48px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(168,132,92,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                    <path d="M4 14V7.5L10 4L16 7.5V14" stroke="#A8845C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7.5 14V10.5H12.5V14" stroke="#A8845C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#1A1510', letterSpacing: '-0.02em' }}>Fotonizer</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)' }}>Studio management for professional photographers.</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              {['Features', 'Pricing', 'Blog', 'Sign in', 'Impressum', 'Privacy', 'Terms'].map(l => (
                <a key={l} href="#" style={{ fontSize: 13, color: 'rgba(0,0,0,0.38)', textDecoration: 'none' }}>{l}</a>
              ))}
            </div>
          </div>
          <div style={{ maxWidth: 1100, margin: '24px auto 0', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.55)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.3)' }}>© 2025 Fotonizer. All rights reserved.</span>
            <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.3)' }}>200+ photographers trust Fotonizer</span>
          </div>
        </footer>

      </div>
    </div>
  )
}
