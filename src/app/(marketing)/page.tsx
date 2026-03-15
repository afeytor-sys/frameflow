'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Star, Zap, Shield, Globe, Camera, Users } from 'lucide-react'
import PricingSection from '@/components/marketing/PricingSection'
import FAQAccordion from '@/components/marketing/FAQAccordion'

// ── Translations ────────────────────────────────────────────────────
const T = {
  de: {
    nav: { features: 'Features', pricing: 'Preise', faq: 'FAQ', signin: 'Anmelden', cta: 'Kostenlos starten' },
    badge: 'Built by photographers, for photographers.',
    h1a: 'Dein Fotostudio.',
    h1b: 'Alles an einem Ort.',
    sub: 'Buchungen, Verträge, Kundenkommunikation und Galerien — in einer einfachen Plattform für moderne Fotostudios.',
    ctaPrimary: 'Kostenlos starten',
    ctaSecondary: 'Demo ansehen',
    socialProof: 'Vertraut von',
    socialProof2: '200+ Fotografen in Europa',
    problem: { label: 'Das Problem', h2: 'Schluss mit fünf verschiedenen Tools.', p1: 'Die meisten Fotobetriebe nutzen eine Mischung aus Kalendern, Verträgen, E-Mail-Threads und Galerie-Plattformen.', p2: 'Fotonizer bringt alles in einem sauberen System zusammen — speziell für Fotografen entwickelt.' },
    bookings: { label: 'Buchungen', h2: 'Behalte jeden Shoot im Blick.', p1: 'Buchungen, Sessions und Kunden in einer klaren Übersicht verwalten.', p2: 'Weißt immer, was als Nächstes kommt — ohne Tabellen oder verstreute Tools.' },
    contracts: { label: 'Verträge', h2: 'Verträge ohne Aufwand.', p1: 'Verträge in Sekunden erstellen, versenden und verwalten.', p2: 'Kunden können online unterschreiben — du behältst alles an einem Ort.' },
    galleries: { label: 'Galerien', h2: 'Galerien, die deine Kunden lieben werden.', p: 'Liefere Bilder über elegante Online-Galerien — mit Download-Kontrolle und Favoriten-Funktion.' },
    portal: { label: 'Kundenportal', h2: 'Jedem Kunden sein eigenes Portal.', p1: 'Jeder Kunde bekommt einen privaten Bereich für sein Projekt — Verträge, Moodboards und Galerie.', p2: 'Das schafft ein Premium-Erlebnis, das Fotografen und Kunden gleichermaßen lieben.' },
    featuresSection: { label: 'Alles inklusive', h2: 'Gebaut für echte Foto-Workflows.', sub: 'Vom ersten Booking bis zur finalen Galerie-Lieferung — Fotonizer unterstützt jeden Schritt. Keine generischen Business-Tools. Nur was Fotografen wirklich brauchen.' },
    features: [
      { icon: '📅', title: 'Buchungen & Sessions', desc: 'Jeden Shoot, jede Session und jeden Kunden in einer klaren Übersicht verfolgen.' },
      { icon: '✍️', title: 'Digitale Verträge', desc: 'Verträge in Sekunden erstellen und versenden. Kunden unterschreiben online — kein Drucken, kein Scannen.' },
      { icon: '🖼️', title: 'Elegante Galerien', desc: 'Bilder über schöne Online-Galerien liefern — mit Download-Kontrolle und Kunden-Favoriten.' },
      { icon: '🔗', title: 'Kundenportal', desc: 'Jeder Kunde bekommt einen privaten Bereich für sein Projekt, Verträge, Moodboards und Galerie.' },
      { icon: '🌍', title: 'Deutsch & Englisch', desc: 'Vollständig zweisprachig — für dich und deine internationalen Kunden. Jederzeit wechselbar.' },
      { icon: '💳', title: 'Rechnungen & Zahlungen', desc: 'Professionelle Rechnungen direkt aus der Plattform erstellen und versenden.' },
    ],
    photoTypes: { label: 'Für jeden Fotografen', h2: 'Fotonizer funktioniert für jeden Stil und jedes Genre' },
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
      { quote: 'Ich spare mindestens 3 Stunden pro Woche, die ich früher mit E-Mails und PDFs verbracht habe.', name: 'Thomas B.', role: 'Portrait-Fotograf · Berlin', stars: 5 },
      { quote: 'Endlich ein Tool, das wirklich für Fotografen gebaut wurde. Alles macht einfach Sinn.', name: 'Julia S.', role: 'Commercial-Fotografin · Zürich', stars: 5 },
    ],
    pricing: { label: 'Preise', h2: 'Transparent. Fair. Jederzeit kündbar.', sub: 'Kostenlos starten — upgrade wenn du bereit bist.' },
    faq: { label: 'FAQ', h2: 'Häufige Fragen' },
    finalCta: { h2: 'Führe dein Fotobusiness wie ein Profi.', sub: 'Schließe dich Fotografen an, die ihren Workflow mit Fotonizer vereinfachen.', btn1: 'Kostenlos starten', btn2: 'Demo buchen' },
    trust: ['Kostenlos starten', 'DSGVO-konform', 'EU-Server'],
    footer: { tagline: 'Studio-Management für professionelle Fotografen.', copyright: 'Alle Rechte vorbehalten.', social: '200+ Fotografen vertrauen Fotonizer' },
    footerLinks: [
      { href: '#features', label: 'Features' },
      { href: '#pricing', label: 'Preise' },
      { href: '/login', label: 'Anmelden' },
      { href: '/signup', label: 'Registrieren' },
      { href: '/impressum', label: 'Impressum' },
      { href: '/datenschutz', label: 'Datenschutz' },
      { href: '/agb', label: 'AGB' },
    ],
  },
  en: {
    nav: { features: 'Features', pricing: 'Pricing', faq: 'FAQ', signin: 'Sign in', cta: 'Start free' },
    badge: 'Built by photographers, for photographers.',
    h1a: 'Run your photography',
    h1b: 'studio in one place.',
    sub: 'Manage bookings, contracts, client communication and galleries in one simple platform designed for modern photography studios.',
    ctaPrimary: 'Start free',
    ctaSecondary: 'View demo',
    socialProof: 'Trusted by',
    socialProof2: '200+ photographers across Europe',
    problem: { label: 'The problem', h2: 'Stop juggling five different tools.', p1: 'Most photography businesses use a mix of calendars, contracts, email threads and gallery platforms.', p2: 'Fotonizer brings everything together in one clean system designed specifically for photographers.' },
    bookings: { label: 'Bookings', h2: 'Stay on top of every shoot.', p1: 'Track bookings, sessions and clients in one clear overview.', p2: "Know exactly what's coming next and keep your schedule organized without spreadsheets or scattered tools." },
    contracts: { label: 'Contracts', h2: 'Contracts without the hassle.', p1: 'Create, send and manage contracts in seconds.', p2: 'Clients can review and sign online while you keep everything organized in one place.' },
    galleries: { label: 'Galleries', h2: 'Beautiful galleries your clients will love.', p: 'Deliver images through elegant online galleries where clients can view, download and select their favorites easily.' },
    portal: { label: 'Client Portal', h2: 'Give every client their own portal.', p1: 'Each client gets a private space where they can follow their project, access contracts, share moodboards and view their gallery.', p2: 'This creates a premium experience that photographers and clients both love.' },
    featuresSection: { label: 'Everything included', h2: 'Built for real photography workflows.', sub: 'From the first booking to the final gallery delivery, Fotonizer supports every step of your process. No generic business tools. Just what photographers actually need.' },
    features: [
      { icon: '📅', title: 'Bookings & Sessions', desc: "Track every shoot, session and client in one clear overview. Know exactly what's coming next." },
      { icon: '✍️', title: 'Digital Contracts', desc: 'Create, send and manage contracts in seconds. Clients sign online — no printing, no scanning.' },
      { icon: '🖼️', title: 'Elegant Galleries', desc: 'Deliver images through beautiful online galleries with download control and client favorites.' },
      { icon: '🔗', title: 'Client Portal', desc: 'Each client gets a private space for their project, contracts, moodboards and gallery.' },
      { icon: '🌍', title: 'German & English', desc: 'Fully bilingual — for you and your international clients. Switch anytime.' },
      { icon: '💳', title: 'Invoices & Payments', desc: 'Create and send professional invoices directly from the platform. Simple and trackable.' },
    ],
    photoTypes: { label: 'For every photographer', h2: 'Fotonizer works for every style and genre' },
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
      { href: '/login', label: 'Sign in' },
      { href: '/signup', label: 'Sign up' },
      { href: '/impressum', label: 'Impressum' },
      { href: '/datenschutz', label: 'Privacy' },
      { href: '/agb', label: 'Terms' },
    ],
  },
}

// ── Dark Browser Frame ───────────────────────────────────────────────
function BrowserFrame({ children, url = 'fotonizer.com/dashboard', className = '' }: { children: React.ReactNode; url?: string; className?: string }) {
  return (
    <div className={`relative ${className}`} style={{
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.35)',
      border: '1px solid rgba(255,255,255,0.08)',
      transform: 'perspective(1200px) rotateX(2deg)',
      transformOrigin: 'top center',
    }}>
      {/* Dark browser chrome */}
      <div style={{
        background: '#1C1C1A',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
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
          background: '#2A2A28',
          borderRadius: 6,
          height: 22,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 10,
          fontSize: 11,
          color: '#5A5A58',
          fontFamily: 'monospace',
        }}>
          {url}
        </div>
      </div>
      {children}
    </div>
  )
}

// ── Dark Dashboard Mockup ────────────────────────────────────────────
function DashboardMockup() {
  return (
    <BrowserFrame url="fotonizer.com/dashboard">
      <div style={{ background: '#141412', display: 'flex', height: 380 }}>
        {/* Sidebar */}
        <div style={{ width: 200, background: '#0F0F0D', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '16px 12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, paddingLeft: 4 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(196,164,124,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#C4A47C' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#F0EDE8' }}>Fotonizer</span>
          </div>
          {[
            { label: 'Dashboard', active: true },
            { label: 'Projekte', active: false },
            { label: 'Kunden', active: false },
            { label: 'Galerien', active: false },
            { label: 'Verträge', active: false },
            { label: 'Rechnungen', active: false },
          ].map(({ label, active }) => (
            <div key={label} style={{
              padding: '7px 10px',
              borderRadius: 8,
              marginBottom: 2,
              fontSize: 12,
              fontWeight: active ? 600 : 400,
              background: active ? 'rgba(196,164,124,0.15)' : 'transparent',
              color: active ? '#C4A47C' : '#5A5A58',
            }}>
              {label}
            </div>
          ))}
        </div>
        {/* Main content */}
        <div style={{ flex: 1, padding: '20px', overflow: 'hidden' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#F0EDE8', marginBottom: 4 }}>Guten Morgen 👋</div>
          <div style={{ fontSize: 11, color: '#5A5A58', marginBottom: 18 }}>Hier ist, was heute passiert</div>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 18 }}>
            {[
              { label: 'Aktive Projekte', value: '12', color: '#3B82F6' },
              { label: 'Offene Verträge', value: '3', color: '#F59E0B' },
              { label: 'Galerien', value: '8', color: '#10B981' },
              { label: 'Umsatz', value: '€4.2k', color: '#C4A47C' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#1C1C1A', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 17, fontWeight: 800, color, marginBottom: 2 }}>{value}</div>
                <div style={{ fontSize: 9, color: '#5A5A58' }}>{label}</div>
              </div>
            ))}
          </div>
          {/* Recent projects */}
          <div style={{ background: '#1C1C1A', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, fontWeight: 700, color: '#F0EDE8' }}>Aktuelle Projekte</div>
            {[
              { name: 'Laura & Marc Hochzeit', date: '27. Mär', status: 'Aktiv', color: '#10B981' },
              { name: 'Portrait — Anna K.', date: '3. Apr', status: 'Vertrag gesendet', color: '#F59E0B' },
              { name: 'Brand Shoot — TechCorp', date: '10. Apr', status: 'Galerie bereit', color: '#3B82F6' },
            ].map(({ name, date, status, color }) => (
              <div key={name} style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#D0CCC8' }}>{name}</div>
                  <div style={{ fontSize: 9, color: '#5A5A58' }}>{date}</div>
                </div>
                <div style={{ fontSize: 9, fontWeight: 600, color, background: `${color}20`, padding: '2px 8px', borderRadius: 999 }}>{status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

// ── Dark Bookings Mockup ─────────────────────────────────────────────
function BookingsMockup() {
  return (
    <BrowserFrame url="fotonizer.com/dashboard/bookings">
      <div style={{ background: '#141412', padding: 20, height: 260 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#F0EDE8', marginBottom: 14 }}>Kommende Sessions</div>
        {[
          { name: 'Laura & Marc', type: 'Hochzeit', date: '27. Mär', time: '10:00', color: '#C4A47C' },
          { name: 'Anna K.', type: 'Portrait', date: '3. Apr', time: '14:00', color: '#3B82F6' },
          { name: 'TechCorp', type: 'Commercial', date: '10. Apr', time: '09:00', color: '#10B981' },
          { name: 'Familie Müller', type: 'Familie', date: '15. Apr', time: '16:00', color: '#F59E0B' },
        ].map(({ name, type, date, time, color }) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', background: '#1C1C1A', borderRadius: 10, marginBottom: 7, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 4, height: 34, borderRadius: 2, background: color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#D0CCC8' }}>{name}</div>
              <div style={{ fontSize: 9, color: '#5A5A58' }}>{type}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#D0CCC8' }}>{date}</div>
              <div style={{ fontSize: 9, color: '#5A5A58' }}>{time}</div>
            </div>
          </div>
        ))}
      </div>
    </BrowserFrame>
  )
}

// ── Dark Contracts Mockup ────────────────────────────────────────────
function ContractsMockup() {
  return (
    <BrowserFrame url="fotonizer.com/dashboard/contracts">
      <div style={{ background: '#141412', padding: 20, height: 260 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#F0EDE8', marginBottom: 14 }}>Fotografievertrag</div>
        <div style={{ background: '#1C1C1A', borderRadius: 10, padding: 14, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: '#5A5A58', marginBottom: 6 }}>Kunde</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#D0CCC8', marginBottom: 10 }}>Laura & Marc Hoffmann</div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 10 }} />
          <div style={{ fontSize: 10, color: '#5A5A58', marginBottom: 5 }}>Vertragsbedingungen</div>
          {[80, 60, 90, 50].map((w, i) => (
            <div key={i} style={{ height: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 5, width: `${w}%` }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, padding: '8px 12px', background: '#C4A47C', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#111110', textAlign: 'center' }}>
            Vertrag unterschreiben ✓
          </div>
          <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 11, color: '#5A5A58', textAlign: 'center' }}>
            Download
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

// ── Dark Gallery Mockup ──────────────────────────────────────────────
function GalleryMockup() {
  return (
    <BrowserFrame url="fotonizer.com/client/elisa/gallery">
      <div style={{ background: '#0A0A08', height: 300 }}>
        <div style={{ position: 'relative', height: 140, background: 'linear-gradient(135deg, #1A1510 0%, #0A0A08 100%)', display: 'flex', alignItems: 'flex-end', padding: '0 20px 16px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.8) 100%)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Anna Hochzeitsfotografie</div>
            <div style={{ fontSize: 20, fontWeight: 300, color: '#FFFFFF', letterSpacing: '-0.02em' }}>Laura & Marc</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>27. März 2026 · Wien</div>
          </div>
        </div>
        <div style={{ padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3 }}>
          {['#2A2520', '#1E1A16', '#342E28', '#281E18', '#302820',
            '#1A1510', '#2E2820', '#221C16', '#342E28', '#281E18'].map((bg, i) => (
            <div key={i} style={{ aspectRatio: '1', borderRadius: 4, background: bg }} />
          ))}
        </div>
      </div>
    </BrowserFrame>
  )
}

// ── Dark Client Portal Mockup with scroll animation ──────────────────
function ClientPortalMockup() {
  return (
    <BrowserFrame url="fotonizer.com/client/elisa">
      <div style={{ background: '#0F0F0D', height: 340, overflow: 'hidden', position: 'relative' }}>
        {/* Scrolling content */}
        <div style={{
          animation: 'portalScroll 8s ease-in-out infinite alternate',
        }}>
          <style>{`
            @keyframes portalScroll {
              0% { transform: translateY(0); }
              100% { transform: translateY(-160px); }
            }
          `}</style>

          {/* Header */}
          <div style={{ background: '#1A1A18', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(196,164,124,0.2)' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#F0EDE8' }}>Anna Hochzeitsfotografie</span>
            </div>
            <div style={{ fontSize: 10, color: '#5A5A58' }}>Laura & Marc</div>
          </div>

          {/* Hero area */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: 22, fontWeight: 300, color: '#F0EDE8', marginBottom: 4, letterSpacing: '-0.02em' }}>Laura & Marc</div>
            <div style={{ fontSize: 11, color: '#5A5A58', marginBottom: 16 }}>27. März 2026 · Wien</div>
            {/* Status bar */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {[
                { label: 'Vertrag ✓', color: '#10B981' },
                { label: 'Galerie bereit', color: '#C4A47C' },
                { label: 'Rechnung offen', color: '#F59E0B' },
              ].map(({ label, color }) => (
                <div key={label} style={{ fontSize: 9, fontWeight: 600, color, background: `${color}18`, padding: '3px 8px', borderRadius: 999, border: `1px solid ${color}30` }}>{label}</div>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { icon: '🖼️', label: 'Galerie', sub: '248 Fotos', color: '#C4A47C' },
              { icon: '✍️', label: 'Vertrag', sub: 'Unterschrieben ✓', color: '#10B981' },
              { icon: '📅', label: 'Zeitplan', sub: 'Ablauf ansehen', color: '#3B82F6' },
            ].map(({ icon, label, sub, color }) => (
              <div key={label} style={{ background: '#1C1C1A', borderRadius: 10, padding: '14px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#D0CCC8', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 9, color }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Message section */}
          <div style={{ padding: '0 20px 16px' }}>
            <div style={{ background: '#1C1C1A', borderRadius: 10, padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#D0CCC8', marginBottom: 8 }}>Nachricht von Anna</div>
              <div style={{ fontSize: 10, color: '#5A5A58', lineHeight: 1.6 }}>
                Hallo Laura & Marc! Eure Galerie ist fertig. Ich hoffe, ihr liebt die Bilder so sehr wie ich es tue. 🤍
              </div>
            </div>
          </div>

          {/* Moodboard preview */}
          <div style={{ padding: '0 20px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#D0CCC8', marginBottom: 10 }}>Moodboard</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {['#2A2520', '#1E1A16', '#342E28', '#281E18'].map((bg, i) => (
                <div key={i} style={{ aspectRatio: '1', borderRadius: 6, background: bg }} />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to bottom, transparent, #0F0F0D)', pointerEvents: 'none' }} />
      </div>
    </BrowserFrame>
  )
}

// ── Main Page ────────────────────────────────────────────────────────
export default function HomePage() {
  const [lang, setLang] = useState<'de' | 'en'>('de')
  const t = T[lang]

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
              { href: '#features', label: t.nav.features },
              { href: '#pricing', label: t.nav.pricing },
              { href: '#faq', label: t.nav.faq },
            ].map(({ href, label }) => (
              <a key={href} href={href} className="text-[13.5px] font-medium transition-colors" style={{ color: 'var(--text-muted)' }}>
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-bold transition-all"
              style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <span style={{ opacity: lang === 'de' ? 1 : 0.4 }}>DE</span>
              <span style={{ color: 'var(--border-color)' }}>|</span>
              <span style={{ opacity: lang === 'en' ? 1 : 0.4 }}>EN</span>
            </button>

            <Link href="/login" className="text-[13.5px] font-semibold transition-colors hidden sm:block"
              style={{ color: 'var(--text-secondary)' }}>
              {t.nav.signin}
            </Link>
            <Link href="/signup"
              className="btn-shimmer flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13.5px] font-bold text-white transition-all"
              style={{ background: 'var(--accent)' }}>
              {t.nav.cta}
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

        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-bold mb-8 animate-in"
            style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid rgba(196,164,124,0.2)' }}>
            <Zap className="w-3 h-3" />
            {t.badge}
          </div>

          <h1 className="animate-in-delay-1 font-black mb-6"
            style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', letterSpacing: '-0.04em', lineHeight: 1.0, color: 'var(--text-primary)' }}>
            {t.h1a}{' '}
            <span className="text-gradient-gold">{t.h1b}</span>
          </h1>

          <p className="animate-in-delay-2 text-[17px] leading-relaxed max-w-2xl mx-auto mb-10"
            style={{ color: 'var(--text-secondary)' }}>
            {t.sub}
          </p>

          <div className="animate-in-delay-3 flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Link href="/signup"
              className="btn-shimmer flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-bold text-white transition-all"
              style={{ background: 'var(--accent)', boxShadow: '0 4px 20px rgba(196,164,124,0.35)' }}>
              {t.ctaPrimary}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#features"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-semibold transition-all"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
              {t.ctaSecondary}
            </a>
          </div>

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
              {t.socialProof} <strong style={{ color: 'var(--text-primary)' }}>{t.socialProof2}</strong>
            </span>
          </div>
        </div>

        {/* Hero Dashboard Mockup */}
        <div className="relative max-w-5xl mx-auto px-6 pb-24">
          <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(ellipse 70% 60% at 50% 100%, rgba(196,164,124,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <DashboardMockup />
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="py-24" style={{ background: 'var(--bg-page-2)' }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="label-caps mb-3">{t.problem.label}</p>
          <h2 className="font-black mb-6" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
            {t.problem.h2}
          </h2>
          <p className="text-[17px] leading-relaxed max-w-2xl mx-auto mb-6" style={{ color: 'var(--text-secondary)' }}>
            {t.problem.p1}
          </p>
          <p className="text-[17px] leading-relaxed max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            {t.problem.p2}
          </p>
        </div>
      </section>

      {/* ── FEATURE SECTIONS ── */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6 space-y-32">

          {/* 1 — Bookings */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="label-caps mb-3">{t.bookings.label}</p>
              <h2 className="font-black mb-5" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', letterSpacing: '-0.03em' }}>
                {t.bookings.h2}
              </h2>
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
              <h2 className="font-black mb-5" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', letterSpacing: '-0.03em' }}>
                {t.contracts.h2}
              </h2>
              <p className="text-[16px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{t.contracts.p1}</p>
              <p className="text-[16px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.contracts.p2}</p>
            </div>
            <div className="md:order-1" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <ContractsMockup />
            </div>
          </div>

          {/* 3 — Galleries */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="label-caps mb-3">{t.galleries.label}</p>
              <h2 className="font-black mb-5" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', letterSpacing: '-0.03em' }}>
                {t.galleries.h2}
              </h2>
              <p className="text-[16px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.galleries.p}</p>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <GalleryMockup />
            </div>
          </div>

          {/* 4 — Client Portal with scroll animation */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="md:order-2">
              <p className="label-caps mb-3">{t.portal.label}</p>
              <h2 className="font-black mb-5" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', letterSpacing: '-0.03em' }}>
                {t.portal.h2}
              </h2>
              <p className="text-[16px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{t.portal.p1}</p>
              <p className="text-[16px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.portal.p2}</p>
            </div>
            <div className="md:order-1" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(ellipse at center, rgba(196,164,124,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <ClientPortalMockup />
            </div>
          </div>

        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="py-24" style={{ background: 'var(--bg-page-2)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="label-caps mb-3">{t.featuresSection.label}</p>
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
              {t.featuresSection.h2}
            </h2>
            <p className="text-[16px] max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              {t.featuresSection.sub}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {t.features.map(({ icon, title, desc }, i) => (
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
          <p className="label-caps mb-3">{t.photoTypes.label}</p>
          <h2 className="font-black mb-10" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', letterSpacing: '-0.03em' }}>
            {t.photoTypes.h2}
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {t.genres.map(({ emoji, label }) => (
              <div key={label}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-semibold cursor-default"
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
            <p className="label-caps mb-3">{t.testimonials.label}</p>
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
              {t.testimonials.h2}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {t.reviews.map(({ quote, name, role, stars }, i) => (
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
            <p className="label-caps mb-3">{t.pricing.label}</p>
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
              {t.pricing.h2}
            </h2>
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
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
              {t.faq.h2}
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
                {t.finalCta.h2}
              </h2>
              <p className="text-[16px] mb-8" style={{ color: 'var(--text-secondary)' }}>
                {t.finalCta.sub}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/signup"
                  className="btn-shimmer flex items-center gap-2 px-8 py-3.5 rounded-xl text-[15px] font-bold text-white"
                  style={{ background: 'var(--accent)', boxShadow: '0 4px 20px rgba(196,164,124,0.35)' }}>
                  {t.finalCta.btn1}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#features"
                  className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-[15px] font-semibold transition-all"
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
                      <Icon className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                      {text}
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
                <Link key={href} href={href} className="text-[13px] transition-colors" style={{ color: 'var(--text-muted)' }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{ borderTop: '1px solid var(--border-color)' }}>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              © {new Date().getFullYear()} Fotonizer. {t.footer.copyright}
            </p>
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
