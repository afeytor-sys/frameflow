'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Star, Zap, Shield, Globe, Camera, Users, Menu, X } from 'lucide-react'
import PricingSection from '@/components/marketing/PricingSection'
import FAQAccordion from '@/components/marketing/FAQAccordion'

// ── Translations ─────────────────────────────────────────────────────
const T = {
  de: {
    nav: { features: 'Features', pricing: 'Preise', faq: 'FAQ', blog: 'Blog', signin: 'Anmelden', cta: 'Kostenlos starten' },
    badge: 'Built by photographers, for photographers.',
    h1a: 'Fotonizer ist dein Fotostudio-Organizer.',
    h1b: 'Alles an einem Ort.',
    sub: 'Bookings, contracts, client communication and galleries — in one simple platform for modern photo studios.',
    ctaPrimary: 'Kostenlos starten',
    ctaSecondary: 'Demo ansehen',
    socialProof: 'Vertraut von',
    socialProof2: '200+ Fotografen in Europa',
    darkModeLabel: 'Hell & Dunkel — du entscheidest.',
    darkModeSub: 'Fotonizer passt sich deinem Stil an. Wechsle jederzeit zwischen hellem und dunklem Modus.',
    problem: { label: 'The Problem', h2: 'Stop juggling five different tools.', p1: 'Most photography businesses use a mix of calendars, contracts, email threads and gallery platforms.', p2: 'Fotonizer brings everything together in one clean system — built specifically for photographers.' },
    bookings: { label: 'Bookings', h2: 'Keep track of every shoot.', p1: 'Manage bookings, sessions and clients in one clear overview.', p2: 'Always know what’s coming next — no spreadsheets or scattered tools.' },
    contracts: { label: 'Contracts', h2: 'Contracts without the hassle.', p1: 'Create, send and manage contracts in seconds.', p2: 'Clients can sign online — you keep everything in one place.' },
    analytics: { label: 'Analytics', h2: 'Your studio at a glance.', p1: 'Revenue, open invoices, clients and conversion rate — all in one clear overview.', p2: 'Understand how your business grows and make better decisions.' },
    portal: { label: 'Client Portal', h2: 'Every client gets their own portal.', p1: 'Each client gets a private space for their project — gallery, contract, timeline and meeting point.', p2: 'This creates a premium experience that photographers and clients love equally.' },
    featuresSection: { label: 'Everything included', h2: 'Built for real photo workflows.', sub: 'From the first booking to the final gallery delivery — Fotonizer supports every step.' },
    features: [
      { icon: '📅', title: 'Bookings & Sessions', desc: 'Track every shoot, session and client in one clear overview.' },
      { icon: '✍️', title: 'Digital Contracts', desc: 'Create and send contracts in seconds. Clients sign online.' },
      { icon: '🖼️', title: 'Photo Galleries', desc: 'Deliver images via beautiful online galleries — with download control and client favorites.' },
      { icon: '🔗', title: 'Client Portal', desc: 'Every client gets a private space for their project, contracts, moodboards and gallery.' },
      { icon: '📊', title: 'Analytics', desc: 'Umsatz, Konversionsrate und Wachstum auf einen Blick. Verstehe dein Business.' },
      { icon: '💳', title: 'Rechnungen', desc: 'Professionelle Rechnungen direkt aus der Plattform erstellen und versenden.' },
    ],
    genres: [
      { emoji: '🤵', label: 'Hochzeit' },
      { emoji: '👤', label: 'Portrait' },
      { emoji: '🎉', label: 'Events' },
      { emoji: '🏢', label: 'Commercial' },
      { emoji: '🏠', label: 'Immobilien' },
      { emoji: '🎨', label: 'Fine Art' },
    ],
    testimonials: { label: 'Was Fotografen sagen', h2: 'Fotografen lieben Fotonizer' },
    reviews: [
      { quote: 'Meine Kunden fragen immer, welches Tool ich benutze. Das Portal wirkt so professionell.', name: 'Anna M.', role: 'Hochzeitsfotografin · Wien', stars: 5 },
      { quote: 'I save at least 3 hours a week that I used to spend on emails and PDFs.', name: 'Thomas B.', role: 'Portrait Photographer · Berlin', stars: 5 },
      { quote: 'Finally a tool that was truly built for photographers. Everything just makes sense.', name: 'Julia S.', role: 'Commercial Photographer · Zurich', stars: 5 },
    ],
    pricing: { label: 'Pricing', h2: 'Transparent. Fair. Cancel anytime.', sub: 'Start for free — upgrade when you’re ready.' },
    faq: { label: 'FAQ', h2: 'Frequently asked questions' },
    finalCta: { h2: 'Run your photography business like a pro.', sub: 'Join photographers who simplify their workflow with Fotonizer.', btn1: 'Start for free', btn2: 'Book a demo' },
    trust: ['Kostenlos starten', 'DSGVO-konform', 'EU-Server'],
    footer: { tagline: 'Studio management for professional photographers.', copyright: 'All rights reserved.', social: '200+ photographers trust Fotonizer' },
    footerLinks: [
      { href: '#features', label: 'Features' },
      { href: '#pricing', label: 'Preise' },
      { href: '/blog', label: 'Blog' },
      { href: '/login', label: 'Anmelden' },
      { href: '/signup', label: 'Registrieren' },
      { href: '/impressum', label: 'Impressum' },
      { href: '/datenschutz', label: 'Datenschutz' },
      { href: '/agb', label: 'AGB' },
    ],
  },
  en: {
    nav: { features: 'Features', pricing: 'Pricing', faq: 'FAQ', blog: 'Blog', signin: 'Sign in', cta: 'Start free' },
    badge: 'Built by photographers, for photographers.',
    h1a: 'Your photography studio.',
    h1b: 'All in one place.',
    sub: 'Manage bookings, contracts, client communication and galleries in one simple platform designed for modern photography studios.',
    ctaPrimary: 'Start free',
    ctaSecondary: 'View demo',
    socialProof: 'Trusted by',
    socialProof2: '200+ photographers across Europe',
    darkModeLabel: 'Light & Dark — your choice.',
    darkModeSub: 'Fotonizer adapts to your style. Switch between light and dark mode anytime.',
    problem: { label: 'The problem', h2: 'Stop juggling five different tools.', p1: 'Most photography businesses use a mix of calendars, contracts, email threads and gallery platforms.', p2: 'Fotonizer brings everything together in one clean system designed specifically for photographers.' },
    bookings: { label: 'Bookings', h2: 'Stay on top of every shoot.', p1: 'Track bookings, sessions and clients in one clear overview.', p2: "Know exactly what's coming next without spreadsheets or scattered tools." },
    contracts: { label: 'Contracts', h2: 'Contracts without the hassle.', p1: 'Create, send and manage contracts in seconds.', p2: 'Clients can review and sign online while you keep everything organized.' },
    analytics: { label: 'Analytics', h2: 'Your studio at a glance.', p1: 'Revenue, open invoices, clients and conversion rate — all in one clear overview.', p2: 'Understand how your business is growing and make better decisions.' },
    portal: { label: 'Client Portal', h2: 'Give every client their own portal.', p1: 'Each client gets a private space with their gallery, contract, timeline and meeting point.', p2: 'This creates a premium experience that photographers and clients both love.' },
    featuresSection: { label: 'Everything included', h2: 'Built for real photography workflows.', sub: 'From the first booking to the final gallery delivery, Fotonizer supports every step.' },
    features: [
      { icon: '📅', title: 'Bookings & Sessions', desc: "Track every shoot, session and client in one clear overview. Know exactly what's coming next." },
      { icon: '✍️', title: 'Digital Contracts', desc: 'Create, send and manage contracts in seconds. Clients sign online.' },
      { icon: '🖼️', title: 'Photo Galleries', desc: 'Deliver images through beautiful online galleries with download control and client favorites.' },
      { icon: '🔗', title: 'Client Portal', desc: 'Each client gets a private space for their project, contracts, moodboards and gallery.' },
      { icon: '📊', title: 'Analytics', desc: 'Revenue, conversion rate and growth at a glance. Understand your business.' },
      { icon: '💳', title: 'Invoices', desc: 'Create and send professional invoices directly from the platform.' },
    ],
    genres: [
      { emoji: '🤵', label: 'Wedding' },
      { emoji: '👤', label: 'Portrait' },
      { emoji: '🎉', label: 'Events' },
      { emoji: '🏢', label: 'Commercial' },
      { emoji: '🏠', label: 'Real Estate' },
      { emoji: '🎨', label: 'Fine Art' },
    ],
    testimonials: { label: 'What photographers say', h2: 'Photographers love Fotonizer' },
    reviews: [
      { quote: 'My clients always comment on how professional the portal looks. It sets the tone from day one.', name: 'Anna M.', role: 'Wedding Photographer · Vienna', stars: 5 },
      { quote: 'I save at least 3 hours a week that I used to spend on emails, PDFs and file transfers.', name: 'Thomas B.', role: 'Portrait Photographer · Berlin', stars: 5 },
      { quote: 'Finally a tool built by someone who actually photographs. Everything just makes sense.', name: 'Julia S.', role: 'Commercial Photographer · Zurich', stars: 5 },
    ],
    pricing: { label: 'Pricing', h2: 'Transparent. Fair. Cancel anytime.', sub: "Start free — upgrade when you're ready." },
    faq: { label: 'FAQ', h2: 'Common questions' },
    finalCta: { h2: 'Run your photography business like a pro.', sub: 'Join photographers who are simplifying their workflow with Fotonizer.', btn1: 'Start free', btn2: 'Book a demo' },
    trust: ['Free to start', 'GDPR compliant', 'EU servers'],
    footer: { tagline: 'Studio management for professional photographers.', copyright: 'All rights reserved.', social: '200+ photographers trust Fotonizer' },
    footerLinks: [
      { href: '#features', label: 'Features' },
      { href: '#pricing', label: 'Pricing' },
      { href: '/blog', label: 'Blog' },
      { href: '/login', label: 'Sign in' },
      { href: '/signup', label: 'Sign up' },
      { href: '/impressum', label: 'Impressum' },
      { href: '/datenschutz', label: 'Privacy' },
      { href: '/agb', label: 'Terms' },
    ],
  },
}

// ── Dark Browser Frame ────────────────────────────────────────────────
function DarkBrowserFrame({ children, url = 'fotonizer.com/dashboard' }: { children: React.ReactNode; url?: string }) {
  return (
    <div style={{
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.35)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ background: '#1C1C1A', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#FF5F57' }} />
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#FEBC2E' }} />
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#28C840' }} />
        </div>
        <div style={{ flex: 1, background: '#2A2A28', borderRadius: 5, height: 20, display: 'flex', alignItems: 'center', paddingLeft: 9, fontSize: 10, color: '#5A5A58', fontFamily: 'monospace' }}>{url}</div>
      </div>
      {children}
    </div>
  )
}

// ── Light Browser Frame ───────────────────────────────────────────────
function LightBrowserFrame({ children, url = 'fotonizer.com/dashboard' }: { children: React.ReactNode; url?: string }) {
  return (
    <div style={{
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 24px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)',
      border: '1px solid rgba(0,0,0,0.08)',
    }}>
      <div style={{ background: '#F0EDE8', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#FF5F57' }} />
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#FEBC2E' }} />
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#28C840' }} />
        </div>
        <div style={{ flex: 1, background: '#E8E4DE', borderRadius: 5, height: 20, display: 'flex', alignItems: 'center', paddingLeft: 9, fontSize: 10, color: '#A8A49E', fontFamily: 'monospace' }}>{url}</div>
      </div>
      {children}
    </div>
  )
}

// ── Dark Dashboard ────────────────────────────────────────────────────
function DarkDashboard() {
  return (
    <DarkBrowserFrame url="fotonizer.com/dashboard">
      <div style={{ background: '#141412', display: 'flex', height: 320 }}>
        <div style={{ width: 160, background: '#0F0F0D', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '14px 10px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 20, paddingLeft: 3 }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(196,164,124,0.2)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#F0EDE8' }}>Fotonizer</span>
          </div>
          {['Dashboard', 'Projects', 'Clients', 'Galleries', 'Contracts', 'Analytics'].map((label, i) => (
            <div key={label} style={{ padding: '6px 8px', borderRadius: 7, marginBottom: 2, fontSize: 10, fontWeight: i === 0 ? 600 : 400, background: i === 0 ? 'rgba(196,164,124,0.15)' : 'transparent', color: i === 0 ? '#C4A47C' : '#5A5A58' }}>{label}</div>
          ))}
        </div>
        <div style={{ flex: 1, padding: '16px', overflow: 'hidden' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#F0EDE8', marginBottom: 3 }}>Good morning 👋</div>
          <div style={{ fontSize: 9, color: '#5A5A58', marginBottom: 14 }}>Here&apos;s what&apos;s happening today</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
            {[{ v: '12', l: 'Projects', c: '#3B82F6' }, { v: '3', l: 'Contracts', c: '#F59E0B' }, { v: '8', l: 'Galleries', c: '#10B981' }, { v: '€4.2k', l: 'Revenue', c: '#C4A47C' }].map(({ v, l, c }) => (
              <div key={l} style={{ background: '#1C1C1A', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: c, marginBottom: 1 }}>{v}</div>
                <div style={{ fontSize: 8, color: '#5A5A58' }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#1C1C1A', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 9, fontWeight: 700, color: '#F0EDE8' }}>Recent Projects</div>
            {[{ n: 'Laura & Marc Wedding', d: 'Mar 27', s: 'Active', c: '#10B981' }, { n: 'Portrait — Anna K.', d: 'Apr 3', s: 'Contract', c: '#F59E0B' }, { n: 'Brand Shoot TechCorp', d: 'Apr 10', s: 'Gallery', c: '#3B82F6' }].map(({ n, d, s, c }) => (
              <div key={n} style={{ padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#D0CCC8' }}>{n}</div>
                  <div style={{ fontSize: 8, color: '#5A5A58' }}>{d}</div>
                </div>
                <div style={{ fontSize: 8, fontWeight: 600, color: c, background: `${c}20`, padding: '2px 6px', borderRadius: 999 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DarkBrowserFrame>
  )
}

// ── Light Dashboard ───────────────────────────────────────────────────
function LightDashboard() {
  return (
    <LightBrowserFrame url="fotonizer.com/dashboard">
      <div style={{ background: '#F8F7F4', display: 'flex', height: 320 }}>
        <div style={{ width: 160, background: '#FFFFFF', borderRight: '1px solid rgba(0,0,0,0.06)', padding: '14px 10px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 20, paddingLeft: 3 }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(196,164,124,0.15)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1A1A18' }}>Fotonizer</span>
          </div>
          {['Dashboard', 'Projects', 'Clients', 'Galleries', 'Contracts', 'Analytics'].map((label, i) => (
            <div key={label} style={{ padding: '6px 8px', borderRadius: 7, marginBottom: 2, fontSize: 10, fontWeight: i === 0 ? 600 : 400, background: i === 0 ? 'rgba(196,164,124,0.12)' : 'transparent', color: i === 0 ? '#A8845C' : '#A8A49E' }}>{label}</div>
          ))}
        </div>
        <div style={{ flex: 1, padding: '16px', overflow: 'hidden' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A18', marginBottom: 3 }}>Good morning 👋</div>
          <div style={{ fontSize: 9, color: '#A8A49E', marginBottom: 14 }}>Here&apos;s what&apos;s happening today</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
            {[{ v: '12', l: 'Projects', c: '#3B82F6' }, { v: '3', l: 'Contracts', c: '#F59E0B' }, { v: '8', l: 'Galleries', c: '#10B981' }, { v: '€4.2k', l: 'Revenue', c: '#A8845C' }].map(({ v, l, c }) => (
              <div key={l} style={{ background: '#FFFFFF', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: c, marginBottom: 1 }}>{v}</div>
                <div style={{ fontSize: 8, color: '#A8A49E' }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '7px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: 9, fontWeight: 700, color: '#1A1A18' }}>Recent Projects</div>
            {[{ n: 'Laura & Marc Wedding', d: 'Mar 27', s: 'Active', c: '#10B981' }, { n: 'Portrait — Anna K.', d: 'Apr 3', s: 'Contract', c: '#F59E0B' }, { n: 'Brand Shoot TechCorp', d: 'Apr 10', s: 'Gallery', c: '#3B82F6' }].map(({ n, d, s, c }) => (
              <div key={n} style={{ padding: '6px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#2A2A28' }}>{n}</div>
                  <div style={{ fontSize: 8, color: '#A8A49E' }}>{d}</div>
                </div>
                <div style={{ fontSize: 8, fontWeight: 600, color: c, background: `${c}15`, padding: '2px 6px', borderRadius: 999 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LightBrowserFrame>
  )
}

// ── Analytics Mockup ──────────────────────────────────────────────────
function AnalyticsMockup() {
  return (
    <DarkBrowserFrame url="fotonizer.com/dashboard/analytics">
      <div style={{ background: '#141412', padding: '18px 18px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#F0EDE8', marginBottom: 2 }}>Analytics</div>
        <div style={{ fontSize: 9, color: '#5A5A58', marginBottom: 14 }}>Overview of your studio growth</div>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Total Revenue', value: '€8.4k', sub: '+12% ↑', color: '#10B981', border: '#10B981' },
            { label: 'Pending', value: '€1.2k', sub: '3 invoices', color: '#F59E0B', border: '#F59E0B' },
            { label: 'Clients', value: '24', sub: '+4 this month', color: '#3B82F6', border: '#3B82F6' },
            { label: 'Projects', value: '18', sub: '6 active', color: '#C4A47C', border: '#C4A47C' },
            { label: 'Conversion', value: '68%', sub: 'Leads → Bookings', color: '#A78BFA', border: '#A78BFA' },
            { label: 'Avg per Project', value: '€467', sub: 'Average', color: '#F472B6', border: '#F472B6' },
          ].map(({ label, value, sub, color, border }) => (
            <div key={label} style={{ background: '#1C1C1A', borderRadius: 9, padding: '10px 11px', border: '1px solid rgba(255,255,255,0.06)', borderTop: `2px solid ${border}` }}>
              <div style={{ fontSize: 14, fontWeight: 800, color, marginBottom: 1 }}>{value}</div>
              <div style={{ fontSize: 8, color: '#5A5A58', marginBottom: 2 }}>{label.toUpperCase()}</div>
              <div style={{ fontSize: 8, color: `${color}99` }}>{sub}</div>
            </div>
          ))}
        </div>
        {/* Mini bar chart */}
        <div style={{ background: '#1C1C1A', borderRadius: 9, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#D0CCC8', marginBottom: 10 }}>Revenue — last 6 months</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 40 }}>
            {[55, 70, 45, 85, 65, 100].map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: '100%', height: `${h * 0.36}px`, borderRadius: '3px 3px 0 0', background: i === 5 ? '#C4A47C' : 'rgba(196,164,124,0.3)' }} />
                <div style={{ fontSize: 7, color: '#5A5A58' }}>{['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'][i]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DarkBrowserFrame>
  )
}

// ── Phone Mockup (Kundenportal) ───────────────────────────────────────
function PhonePortalMockup() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      {/* Phone shell */}
      <div style={{
        width: 220,
        background: '#1A1A18',
        borderRadius: 36,
        padding: '10px 6px',
        boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.05)',
        position: 'relative',
      }}>
        {/* Notch */}
        <div style={{ width: 60, height: 18, background: '#1A1A18', borderRadius: 10, margin: '0 auto 6px', position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2A2A28' }} />
          <div style={{ width: 20, height: 5, borderRadius: 3, background: '#2A2A28' }} />
        </div>
        {/* Screen */}
        <div style={{ background: '#0F0F0D', borderRadius: 26, overflow: 'hidden', height: 420, position: 'relative' }}>
          {/* Scrolling content */}
          <div style={{ animation: 'phoneScroll 10s ease-in-out infinite alternate' }}>
            <style>{`
              @keyframes phoneScroll {
                0% { transform: translateY(0); }
                100% { transform: translateY(-220px); }
              }
            `}</style>

            {/* Portal header */}
            <div style={{ background: '#1A1A18', padding: '12px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(196,164,124,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: '#C4A47C' }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#F0EDE8' }}>Anna Fotografie</span>
                </div>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🌙</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 300, color: '#F0EDE8', letterSpacing: '-0.02em' }}>Laura & Marc</div>
              <div style={{ fontSize: 9, color: '#5A5A58', marginTop: 2 }}>Mar 27, 2026 · Vienna</div>
            </div>

            {/* Status chips */}
            <div style={{ padding: '10px 14px', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {[{ l: 'Contract ✓', c: '#10B981' }, { l: 'Gallery ready', c: '#C4A47C' }, { l: 'Invoice open', c: '#F59E0B' }].map(({ l, c }) => (
                <div key={l} style={{ fontSize: 8, fontWeight: 600, color: c, background: `${c}18`, padding: '3px 7px', borderRadius: 999, border: `1px solid ${c}30` }}>{l}</div>
              ))}
            </div>

            {/* Cards */}
            <div style={{ padding: '0 14px 10px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
              {[{ icon: '🖼️', l: 'Gallery', s: '248 Photos', c: '#C4A47C' }, { icon: '✍️', l: 'Contract', s: 'Signed', c: '#10B981' }, { icon: '📅', l: 'Timeline', s: 'View', c: '#3B82F6' }].map(({ icon, l, s, c }) => (
                <div key={l} style={{ background: '#1C1C1A', borderRadius: 9, padding: '10px 8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 14, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#D0CCC8', marginBottom: 1 }}>{l}</div>
                  <div style={{ fontSize: 8, color: c }}>{s}</div>
                </div>
              ))}
            </div>

            {/* Treffpunkt / Map section */}
            <div style={{ padding: '0 14px 10px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#D0CCC8', marginBottom: 8 }}>📍 Meeting Point</div>
              {/* Map placeholder */}
              <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 8 }}>
                {/* Fake map */}
                <div style={{ height: 90, background: 'linear-gradient(135deg, #1E2A1E 0%, #162016 50%, #1A2A1A 100%)', position: 'relative', overflow: 'hidden' }}>
                  {/* Grid lines */}
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${i * 33}%`, height: 1, background: 'rgba(255,255,255,0.04)' }} />
                  ))}
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${i * 25}%`, width: 1, background: 'rgba(255,255,255,0.04)' }} />
                  ))}
                  {/* Roads */}
                  <div style={{ position: 'absolute', top: '45%', left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }} />
                  <div style={{ position: 'absolute', left: '40%', top: 0, bottom: 0, width: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }} />
                  <div style={{ position: 'absolute', top: '20%', left: '15%', right: '30%', height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, transform: 'rotate(-8deg)' }} />
                  {/* Pin */}
                  <div style={{ position: 'absolute', top: '30%', left: '42%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50% 50% 50% 0', background: '#C4A47C', transform: 'rotate(-45deg)', boxShadow: '0 2px 8px rgba(196,164,124,0.5)' }} />
                    <div style={{ width: 2, height: 6, background: '#C4A47C', marginTop: -2 }} />
                  </div>
                  {/* Pulse ring */}
                  <div style={{ position: 'absolute', top: '22%', left: '36%', width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(196,164,124,0.3)', animation: 'pulse 2s ease-out infinite' }} />
                  <style>{`@keyframes pulse { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2); opacity: 0; } }`}</style>
                </div>
              </div>
              <div style={{ background: '#1C1C1A', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: '#D0CCC8', marginBottom: 2 }}>Schoenbrunn Palace</div>
                <div style={{ fontSize: 8, color: '#5A5A58' }}>Schoenbrunn Palace Rd 47, Vienna</div>
                <div style={{ fontSize: 8, color: '#C4A47C', marginTop: 4 }}>Open in Maps →</div>
              </div>
            </div>

            {/* Message */}
            <div style={{ padding: '0 14px 10px' }}>
              <div style={{ background: '#1C1C1A', borderRadius: 9, padding: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#D0CCC8', marginBottom: 5 }}>Message from Anna</div>
                <div style={{ fontSize: 9, color: '#5A5A58', lineHeight: 1.5 }}>Hi Laura & Marc! Your gallery is ready. I hope you love the photos 🤍</div>
              </div>
            </div>

            {/* Moodboard */}
            <div style={{ padding: '0 14px 20px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#D0CCC8', marginBottom: 8 }}>Moodboard</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                {['#2A2520', '#1E1A16', '#342E28', '#281E18'].map((bg, i) => (
                  <div key={i} style={{ aspectRatio: '1', borderRadius: 6, background: bg }} />
                ))}
              </div>
            </div>
          </div>

          {/* Bottom fade */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, background: 'linear-gradient(to bottom, transparent, #0F0F0D)', pointerEvents: 'none' }} />
        </div>
        {/* Home indicator */}
        <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '8px auto 0' }} />
      </div>
    </div>
  )
}

// ── Bookings Mockup (Dark) ────────────────────────────────────────────
function BookingsMockup() {
  return (
    <DarkBrowserFrame url="fotonizer.com/dashboard/bookings">
      <div style={{ background: '#141412', padding: '16px', height: 240 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#F0EDE8', marginBottom: 12 }}>Upcoming Sessions</div>
        {[
          { name: 'Laura & Marc', type: 'Wedding', date: 'Mar 27', time: '10:00', color: '#C4A47C' },
          { name: 'Anna K.', type: 'Portrait', date: 'Apr 3', time: '14:00', color: '#3B82F6' },
          { name: 'TechCorp', type: 'Commercial', date: 'Apr 10', time: '09:00', color: '#10B981' },
          { name: 'Miller Family', type: 'Family', date: 'Apr 15', time: '16:00', color: '#F59E0B' },
        ].map(({ name, type, date, time, color }) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#1C1C1A', borderRadius: 9, marginBottom: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 3, height: 30, borderRadius: 2, background: color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#D0CCC8' }}>{name}</div>
              <div style={{ fontSize: 8, color: '#5A5A58' }}>{type}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#D0CCC8' }}>{date}</div>
              <div style={{ fontSize: 8, color: '#5A5A58' }}>{time}</div>
            </div>
          </div>
        ))}
      </div>
    </DarkBrowserFrame>
  )
}

// ── Contracts Mockup (Light) ──────────────────────────────────────────
function ContractsMockup() {
  return (
    <LightBrowserFrame url="fotonizer.com/dashboard/contracts">
      <div style={{ background: '#F8F7F4', padding: '16px', height: 240 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A18', marginBottom: 12 }}>Photography Contract</div>
        <div style={{ background: '#FFFFFF', borderRadius: 9, padding: '12px', border: '1px solid rgba(0,0,0,0.06)', marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 9, color: '#A8A49E', marginBottom: 5 }}>Client</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#1A1A18', marginBottom: 8 }}>Laura & Marc Hoffmann</div>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 8 }} />
          <div style={{ fontSize: 9, color: '#A8A49E', marginBottom: 4 }}>Contract terms</div>
          {[80, 60, 90, 50].map((w, i) => (
            <div key={i} style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 3, marginBottom: 4, width: `${w}%` }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <div style={{ flex: 1, padding: '7px 10px', background: '#A8845C', borderRadius: 7, fontSize: 10, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }}>
            Sign Contract ✓
          </div>
          <div style={{ padding: '7px 10px', background: 'rgba(0,0,0,0.05)', borderRadius: 7, fontSize: 10, color: '#A8A49E', textAlign: 'center' }}>
            PDF
          </div>
        </div>
      </div>
    </LightBrowserFrame>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function HomePage() {
  const [lang, setLang] = useState<'de' | 'en'>('en')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const t = T[lang]

  return (
    <div style={{ background: 'var(--bg-page)', color: 'var(--text-primary)', minHeight: '100vh' }}>

      {/* ── NAVBAR ── */}
      <nav style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)', position: 'relative', zIndex: 50 }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M4 14V7.5L10 4L16 7.5V14" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7.5 14V10.5H12.5V14" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-[17px]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Fotonizer</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {[{ href: '#features', label: t.nav.features }, { href: '#pricing', label: t.nav.pricing }, { href: '#faq', label: t.nav.faq }].map(({ href, label }) => (
              <a key={href} href={href} className="text-[13.5px] font-medium" style={{ color: 'var(--text-muted)' }}>{label}</a>
            ))}
            <Link href="/blog" className="text-[13.5px] font-medium" style={{ color: 'var(--text-muted)' }}>{t.nav.blog}</Link>
          </div>

          {/* Desktop right actions */}
          <div className="hidden sm:flex items-center gap-3">
            <button onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-bold"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <span style={{ opacity: lang === 'de' ? 1 : 0.4 }}>DE</span>
              <span style={{ color: 'var(--border-color)' }}>|</span>
              <span style={{ opacity: lang === 'en' ? 1 : 0.4 }}>EN</span>
            </button>
            <Link href="/login" className="text-[13.5px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{t.nav.signin}</Link>
            <Link href="/signup" className="btn-shimmer flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13.5px] font-bold text-white" style={{ background: 'var(--accent)' }}>
              {t.nav.cta}<ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile: CTA + hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <Link href="/signup" className="btn-shimmer flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-bold text-white" style={{ background: 'var(--accent)' }}>
              {t.nav.cta}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center justify-center w-9 h-9 rounded-lg"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden" style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
            <div className="px-6 py-4 flex flex-col gap-1">
              {/* Nav links */}
              {[
                { href: '#features', label: t.nav.features },
                { href: '#pricing', label: t.nav.pricing },
                { href: '#faq', label: t.nav.faq },
                { href: '/blog', label: t.nav.blog },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-[15px] font-medium"
                  style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}
                >
                  {label}
                </a>
              ))}

              {/* Auth links */}
              <div className="pt-3 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl text-[14px] font-semibold text-center"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  {t.nav.signin}
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-shimmer w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[14px] font-bold text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  {t.nav.cta}<ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Language toggle */}
              <div className="pt-2 flex justify-center">
                <button onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-bold"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <span style={{ opacity: lang === 'de' ? 1 : 0.4 }}>DE</span>
                  <span style={{ color: 'var(--border-color)' }}>|</span>
                  <span style={{ opacity: lang === 'en' ? 1 : 0.4 }}>EN</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(196,164,124,0.12) 0%, transparent 70%)' }} />
        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-bold mb-8"
            style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid rgba(196,164,124,0.2)' }}>
            <Zap className="w-3 h-3" />{t.badge}
          </div>
          <h1 className="font-black mb-6" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            {t.h1a}<br /><span className="text-gradient-gold">{t.h1b}</span>
          </h1>
          <p className="text-[17px] leading-relaxed max-w-2xl mx-auto mb-10" style={{ color: 'var(--text-secondary)' }}>{t.sub}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Link href="/signup" className="btn-shimmer flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-bold text-white"
              style={{ background: 'var(--accent)', boxShadow: '0 4px 20px rgba(196,164,124,0.35)' }}>
              {t.ctaPrimary}<ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#features" className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-semibold"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
              {t.ctaSecondary}
            </a>
          </div>
          <div className="flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {['#C4A47C', '#8B7355', '#D4B48C', '#A8845C', '#E8C89C'].map((color, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ borderColor: 'var(--bg-page)', background: color }}>
                  {['A', 'T', 'J', 'M', 'S'][i]}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" style={{ color: 'var(--accent)' }} />)}
            </div>
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {t.socialProof} <strong style={{ color: 'var(--text-primary)' }}>{t.socialProof2}</strong>
            </span>
          </div>
        </div>

        {/* Hero: Light + Dark side by side */}
        <div className="relative max-w-6xl mx-auto px-6 pb-24">
          <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(ellipse 70% 60% at 50% 100%, rgba(196,164,124,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div className="grid md:grid-cols-2 gap-6 items-start">
            {/* Dark mode */}
            <div>
              <div className="flex items-center gap-2 mb-3 justify-center">
                <div className="w-2 h-2 rounded-full bg-gray-600" />
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Dark Mode</span>
              </div>
              <DarkDashboard />
            </div>
            {/* Light mode */}
            <div>
              <div className="flex items-center gap-2 mb-3 justify-center">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Light Mode</span>
              </div>
              <LightDashboard />
            </div>
          </div>
          {/* Dark mode label */}
          <div className="text-center mt-8">
            <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{t.darkModeLabel}</p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>{t.darkModeSub}</p>
          </div>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="py-24" style={{ background: 'var(--bg-page-2)' }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="label-caps mb-3">{t.problem.label}</p>
          <h2 className="font-black mb-6" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>{t.problem.h2}</h2>
          <p className="text-[17px] leading-relaxed max-w-2xl mx-auto mb-6" style={{ color: 'var(--text-secondary)' }}>{t.problem.p1}</p>
          <p className="text-[17px] leading-relaxed max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>{t.problem.p2}</p>
        </div>
      </section>

      {/* ── FEATURE SECTIONS ── */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6 space-y-28">

          {/* 1 — Bookings */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="label-caps mb-3">{t.bookings.label}</p>
              <h2 className="font-black mb-5" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', letterSpacing: '-0.03em' }}>{t.bookings.h2}</h2>
              <p className="text-[16px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{t.bookings.p1}</p>
              <p className="text-[16px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.bookings.p2}</p>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(ellipse at center, rgba(196,164,124,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <BookingsMockup />
            </div>
          </div>

          {/* 2 — Contracts */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="md:order-2">
              <p className="label-caps mb-3">{t.contracts.label}</p>
              <h2 className="font-black mb-5" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', letterSpacing: '-0.03em' }}>{t.contracts.h2}</h2>
              <p className="text-[16px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{t.contracts.p1}</p>
              <p className="text-[16px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.contracts.p2}</p>
            </div>
            <div className="md:order-1" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <ContractsMockup />
            </div>
          </div>

          {/* 3 — Analytics */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="label-caps mb-3">{t.analytics.label}</p>
              <h2 className="font-black mb-5" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', letterSpacing: '-0.03em' }}>{t.analytics.h2}</h2>
              <p className="text-[16px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{t.analytics.p1}</p>
              <p className="text-[16px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.analytics.p2}</p>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(ellipse at center, rgba(196,164,124,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <AnalyticsMockup />
            </div>
          </div>

          {/* 4 — Client Portal (phone) */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="md:order-2">
              <p className="label-caps mb-3">{t.portal.label}</p>
              <h2 className="font-black mb-5" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', letterSpacing: '-0.03em' }}>{t.portal.h2}</h2>
              <p className="text-[16px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{t.portal.p1}</p>
              <p className="text-[16px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.portal.p2}</p>
            </div>
            <div className="md:order-1" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(ellipse at center, rgba(196,164,124,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <PhonePortalMockup />
            </div>
          </div>

        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="py-24" style={{ background: 'var(--bg-page-2)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="label-caps mb-3">{t.featuresSection.label}</p>
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>{t.featuresSection.h2}</h2>
            <p className="text-[16px] max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>{t.featuresSection.sub}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {t.features.map(({ icon, title, desc }) => (
              <div key={title} className="glass-card p-6">
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
          <h2 className="font-black mb-10" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', letterSpacing: '-0.03em' }}>
            {'Fotonizer works for every style and genre'}
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {t.genres.map(({ emoji, label }) => (
              <div key={label} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-semibold"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                <span>{emoji}</span>{label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24" style={{ background: 'var(--bg-page-2)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="label-caps mb-3">{t.testimonials.label}</p>
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>{t.testimonials.h2}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {t.reviews.map(({ quote, name, role, stars }) => (
              <div key={name} className="glass-card p-7">
                <div className="flex gap-0.5 mb-5">
                  {[...Array(stars)].map((_, j) => <Star key={j} className="w-4 h-4 fill-current" style={{ color: 'var(--accent)' }} />)}
                </div>
                <p className="text-[14.5px] leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>&ldquo;{quote}&rdquo;</p>
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
            <p className="label-caps mb-3">{t.pricing.label}</p>
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>{t.pricing.h2}</h2>
            <p className="text-[16px]" style={{ color: 'var(--text-secondary)' }}>{t.pricing.sub}</p>
          </div>
          <PricingSection />
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24" style={{ background: 'var(--bg-page-2)' }}>
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="label-caps mb-3">{t.faq.label}</p>
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>{t.faq.h2}</h2>
          </div>
          <FAQAccordion />
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="glass-card p-12 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(196,164,124,0.10) 0%, transparent 70%)' }} />
            <div className="relative">
              <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>{t.finalCta.h2}</h2>
              <p className="text-[16px] mb-8" style={{ color: 'var(--text-secondary)' }}>{t.finalCta.sub}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/signup" className="btn-shimmer flex items-center gap-2 px-8 py-3.5 rounded-xl text-[15px] font-bold text-white"
                  style={{ background: 'var(--accent)', boxShadow: '0 4px 20px rgba(196,164,124,0.35)' }}>
                  {t.finalCta.btn1}<ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#features" className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-[15px] font-semibold"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  {t.finalCta.btn2}
                </a>
              </div>
              <div className="flex items-center justify-center gap-6 mt-8">
                {t.trust.map((text, i) => {
                  const icons = [CheckCircle2, Shield, Globe]
                  const Icon = icons[i]
                  return (
                    <div key={text} className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />{text}
                    </div>
                  )
                })}
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
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t.footer.tagline}</p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {t.footerLinks.map(({ href, label }) => (
                <Link key={href} href={href} className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{label}</Link>
              ))}
            </div>
          </div>
          <div className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderTop: '1px solid var(--border-color)' }}>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>© {new Date().getFullYear()} Fotonizer. {t.footer.copyright}</p>
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{t.footer.social}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
