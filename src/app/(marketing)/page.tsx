'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Star, Zap, Shield, Globe, Menu, X } from 'lucide-react'
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
    workflowSection: {
      label: 'Features',
      h2: 'Alles drin. Nichts überflüssig.',
      sub: 'Von der ersten Anfrage bis zur finalen Galerie — jeder Schritt abgedeckt.',
      features: [
        { key: 'inbox', label: 'Inbox', headline: 'Keine Nachricht geht verloren.', desc: 'Alle Kundengespräche an einem Ort. Kein Suchen in E-Mail-Threads mehr.' },
        { key: 'forms', label: 'Formulare', headline: 'Jede Anfrage automatisch erfassen.', desc: 'Keine verpassten Leads. Jede Anfrage landet direkt in deinem Dashboard.' },
        { key: 'galleries', label: 'Galerien', headline: 'Fotos professionell übergeben.', desc: 'Schicke Online-Galerien mit Download-Kontrolle und Kundenauswahl.' },
        { key: 'contracts', label: 'Verträge', headline: 'In Minuten senden und unterschreiben.', desc: 'Kein PDF-Chaos. Kunden unterschreiben online — du behältst alles im Blick.' },
        { key: 'bookings', label: 'Buchungen', headline: 'Kalender immer aktuell.', desc: 'Alle Shootings und Sessions in einer Übersicht. Immer wissen, was als Nächstes kommt.' },
        { key: 'templates', label: 'E-Mail-Vorlagen', headline: 'Einmal schreiben. Immer senden.', desc: 'Keine doppelten E-Mails mehr. Smarte Platzhalter — persönlich wirkende Nachrichten.' },
      ],
    },
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
    workflowSection: {
      label: 'Features',
      h2: "Everything you need. Nothing you don't.",
      sub: 'From the first inquiry to the final delivery — every step covered.',
      features: [
        { key: 'inbox', label: 'Inbox', headline: 'Never lose a client message.', desc: 'Every conversation in one place. Stop digging through email threads.' },
        { key: 'forms', label: 'Forms', headline: 'Capture every inquiry.', desc: 'Stop losing leads to missed messages. Every request lands in your dashboard.' },
        { key: 'galleries', label: 'Galleries', headline: 'Deliver your work beautifully.', desc: 'Send polished online galleries with download control and client favorites.' },
        { key: 'contracts', label: 'Contracts', headline: 'Send and sign in minutes.', desc: 'No PDFs, no printing. Clients sign online, you keep everything organized.' },
        { key: 'bookings', label: 'Bookings', headline: 'Your calendar, always in sync.', desc: "Every shoot and session in one clear overview. Know exactly what's next." },
        { key: 'templates', label: 'Email Templates', headline: 'Say it once. Send it forever.', desc: 'Stop rewriting the same emails. Smart variables, personal-feeling messages.' },
      ],
    },
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

// ── Sidebar nav items (full feature set) ─────────────────────────────
const SIDEBAR_ITEMS = [
  { label: 'Dashboard', icon: '⬛' },
  { label: 'Inbox',     icon: '📬' },
  { label: 'Bookings',  icon: '📅' },
  { label: 'Projects',  icon: '📁' },
  { label: 'Pipeline',  icon: '🔀' },
  { label: 'Clients',   icon: '👥' },
  { label: 'Forms',     icon: '📋' },
  { label: 'Galleries', icon: '🖼️' },
  { label: 'Contracts', icon: '✍️' },
  { label: 'Invoices',  icon: '💳' },
  { label: 'Templates', icon: '💌' },
  { label: 'Analytics', icon: '📊' },
]

// ── Dark Sidebar ──────────────────────────────────────────────────────
function DarkSidebar({ active }: { active: string }) {
  return (
    <div style={{ width: 148, background: '#0F0F0D', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '12px 8px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, paddingLeft: 4 }}>
        <div style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(196,164,124,0.2)', flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#F0EDE8' }}>Fotonizer</span>
      </div>
      {SIDEBAR_ITEMS.map(({ label }) => (
        <div key={label} style={{
          padding: '4px 7px', borderRadius: 6, marginBottom: 1,
          fontSize: 9, fontWeight: label === active ? 600 : 400,
          background: label === active ? 'rgba(196,164,124,0.15)' : 'transparent',
          color: label === active ? '#C4A47C' : '#4A4A48',
          transition: 'all 0.25s ease',
        }}>{label}</div>
      ))}
    </div>
  )
}

// ── Light Sidebar ─────────────────────────────────────────────────────
function LightSidebar({ active }: { active: string }) {
  return (
    <div style={{ width: 148, background: '#FFFFFF', borderRight: '1px solid rgba(0,0,0,0.06)', padding: '12px 8px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, paddingLeft: 4 }}>
        <div style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(196,164,124,0.15)', flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#1A1A18' }}>Fotonizer</span>
      </div>
      {SIDEBAR_ITEMS.map(({ label }) => (
        <div key={label} style={{
          padding: '4px 7px', borderRadius: 6, marginBottom: 1,
          fontSize: 9, fontWeight: label === active ? 600 : 400,
          background: label === active ? 'rgba(196,164,124,0.12)' : 'transparent',
          color: label === active ? '#A8845C' : '#B8B4AE',
          transition: 'all 0.25s ease',
        }}>{label}</div>
      ))}
    </div>
  )
}

// ── Animated Dark Dashboard ───────────────────────────────────────────
function DarkDashboard() {
  const [screen, setScreen] = useState(0)
  const [fade, setFade] = useState(true)

  // screens: 0=dashboard, 1=projects list, 2=project detail, 3=inbox
  const navByScreen = ['Dashboard', 'Projects', 'Projects', 'Inbox']
  const urlByScreen = ['fotonizer.com/dashboard', 'fotonizer.com/dashboard/projects', 'fotonizer.com/dashboard/projects/laura-marc', 'fotonizer.com/dashboard/inbox']
  const durations   = [3000, 2600, 3400, 2800]

  useEffect(() => {
    const t1 = setTimeout(() => setFade(false), durations[screen] - 350)
    const t2 = setTimeout(() => { setScreen(s => (s + 1) % 4); setFade(true) }, durations[screen])
    return () => { clearTimeout(t1); clearTimeout(t2) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  return (
    <DarkBrowserFrame url={urlByScreen[screen]}>
      <div style={{ background: '#141412', display: 'flex', height: 340 }}>
        <DarkSidebar active={navByScreen[screen]} />
        <div style={{ flex: 1, overflow: 'hidden', opacity: fade ? 1 : 0, transition: 'opacity 0.32s ease' }}>

          {/* ── Screen 0: Dashboard ── */}
          {screen === 0 && (
            <div style={{ padding: '14px', height: '100%' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#F0EDE8', marginBottom: 2 }}>Good morning 👋</div>
              <div style={{ fontSize: 8, color: '#5A5A58', marginBottom: 12 }}>Here&apos;s what&apos;s happening today</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginBottom: 12 }}>
                {[{ v: '12', l: 'Projects', c: '#3B82F6' }, { v: '3', l: 'Invoices', c: '#F59E0B' }, { v: '8', l: 'Galleries', c: '#10B981' }, { v: '€4.2k', l: 'Revenue', c: '#C4A47C' }].map(({ v, l, c }) => (
                  <div key={l} style={{ background: '#1C1C1A', borderRadius: 7, padding: '7px 8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: c, marginBottom: 1 }}>{v}</div>
                    <div style={{ fontSize: 7.5, color: '#5A5A58' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#1C1C1A', borderRadius: 7, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 8, fontWeight: 700, color: '#F0EDE8' }}>Recent Projects</div>
                {[{ n: 'Laura & Marc Wedding', d: 'Mar 27', s: 'Active', c: '#10B981' }, { n: 'Portrait — Anna K.', d: 'Apr 3', s: 'Contract', c: '#F59E0B' }, { n: 'Brand Shoot TechCorp', d: 'Apr 10', s: 'Gallery', c: '#3B82F6' }].map(({ n, d, s, c }) => (
                  <div key={n} style={{ padding: '5px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 8.5, fontWeight: 600, color: '#D0CCC8' }}>{n}</div>
                      <div style={{ fontSize: 7.5, color: '#5A5A58' }}>{d}</div>
                    </div>
                    <div style={{ fontSize: 7.5, fontWeight: 600, color: c, background: `${c}20`, padding: '2px 5px', borderRadius: 999 }}>{s}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#1C1C1A', borderRadius: 7, border: '1px solid rgba(255,255,255,0.06)', padding: '6px 10px' }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: '#F0EDE8', marginBottom: 5 }}>Inbox — 2 unread</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C4A47C' }} />
                  <span style={{ fontSize: 8, color: '#5A5A58' }}>Laura H. — &quot;Love the photos! 🤍&quot;</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Screen 1: Projects list ── */}
          {screen === 1 && (
            <div style={{ padding: '14px', height: '100%' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#F0EDE8', marginBottom: 12 }}>Projects</div>
              <div style={{ background: '#1C1C1A', borderRadius: 7, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 52px 52px', padding: '5px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 7.5, color: '#4A4A48', fontWeight: 600 }}>
                  <span>Name</span><span>Date</span><span>Status</span><span>Stage</span>
                </div>
                {[
                  { n: 'Laura & Marc Wedding', d: 'Mar 27', s: 'Active', st: 'Gallery', c: '#10B981', sc: '#3B82F6' },
                  { n: 'Portrait — Anna K.', d: 'Apr 3', s: 'Pending', st: 'Contract', c: '#F59E0B', sc: '#F59E0B' },
                  { n: 'Brand Shoot TechCorp', d: 'Apr 10', s: 'Active', st: 'Booking', c: '#10B981', sc: '#C4A47C' },
                  { n: 'Miller Family', d: 'Apr 15', s: 'Lead', st: 'Pipeline', c: '#A78BFA', sc: '#A78BFA' },
                ].map(({ n, d, s, st, c, sc }, i) => (
                  <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 52px 52px', padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', background: i === 0 ? 'rgba(196,164,124,0.06)' : 'transparent' }}>
                    <div style={{ fontSize: 8.5, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? '#F0EDE8' : '#D0CCC8' }}>{n}</div>
                    <div style={{ fontSize: 8, color: '#5A5A58' }}>{d}</div>
                    <div style={{ fontSize: 7.5, fontWeight: 600, color: c, background: `${c}18`, padding: '1px 5px', borderRadius: 999, width: 'fit-content' }}>{s}</div>
                    <div style={{ fontSize: 7.5, fontWeight: 600, color: sc, background: `${sc}18`, padding: '1px 5px', borderRadius: 999, width: 'fit-content' }}>{st}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Screen 2: Project detail ── */}
          {screen === 2 && (
            <div style={{ padding: '14px', height: '100%' }}>
              <div style={{ fontSize: 10, color: '#5A5A58', marginBottom: 4 }}>Projects /</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#F0EDE8', marginBottom: 2 }}>Laura &amp; Marc Wedding</div>
              <div style={{ fontSize: 8, color: '#5A5A58', marginBottom: 10 }}>Mar 27, 2026 · Vienna · Wedding</div>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 2, marginBottom: 10 }}>
                {['Overview', 'Gallery', 'Contract', 'Invoice', 'Inbox'].map((tab, i) => (
                  <div key={tab} style={{ padding: '3px 8px', borderRadius: 5, fontSize: 8, fontWeight: i === 0 ? 600 : 400, background: i === 0 ? 'rgba(196,164,124,0.15)' : 'transparent', color: i === 0 ? '#C4A47C' : '#4A4A48', border: i === 0 ? '1px solid rgba(196,164,124,0.2)' : '1px solid transparent' }}>{tab}</div>
                ))}
              </div>
              {/* Status chips */}
              <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                {[{ l: 'Contract ✓', c: '#10B981' }, { l: 'Gallery ready', c: '#C4A47C' }, { l: 'Invoice open', c: '#F59E0B' }].map(({ l, c }) => (
                  <div key={l} style={{ fontSize: 7.5, fontWeight: 600, color: c, background: `${c}18`, padding: '2px 7px', borderRadius: 999, border: `1px solid ${c}30` }}>{l}</div>
                ))}
              </div>
              {/* Detail cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                {[
                  { icon: '🖼️', l: 'Gallery', s: '248 Photos', c: '#C4A47C' },
                  { icon: '✍️', l: 'Contract', s: 'Signed', c: '#10B981' },
                  { icon: '💳', l: 'Invoice', s: '€1,200', c: '#F59E0B' },
                  { icon: '📅', l: 'Booking', s: 'Mar 27', c: '#3B82F6' },
                  { icon: '📬', l: 'Inbox', s: '2 msgs', c: '#A78BFA' },
                  { icon: '📁', l: 'Files', s: '14 files', c: '#5A5A58' },
                ].map(({ icon, l, s, c }) => (
                  <div key={l} style={{ background: '#1C1C1A', borderRadius: 7, padding: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 12, marginBottom: 3 }}>{icon}</div>
                    <div style={{ fontSize: 8.5, fontWeight: 700, color: '#D0CCC8', marginBottom: 1 }}>{l}</div>
                    <div style={{ fontSize: 8, color: c }}>{s}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Screen 3: Inbox ── */}
          {screen === 3 && (
            <div style={{ display: 'flex', height: '100%' }}>
              <div style={{ width: 130, borderRight: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 9, fontWeight: 700, color: '#F0EDE8' }}>Inbox</div>
                {[
                  { n: 'Laura H.', m: 'Love the photos! 🤍', t: '2m', u: true },
                  { n: 'Thomas B.', m: 'Can we reschedule?', t: '1h', u: true },
                  { n: 'TechCorp', m: 'Invoice received', t: '3h', u: false },
                  { n: 'Anna K.', m: 'Thank you!', t: 'Tue', u: false },
                ].map(({ n, m, t, u }) => (
                  <div key={n} style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: u ? 'rgba(196,164,124,0.06)' : 'transparent' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 8.5, fontWeight: u ? 700 : 400, color: u ? '#F0EDE8' : '#5A5A58' }}>{n}</span>
                      <span style={{ fontSize: 7, color: '#3A3A38' }}>{t}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {u && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#C4A47C', flexShrink: 0 }} />}
                      <span style={{ fontSize: 7.5, color: '#4A4A48', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>{m}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 9, fontWeight: 600, color: '#F0EDE8' }}>Laura H.</div>
                <div style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ alignSelf: 'flex-start', background: '#1C1C1A', borderRadius: '2px 7px 7px 7px', padding: '4px 8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: 8, color: '#D0CCC8' }}>These photos are beautiful 🤍</span>
                  </div>
                  <div style={{ alignSelf: 'flex-end', background: 'rgba(196,164,124,0.14)', borderRadius: '7px 2px 7px 7px', padding: '4px 8px', border: '1px solid rgba(196,164,124,0.2)' }}>
                    <span style={{ fontSize: 8, color: '#C4A47C' }}>So happy you love them! 🙏</span>
                  </div>
                  <div style={{ alignSelf: 'flex-start', background: '#1C1C1A', borderRadius: '2px 7px 7px 7px', padding: '4px 8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: 8, color: '#D0CCC8' }}>Love the photos! 🤍</span>
                  </div>
                </div>
                <div style={{ padding: '6px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ background: '#1C1C1A', borderRadius: 5, padding: '4px 8px', border: '1px solid rgba(255,255,255,0.08)', fontSize: 7.5, color: '#3A3A38' }}>Reply...</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </DarkBrowserFrame>
  )
}

// ── Animated Light Dashboard ──────────────────────────────────────────
function LightDashboard() {
  const [screen, setScreen] = useState(0)
  const [fade, setFade] = useState(true)

  // screens: 0=dashboard, 1=gallery, 2=contract, 3=analytics
  const navByScreen = ['Dashboard', 'Galleries', 'Contracts', 'Analytics']
  const urlByScreen = ['fotonizer.com/dashboard', 'fotonizer.com/dashboard/galleries', 'fotonizer.com/dashboard/contracts', 'fotonizer.com/dashboard/analytics']
  const durations   = [3000, 2800, 3200, 3200]

  useEffect(() => {
    const t1 = setTimeout(() => setFade(false), durations[screen] - 350)
    const t2 = setTimeout(() => { setScreen(s => (s + 1) % 4); setFade(true) }, durations[screen])
    return () => { clearTimeout(t1); clearTimeout(t2) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  return (
    <LightBrowserFrame url={urlByScreen[screen]}>
      <div style={{ background: '#F8F7F4', display: 'flex', height: 340 }}>
        <LightSidebar active={navByScreen[screen]} />
        <div style={{ flex: 1, overflow: 'hidden', opacity: fade ? 1 : 0, transition: 'opacity 0.32s ease' }}>

          {/* ── Screen 0: Dashboard ── */}
          {screen === 0 && (
            <div style={{ padding: '14px', height: '100%' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A18', marginBottom: 2 }}>Good morning 👋</div>
              <div style={{ fontSize: 8, color: '#A8A49E', marginBottom: 12 }}>Here&apos;s what&apos;s happening today</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginBottom: 12 }}>
                {[{ v: '12', l: 'Projects', c: '#3B82F6' }, { v: '3', l: 'Invoices', c: '#F59E0B' }, { v: '8', l: 'Galleries', c: '#10B981' }, { v: '€4.2k', l: 'Revenue', c: '#A8845C' }].map(({ v, l, c }) => (
                  <div key={l} style={{ background: '#FFFFFF', borderRadius: 7, padding: '7px 8px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: c, marginBottom: 1 }}>{v}</div>
                    <div style={{ fontSize: 7.5, color: '#A8A49E' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#FFFFFF', borderRadius: 7, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: 8, fontWeight: 700, color: '#1A1A18' }}>Recent Projects</div>
                {[{ n: 'Laura & Marc Wedding', d: 'Mar 27', s: 'Active', c: '#10B981' }, { n: 'Portrait — Anna K.', d: 'Apr 3', s: 'Contract', c: '#F59E0B' }, { n: 'Brand Shoot TechCorp', d: 'Apr 10', s: 'Gallery', c: '#3B82F6' }].map(({ n, d, s, c }) => (
                  <div key={n} style={{ padding: '5px 10px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 8.5, fontWeight: 600, color: '#2A2A28' }}>{n}</div>
                      <div style={{ fontSize: 8, color: '#A8A49E' }}>{d}</div>
                    </div>
                    <div style={{ fontSize: 8, fontWeight: 600, color: c, background: `${c}15`, padding: '2px 6px', borderRadius: 999 }}>{s}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Screen 1: Galleries ── */}
          {screen === 1 && (
            <div style={{ padding: '14px', height: '100%' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A18', marginBottom: 12 }}>Galleries</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 7 }}>
                {[
                  { name: 'Laura & Marc Wedding', count: '248', status: 'Published', c: '#10B981' },
                  { name: 'Portrait — Anna K.', count: '84', status: 'Draft', c: '#F59E0B' },
                  { name: 'Brand Shoot TechCorp', count: '132', status: 'Published', c: '#10B981' },
                  { name: 'Miller Family', count: '67', status: 'Draft', c: '#F59E0B' },
                ].map(({ name, count, status, c }) => (
                  <div key={name} style={{ background: '#FFFFFF', borderRadius: 7, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ height: 52, background: 'linear-gradient(135deg, #2A2118, #1E1A14)', position: 'relative' }}>
                      <div style={{ position: 'absolute', bottom: 5, right: 6, fontSize: 7.5, fontWeight: 600, color: c, background: `${c}20`, padding: '1px 5px', borderRadius: 999 }}>{status}</div>
                    </div>
                    <div style={{ padding: '6px 8px' }}>
                      <div style={{ fontSize: 8.5, fontWeight: 600, color: '#1A1A18', marginBottom: 1 }}>{name}</div>
                      <div style={{ fontSize: 7.5, color: '#A8A49E' }}>{count} photos</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Screen 2: Contracts ── */}
          {screen === 2 && (
            <div style={{ padding: '14px', height: '100%' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A18', marginBottom: 12 }}>Contracts</div>
              <div style={{ background: '#FFFFFF', borderRadius: 7, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 55px 60px', padding: '5px 10px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: 7.5, color: '#A8A49E', fontWeight: 600 }}>
                  <span>Client</span><span>Date</span><span>Status</span>
                </div>
                {[
                  { n: 'Laura & Marc Hoffmann', d: 'Mar 20', s: 'Signed', c: '#10B981' },
                  { n: 'Anna K.', d: 'Mar 28', s: 'Sent', c: '#3B82F6' },
                  { n: 'TechCorp GmbH', d: 'Apr 1', s: 'Draft', c: '#A8A49E' },
                  { n: 'Miller Family', d: 'Apr 8', s: 'Signed', c: '#10B981' },
                ].map(({ n, d, s, c }, i) => (
                  <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr 55px 60px', padding: '6px 10px', borderBottom: '1px solid rgba(0,0,0,0.04)', alignItems: 'center', background: i === 0 ? 'rgba(168,132,92,0.04)' : 'transparent' }}>
                    <div style={{ fontSize: 8.5, fontWeight: i === 0 ? 600 : 400, color: '#1A1A18' }}>{n}</div>
                    <div style={{ fontSize: 8, color: '#A8A49E' }}>{d}</div>
                    <div style={{ fontSize: 7.5, fontWeight: 600, color: c, background: `${c}15`, padding: '1px 6px', borderRadius: 999, width: 'fit-content' }}>{s}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Screen 3: Analytics ── */}
          {screen === 3 && (
            <div style={{ padding: '14px', height: '100%' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A18', marginBottom: 12 }}>Analytics</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
                {[
                  { label: 'Revenue', value: '€8.4k', sub: '+12% ↑', color: '#10B981' },
                  { label: 'Clients', value: '24', sub: '+4 this month', color: '#3B82F6' },
                  { label: 'Conversion', value: '68%', sub: 'Leads → Bookings', color: '#A8845C' },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} style={{ background: '#FFFFFF', borderRadius: 7, padding: '8px 10px', border: '1px solid rgba(0,0,0,0.06)', borderTop: `2px solid ${color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color, marginBottom: 1 }}>{value}</div>
                    <div style={{ fontSize: 7.5, color: '#A8A49E', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 7.5, color: `${color}99` }}>{sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#FFFFFF', borderRadius: 7, padding: '8px 10px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: '#1A1A18', marginBottom: 8 }}>Revenue — last 6 months</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 36 }}>
                  {[55, 70, 45, 85, 65, 100].map((h, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: '100%', height: `${h * 0.32}px`, borderRadius: '3px 3px 0 0', background: i === 5 ? '#A8845C' : 'rgba(168,132,92,0.2)' }} />
                      <div style={{ fontSize: 6.5, color: '#A8A49E' }}>{['O', 'N', 'D', 'J', 'F', 'M'][i]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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

// ── Inbox Mockup (Dark) ───────────────────────────────────────────────
function InboxMockup() {
  return (
    <DarkBrowserFrame url="fotonizer.com/dashboard/inbox">
      <div style={{ background: '#141412', display: 'flex', height: 180 }}>
        <div style={{ width: 145, borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 10, fontWeight: 700, color: '#F0EDE8' }}>Inbox</div>
          {[
            { name: 'Laura H.', preview: 'Love the photos! 🤍', time: '2m', unread: true },
            { name: 'Thomas B.', preview: 'Can we reschedule?', time: '1h', unread: true },
            { name: 'TechCorp', preview: 'Invoice received', time: '3h', unread: false },
            { name: 'Anna K.', preview: 'Thank you so much!', time: 'Tue', unread: false },
          ].map(({ name, preview, time, unread }) => (
            <div key={name} style={{ padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: unread ? 'rgba(196,164,124,0.06)' : 'transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <div style={{ fontSize: 9, fontWeight: unread ? 700 : 400, color: unread ? '#F0EDE8' : '#6A6A68' }}>{name}</div>
                <div style={{ fontSize: 7, color: '#5A5A58' }}>{time}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {unread && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C4A47C', flexShrink: 0 }} />}
                <div style={{ fontSize: 8, color: '#5A5A58', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{preview}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 10, fontWeight: 600, color: '#F0EDE8' }}>Laura H.</div>
          <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
            <div style={{ alignSelf: 'flex-start', background: '#1C1C1A', borderRadius: '0 8px 8px 8px', padding: '5px 8px', maxWidth: '85%', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 8, color: '#D0CCC8', lineHeight: 1.4 }}>These photos are absolutely beautiful 🤍</div>
            </div>
            <div style={{ alignSelf: 'flex-end', background: 'rgba(196,164,124,0.15)', borderRadius: '8px 0 8px 8px', padding: '5px 8px', maxWidth: '85%', border: '1px solid rgba(196,164,124,0.2)' }}>
              <div style={{ fontSize: 8, color: '#C4A47C', lineHeight: 1.4 }}>So happy you love them! 🙏</div>
            </div>
            <div style={{ alignSelf: 'flex-start', background: '#1C1C1A', borderRadius: '0 8px 8px 8px', padding: '5px 8px', maxWidth: '85%', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 8, color: '#D0CCC8', lineHeight: 1.4 }}>Love the photos! 🤍</div>
            </div>
          </div>
          <div style={{ padding: '7px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ background: '#1C1C1A', borderRadius: 6, padding: '5px 9px', border: '1px solid rgba(255,255,255,0.08)', fontSize: 8, color: '#5A5A58' }}>Reply to Laura...</div>
          </div>
        </div>
      </div>
    </DarkBrowserFrame>
  )
}

// ── Forms Mockup (Light) ──────────────────────────────────────────────
function FormulareMockup() {
  return (
    <LightBrowserFrame url="fotonizer.com/f/anna-fotografie">
      <div style={{ background: '#F8F7F4', padding: '14px 14px 10px', height: 180 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 10, padding: '12px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1A1A18', marginBottom: 1 }}>Inquiry — Anna Fotografie</div>
          <div style={{ fontSize: 8, color: '#A8A49E', marginBottom: 10 }}>Tell me about your project.</div>
          {[
            { label: 'Name', value: 'Laura Hoffmann' },
            { label: 'Date', value: 'June 14, 2026' },
            { label: 'Shoot type', value: 'Wedding' },
          ].map(({ label, value }) => (
            <div key={label} style={{ marginBottom: 7 }}>
              <div style={{ fontSize: 7.5, fontWeight: 600, color: '#7A7670', marginBottom: 2 }}>{label}</div>
              <div style={{ background: '#F8F7F4', borderRadius: 5, padding: '4px 7px', border: '1px solid rgba(168,132,92,0.3)', fontSize: 8.5, color: '#1A1A18' }}>{value}</div>
            </div>
          ))}
          <div style={{ marginTop: 10, padding: '6px 0', background: '#A8845C', borderRadius: 6, fontSize: 9, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }}>Send Inquiry →</div>
        </div>
      </div>
    </LightBrowserFrame>
  )
}

// ── Galleries Mockup (Light) ──────────────────────────────────────────
function GalerienMockup() {
  return (
    <LightBrowserFrame url="fotonizer.com/g/laura-marc">
      <div style={{ background: '#F8F7F4', padding: '14px', height: 180, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1A1A18' }}>Laura &amp; Marc</div>
            <div style={{ fontSize: 8, color: '#A8A49E' }}>248 photos · March 27</div>
          </div>
          <div style={{ fontSize: 8, fontWeight: 700, color: '#A8845C', background: 'rgba(168,132,92,0.1)', padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(168,132,92,0.2)' }}>↓ Download</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {[
            { bg: '#2A2118', fav: false },
            { bg: '#3A3028', fav: true },
            { bg: '#1E1A14', fav: false },
            { bg: '#342820', fav: false },
            { bg: '#2C241C', fav: true },
            { bg: '#3E3226', fav: false },
          ].map(({ bg, fav }, i) => (
            <div key={i} style={{ aspectRatio: '4/3', borderRadius: 5, background: bg, position: 'relative', overflow: 'hidden' }}>
              {fav && <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 9 }}>🤍</div>}
            </div>
          ))}
        </div>
      </div>
    </LightBrowserFrame>
  )
}

// ── Email Templates Mockup (Dark) ─────────────────────────────────────
function EmailTemplatesMockup() {
  return (
    <DarkBrowserFrame url="fotonizer.com/dashboard/templates">
      <div style={{ background: '#141412', padding: '14px', height: 180, overflow: 'hidden' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#F0EDE8', marginBottom: 8 }}>Email Templates</div>
        <div style={{ background: '#1C1C1A', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#D0CCC8' }}>Gallery ready — client notification</div>
            <div style={{ fontSize: 7, color: '#C4A47C', background: 'rgba(196,164,124,0.1)', padding: '1px 5px', borderRadius: 3 }}>Active</div>
          </div>
          <div style={{ padding: '8px 10px' }}>
            <div style={{ fontSize: 7.5, color: '#5A5A58', marginBottom: 2 }}>SUBJECT</div>
            <div style={{ fontSize: 8.5, color: '#D0CCC8', marginBottom: 8 }}>
              Your photos are ready,{' '}
              <span style={{ color: '#C4A47C', background: 'rgba(196,164,124,0.12)', padding: '1px 4px', borderRadius: 3 }}>{'{client_name}'}</span> 🤍
            </div>
            <div style={{ fontSize: 7.5, color: '#5A5A58', marginBottom: 2 }}>MESSAGE</div>
            <div style={{ fontSize: 8, color: '#6A6A68', lineHeight: 1.5 }}>
              Hi{' '}
              <span style={{ color: '#C4A47C', background: 'rgba(196,164,124,0.12)', padding: '1px 3px', borderRadius: 3 }}>{'{client_name}'}</span>
              , your gallery from{' '}
              <span style={{ color: '#C4A47C', background: 'rgba(196,164,124,0.12)', padding: '1px 3px', borderRadius: 3 }}>{'{shoot_date}'}</span>
              {' '}is now live 🤍
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <div style={{ flex: 1, padding: '5px', background: '#A8845C', borderRadius: 5, fontSize: 8, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }}>Use template</div>
          <div style={{ padding: '5px 9px', background: 'rgba(255,255,255,0.05)', borderRadius: 5, fontSize: 8, color: '#5A5A58', textAlign: 'center' }}>Preview</div>
        </div>
      </div>
    </DarkBrowserFrame>
  )
}

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

function Background() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #f0ebe3 0%, #e8e0d5 30%, #ddd5c8 60%, #e6dfd8 100%)' }} />
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(196,164,124,0.25) 0%, transparent 70%)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '55%', height: '55%', background: 'radial-gradient(circle, rgba(168,185,210,0.20) 0%, transparent 70%)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', top: '40%', right: '20%', width: '35%', height: '35%', background: 'radial-gradient(circle, rgba(196,164,124,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '180px' }} />
    </div>
  )
}

function GlassSection({ children, style = {}, id }: { children: React.ReactNode; style?: React.CSSProperties; id?: string }) {
  return (
    <div id={id} style={{
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

// ── Main Page ─────────────────────────────────────────────────────────
export default function HomePage() {
  const [lang, setLang] = useState<'de' | 'en'>('en')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const t = T[lang]

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
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(168,132,92,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(168,132,92,0.2)' }}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                <path d="M4 14V7.5L10 4L16 7.5V14" stroke="#A8845C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7.5 14V10.5H12.5V14" stroke="#A8845C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#1A1510', letterSpacing: '-0.03em' }}>Fotonizer</span>
          </Link>

          {/* Desktop nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {[{ href: '#features', label: t.nav.features }, { href: '#pricing', label: t.nav.pricing }, { href: '#faq', label: t.nav.faq }].map(({ href, label }) => (
              <a key={href} href={href} style={{ fontSize: 14, fontWeight: 500, color: 'rgba(0,0,0,0.48)', textDecoration: 'none' }}>{label}</a>
            ))}
            <Link href="/blog" style={{ fontSize: 14, fontWeight: 500, color: 'rgba(0,0,0,0.48)', textDecoration: 'none' }}>{t.nav.blog}</Link>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.8)', color: 'rgba(0,0,0,0.45)', cursor: 'pointer' }}>
              <span style={{ opacity: lang === 'de' ? 1 : 0.4 }}>DE</span>
              <span style={{ color: 'rgba(0,0,0,0.2)' }}>|</span>
              <span style={{ opacity: lang === 'en' ? 1 : 0.4 }}>EN</span>
            </button>
            <Link href="/login" style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(0,0,0,0.48)', textDecoration: 'none' }}>{t.nav.signin}</Link>
            <Link href="/signup" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 12, background: '#A8845C', fontSize: 13.5, fontWeight: 700, color: '#FFF', textDecoration: 'none', boxShadow: '0 4px 16px rgba(168,132,92,0.35)' }}>
              {t.nav.cta} <ArrowRight size={14} />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.9)', color: '#1A1510', cursor: 'pointer' }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.7)', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[{ href: '#features', label: t.nav.features }, { href: '#pricing', label: t.nav.pricing }, { href: '#faq', label: t.nav.faq }, { href: '/blog', label: t.nav.blog }].map(({ href, label }) => (
              <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} style={{ padding: '10px 0', fontSize: 15, fontWeight: 500, color: '#1A1510', borderBottom: '1px solid rgba(0,0,0,0.06)', textDecoration: 'none' }}>{label}</a>
            ))}
            <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} style={{ width: '100%', padding: '10px', borderRadius: 12, textAlign: 'center', fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.9)', color: '#1A1510', textDecoration: 'none' }}>{t.nav.signin}</Link>
              <Link href="/signup" onClick={() => setMobileMenuOpen(false)} style={{ width: '100%', padding: '10px', borderRadius: 12, textAlign: 'center', fontSize: 14, fontWeight: 700, background: '#A8845C', color: '#FFF', textDecoration: 'none' }}>{t.nav.cta}</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── transparent */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '110px 48px 90px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 100, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', marginBottom: 44, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <Zap size={13} color="#A8845C" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#8A6A3C' }}>{t.badge}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)', fontWeight: 900, color: '#1A1510', letterSpacing: '-0.045em', lineHeight: 1.05, marginBottom: 28 }}>
          {t.h1a}<br />
          <span style={{ background: 'linear-gradient(135deg, #A8845C 0%, #C4A47C 50%, #8A6A3C 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t.h1b}
          </span>
        </h1>
        <p style={{ fontSize: 19, color: 'rgba(0,0,0,0.52)', lineHeight: 1.65, maxWidth: 580, margin: '0 auto 48px' }}>{t.sub}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 64 }}>
          <Link href="/signup" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 14, background: '#A8845C', fontSize: 15, fontWeight: 700, color: '#FFF', textDecoration: 'none', boxShadow: '0 8px 28px rgba(168,132,92,0.40)' }}>
            {t.ctaPrimary} <ArrowRight size={16} />
          </Link>
          <a href="#features" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 14, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', fontSize: 15, fontWeight: 600, color: 'rgba(0,0,0,0.58)', textDecoration: 'none' }}>
            {t.ctaSecondary}
          </a>
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
          <span style={{ fontSize: 13.5, color: 'rgba(0,0,0,0.45)' }}>{t.socialProof} <strong style={{ color: '#1A1510' }}>{t.socialProof2}</strong></span>
        </div>

        {/* Dashboards side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6B6B6B' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.4)' }}>Dark Mode</span>
            </div>
            <DarkDashboard />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#A8845C' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.4)' }}>Light Mode</span>
            </div>
            <LightDashboard />
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1510' }}>{t.darkModeLabel}</p>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', marginTop: 4 }}>{t.darkModeSub}</p>
        </div>
      </section>

      {/* ── PROBLEM ── glass panel */}
      <GlassSection style={{ padding: '80px 48px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#A8845C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 }}>{t.problem.label}</p>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#1A1510', letterSpacing: '-0.035em', lineHeight: 1.1, marginBottom: 22 }}>{t.problem.h2}</h2>
          <p style={{ fontSize: 17, color: 'rgba(0,0,0,0.5)', lineHeight: 1.65, marginBottom: 14 }}>{t.problem.p1}</p>
          <p style={{ fontSize: 17, color: 'rgba(0,0,0,0.5)', lineHeight: 1.65 }}>{t.problem.p2}</p>
        </div>
      </GlassSection>

      {/* ── FEATURE SECTIONS ── transparent */}
      <section id="features" style={{ padding: '96px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 112 }}>

          {/* 1 — Bookings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#A8845C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>{t.bookings.label}</p>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#1A1510', letterSpacing: '-0.03em', marginBottom: 20 }}>{t.bookings.h2}</h2>
              <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.5)', lineHeight: 1.7, marginBottom: 14 }}>{t.bookings.p1}</p>
              <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.5)', lineHeight: 1.7 }}>{t.bookings.p2}</p>
            </div>
            <BookingsMockup />
          </div>

          {/* 2 — Contracts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <ContractsMockup />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#A8845C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>{t.contracts.label}</p>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#1A1510', letterSpacing: '-0.03em', marginBottom: 20 }}>{t.contracts.h2}</h2>
              <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.5)', lineHeight: 1.7, marginBottom: 14 }}>{t.contracts.p1}</p>
              <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.5)', lineHeight: 1.7 }}>{t.contracts.p2}</p>
            </div>
          </div>

          {/* 3 — Analytics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#A8845C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>{t.analytics.label}</p>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#1A1510', letterSpacing: '-0.03em', marginBottom: 20 }}>{t.analytics.h2}</h2>
              <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.5)', lineHeight: 1.7, marginBottom: 14 }}>{t.analytics.p1}</p>
              <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.5)', lineHeight: 1.7 }}>{t.analytics.p2}</p>
            </div>
            <AnalyticsMockup />
          </div>

          {/* 4 — Client Portal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <PhonePortalMockup />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#A8845C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>{t.portal.label}</p>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#1A1510', letterSpacing: '-0.03em', marginBottom: 20 }}>{t.portal.h2}</h2>
              <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.5)', lineHeight: 1.7, marginBottom: 14 }}>{t.portal.p1}</p>
              <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.5)', lineHeight: 1.7 }}>{t.portal.p2}</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── WORKFLOW SECTION ── glass panel */}
      <GlassSection style={{ padding: '96px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#A8845C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>{t.workflowSection.label}</p>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#1A1510', letterSpacing: '-0.035em', marginBottom: 14 }}>{t.workflowSection.h2}</h2>
            <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.48)', maxWidth: 500, margin: '0 auto' }}>{t.workflowSection.sub}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              { key: 'inbox', mockupEl: <InboxMockup /> },
              { key: 'forms', mockupEl: <FormulareMockup /> },
              { key: 'galleries', mockupEl: <GalerienMockup /> },
              { key: 'contracts', mockupEl: <ContractsMockup /> },
              { key: 'bookings', mockupEl: <BookingsMockup /> },
              { key: 'templates', mockupEl: <EmailTemplatesMockup /> },
            ].map(({ key, mockupEl }) => {
              const f = t.workflowSection.features.find(feat => feat.key === key)!
              return (
                <GlassCard key={key} level="light" style={{ overflow: 'hidden' }}>
                  <div style={{ height: 220, overflow: 'hidden', pointerEvents: 'none' }}>
                    {mockupEl}
                  </div>
                  <div style={{ padding: '24px 28px 28px' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#A8845C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>{f.label}</p>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1A1510', letterSpacing: '-0.02em', marginBottom: 8 }}>{f.headline}</h3>
                    <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', lineHeight: 1.65 }}>{f.desc}</p>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        </div>
      </GlassSection>

      {/* ── FEATURES GRID ── transparent */}
      <section style={{ padding: '96px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#A8845C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>{t.featuresSection.label}</p>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#1A1510', letterSpacing: '-0.035em', lineHeight: 1.1, marginBottom: 14 }}>{t.featuresSection.h2}</h2>
            <p style={{ fontSize: 17, color: 'rgba(0,0,0,0.48)', maxWidth: 500, margin: '0 auto' }}>{t.featuresSection.sub}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {t.features.map(({ icon, title, desc }) => (
              <GlassCard key={title} level="light" style={{ padding: 28 }}>
                <span style={{ fontSize: 28, display: 'block', marginBottom: 16 }}>{icon}</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1510', marginBottom: 8, letterSpacing: '-0.02em' }}>{title}</h3>
                <p style={{ fontSize: 13.5, color: 'rgba(0,0,0,0.5)', lineHeight: 1.65 }}>{desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── PHOTO TYPES ── glass panel */}
      <GlassSection style={{ padding: '64px 48px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#1A1510', letterSpacing: '-0.03em', marginBottom: 40 }}>
            Fotonizer works for every style and genre
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
            {t.genres.map(({ emoji, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 100, fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', color: '#1A1510', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <span>{emoji}</span>{label}
              </div>
            ))}
          </div>
        </div>
      </GlassSection>

      {/* ── TESTIMONIALS ── transparent, cards float */}
      <section style={{ padding: '96px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#A8845C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>{t.testimonials.label}</p>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#1A1510', letterSpacing: '-0.035em' }}>{t.testimonials.h2}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {t.reviews.map(({ quote, name, role, stars }) => (
              <GlassCard key={name} level="light" style={{ padding: 32 }}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 20 }}>
                  {[...Array(stars)].map((_, i) => <Star key={i} size={15} fill="#A8845C" color="#A8845C" />)}
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
      </section>

      {/* ── PRICING ── glass panel */}
      <GlassSection id="pricing" style={{ padding: '96px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#A8845C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>{t.pricing.label}</p>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#1A1510', letterSpacing: '-0.035em', marginBottom: 12 }}>{t.pricing.h2}</h2>
            <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.45)' }}>{t.pricing.sub}</p>
          </div>
          <PricingSection />
        </div>
      </GlassSection>

      {/* ── FAQ ── transparent */}
      <section style={{ padding: '96px 48px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#A8845C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>{t.faq.label}</p>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#1A1510', letterSpacing: '-0.035em' }}>{t.faq.h2}</h2>
          </div>
          <FAQAccordion />
        </div>
      </section>

      {/* ── CTA FINAL ── glass panel */}
      <GlassSection style={{ padding: '96px 48px 110px' }}>
        <div style={{ maxWidth: 740, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 900, color: '#1A1510', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 20 }}>{t.finalCta.h2}</h2>
          <p style={{ fontSize: 17, color: 'rgba(0,0,0,0.45)', marginBottom: 40 }}>{t.finalCta.sub}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 36 }}>
            <Link href="/signup" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 36px', borderRadius: 14, background: '#A8845C', fontSize: 15, fontWeight: 700, color: '#FFF', textDecoration: 'none', boxShadow: '0 8px 28px rgba(168,132,92,0.40)' }}>
              {t.finalCta.btn1} <ArrowRight size={16} />
            </Link>
            <a href="#features" style={{ padding: '14px 28px', borderRadius: 14, background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', fontSize: 15, fontWeight: 600, color: 'rgba(0,0,0,0.55)', textDecoration: 'none' }}>
              {t.finalCta.btn2}
            </a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
            {t.trust.map((text, i) => {
              const icons = [CheckCircle2, Shield, Globe]
              const Icon = icons[i]
              return (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'rgba(0,0,0,0.4)' }}>
                  <Icon size={14} color="#A8845C" />{text}
                </div>
              )
            })}
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
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)' }}>{t.footer.tagline}</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            {t.footerLinks.map(({ href, label }) => (
              <Link key={href} href={href} style={{ fontSize: 13, color: 'rgba(0,0,0,0.38)', textDecoration: 'none' }}>{label}</Link>
            ))}
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: '24px auto 0', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.55)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.3)' }}>© {new Date().getFullYear()} Fotonizer. {t.footer.copyright}</span>
          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.3)' }}>{t.footer.social}</span>
        </div>
      </footer>

      </div>{/* end position:relative zIndex:1 */}
    </div>
  )
}
