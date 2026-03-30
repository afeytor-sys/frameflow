'use client'

import { useState, useEffect, useRef } from 'react'

// ── Sidebar nav items ─────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  'Dashboard', 'Inbox', 'Bookings', 'Projects',
  'Pipeline', 'Clients', 'Forms', 'Galleries',
  'Contracts', 'Invoices', 'Templates', 'Analytics',
]

// ── Dark Sidebar ──────────────────────────────────────────────────────
function DarkSidebar({ active, clicking }: { active: string; clicking: boolean }) {
  return (
    <div style={{ width: 110, background: '#0A0A08', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '10px 7px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12, paddingLeft: 3 }}>
        <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(196,164,124,0.25)', flexShrink: 0 }} />
        <span style={{ fontSize: 8, fontWeight: 800, color: '#F0EDE8', letterSpacing: '-0.01em' }}>Fotonizer</span>
      </div>
      {SIDEBAR_ITEMS.map((label) => {
        const isActive = label === active
        return (
          <div key={label} style={{
            padding: '3.5px 6px', borderRadius: 5, marginBottom: 1,
            fontSize: 7.5, fontWeight: isActive ? 600 : 400,
            background: isActive
              ? clicking
                ? 'rgba(196,164,124,0.30)'
                : 'rgba(196,164,124,0.15)'
              : 'transparent',
            color: isActive ? '#C4A47C' : '#3A3A38',
            transform: isActive && clicking ? 'scale(0.95)' : 'scale(1)',
            transition: 'all 0.18s ease',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {label}
            {/* Click ripple on active item */}
            {isActive && clicking && (
              <span style={{
                position: 'absolute', inset: 0,
                background: 'rgba(196,164,124,0.25)',
                borderRadius: 5,
                animation: 'rippleFade 0.4s ease-out forwards',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Light Sidebar ─────────────────────────────────────────────────────
function LightSidebar({ active, clicking }: { active: string; clicking: boolean }) {
  return (
    <div style={{ width: 110, background: '#FFFFFF', borderRight: '1px solid rgba(0,0,0,0.06)', padding: '10px 7px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12, paddingLeft: 3 }}>
        <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(196,164,124,0.18)', flexShrink: 0 }} />
        <span style={{ fontSize: 8, fontWeight: 800, color: '#1A1A18', letterSpacing: '-0.01em' }}>Fotonizer</span>
      </div>
      {SIDEBAR_ITEMS.map((label) => {
        const isActive = label === active
        return (
          <div key={label} style={{
            padding: '3.5px 6px', borderRadius: 5, marginBottom: 1,
            fontSize: 7.5, fontWeight: isActive ? 600 : 400,
            background: isActive
              ? clicking
                ? 'rgba(196,164,124,0.22)'
                : 'rgba(196,164,124,0.12)'
              : 'transparent',
            color: isActive ? '#A8845C' : '#C0BDB8',
            transform: isActive && clicking ? 'scale(0.95)' : 'scale(1)',
            transition: 'all 0.18s ease',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {label}
            {isActive && clicking && (
              <span style={{
                position: 'absolute', inset: 0,
                background: 'rgba(168,132,92,0.2)',
                borderRadius: 5,
                animation: 'rippleFade 0.4s ease-out forwards',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Screen components (dark) ──────────────────────────────────────────
function DarkScreenDashboard() {
  return (
    <div style={{ padding: '12px', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#F0EDE8', marginBottom: 1 }}>Good morning 👋</div>
      <div style={{ fontSize: 7, color: '#5A5A58', marginBottom: 10 }}>Here&apos;s what&apos;s happening today</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 10 }}>
        {[{ v: '12', l: 'Projects', c: '#3B82F6' }, { v: '3', l: 'Invoices', c: '#F59E0B' }, { v: '8', l: 'Galleries', c: '#10B981' }, { v: '€4.2k', l: 'Revenue', c: '#C4A47C' }].map(({ v, l, c }) => (
          <div key={l} style={{ background: '#1C1C1A', borderRadius: 6, padding: '6px 7px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: c, marginBottom: 1 }}>{v}</div>
            <div style={{ fontSize: 6.5, color: '#5A5A58' }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#1C1C1A', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ padding: '5px 9px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 7.5, fontWeight: 700, color: '#F0EDE8' }}>Recent Projects</div>
        {[
          { n: 'Laura & Marc Wedding', d: 'Mar 27', s: 'Active', c: '#10B981' },
          { n: 'Portrait — Anna K.', d: 'Apr 3', s: 'Contract', c: '#F59E0B' },
          { n: 'Brand Shoot TechCorp', d: 'Apr 10', s: 'Gallery', c: '#3B82F6' },
        ].map(({ n, d, s, c }) => (
          <div key={n} style={{ padding: '5px 9px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 7.5, fontWeight: 600, color: '#D0CCC8' }}>{n}</div>
              <div style={{ fontSize: 6.5, color: '#5A5A58' }}>{d}</div>
            </div>
            <div style={{ fontSize: 6.5, fontWeight: 600, color: c, background: `${c}20`, padding: '1px 5px', borderRadius: 999 }}>{s}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#1C1C1A', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', padding: '5px 9px' }}>
        <div style={{ fontSize: 7.5, fontWeight: 700, color: '#F0EDE8', marginBottom: 3 }}>Inbox — 2 unread</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#C4A47C' }} />
          <span style={{ fontSize: 7, color: '#5A5A58' }}>Laura H. — &quot;Love the photos! 🤍&quot;</span>
        </div>
      </div>
    </div>
  )
}

function DarkScreenProjects() {
  return (
    <div style={{ padding: '12px', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#F0EDE8', marginBottom: 10 }}>Projects</div>
      <div style={{ background: '#1C1C1A', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 46px 46px', padding: '4px 9px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 6.5, color: '#4A4A48', fontWeight: 600 }}>
          <span>Name</span><span>Date</span><span>Status</span><span>Stage</span>
        </div>
        {[
          { n: 'Laura & Marc Wedding', d: 'Mar 27', s: 'Active', st: 'Gallery', c: '#10B981', sc: '#3B82F6' },
          { n: 'Portrait — Anna K.', d: 'Apr 3', s: 'Pending', st: 'Contract', c: '#F59E0B', sc: '#F59E0B' },
          { n: 'Brand Shoot TechCorp', d: 'Apr 10', s: 'Active', st: 'Booking', c: '#10B981', sc: '#C4A47C' },
          { n: 'Miller Family', d: 'Apr 15', s: 'Lead', st: 'Pipeline', c: '#A78BFA', sc: '#A78BFA' },
          { n: 'Sophia Portrait', d: 'Apr 22', s: 'Active', st: 'Invoice', c: '#10B981', sc: '#F59E0B' },
        ].map(({ n, d, s, st, c, sc }, i) => (
          <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr 44px 46px 46px', padding: '5px 9px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', background: i === 0 ? 'rgba(196,164,124,0.06)' : 'transparent' }}>
            <div style={{ fontSize: 7.5, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? '#F0EDE8' : '#D0CCC8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 4 }}>{n}</div>
            <div style={{ fontSize: 7, color: '#5A5A58' }}>{d}</div>
            <div style={{ fontSize: 6.5, fontWeight: 600, color: c, background: `${c}18`, padding: '1px 4px', borderRadius: 999, width: 'fit-content' }}>{s}</div>
            <div style={{ fontSize: 6.5, fontWeight: 600, color: sc, background: `${sc}18`, padding: '1px 4px', borderRadius: 999, width: 'fit-content' }}>{st}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DarkScreenProjectDetail() {
  return (
    <div style={{ padding: '12px', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 7, color: '#5A5A58', marginBottom: 3 }}>Projects /</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#F0EDE8', marginBottom: 1 }}>Laura &amp; Marc Wedding</div>
      <div style={{ fontSize: 7, color: '#5A5A58', marginBottom: 8 }}>Mar 27, 2026 · Vienna · Wedding</div>
      <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
        {['Overview', 'Gallery', 'Contract', 'Invoice', 'Inbox'].map((tab, i) => (
          <div key={tab} style={{ padding: '2px 6px', borderRadius: 4, fontSize: 7, fontWeight: i === 0 ? 600 : 400, background: i === 0 ? 'rgba(196,164,124,0.15)' : 'transparent', color: i === 0 ? '#C4A47C' : '#4A4A48', border: i === 0 ? '1px solid rgba(196,164,124,0.2)' : '1px solid transparent' }}>{tab}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {[{ l: 'Contract ✓', c: '#10B981' }, { l: 'Gallery ready', c: '#C4A47C' }, { l: 'Invoice open', c: '#F59E0B' }].map(({ l, c }) => (
          <div key={l} style={{ fontSize: 6.5, fontWeight: 600, color: c, background: `${c}18`, padding: '2px 6px', borderRadius: 999, border: `1px solid ${c}30` }}>{l}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        {[
          { icon: '🖼️', l: 'Gallery', s: '248 Photos', c: '#C4A47C' },
          { icon: '✍️', l: 'Contract', s: 'Signed', c: '#10B981' },
          { icon: '💳', l: 'Invoice', s: '€1,200', c: '#F59E0B' },
          { icon: '📅', l: 'Booking', s: 'Mar 27', c: '#3B82F6' },
          { icon: '📬', l: 'Inbox', s: '2 msgs', c: '#A78BFA' },
          { icon: '📁', l: 'Files', s: '14 files', c: '#5A5A58' },
        ].map(({ icon, l, s, c }) => (
          <div key={l} style={{ background: '#1C1C1A', borderRadius: 6, padding: '7px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 11, marginBottom: 2 }}>{icon}</div>
            <div style={{ fontSize: 7.5, fontWeight: 700, color: '#D0CCC8', marginBottom: 1 }}>{l}</div>
            <div style={{ fontSize: 7, color: c }}>{s}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DarkScreenInbox() {
  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ width: 110, borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ padding: '7px 9px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 8, fontWeight: 700, color: '#F0EDE8' }}>Inbox</div>
        {[
          { n: 'Laura H.', m: 'Love the photos! 🤍', t: '2m', u: true },
          { n: 'Thomas B.', m: 'Can we reschedule?', t: '1h', u: true },
          { n: 'TechCorp', m: 'Invoice received', t: '3h', u: false },
          { n: 'Anna K.', m: 'Thank you!', t: 'Tue', u: false },
        ].map(({ n, m, t, u }) => (
          <div key={n} style={{ padding: '6px 9px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: u ? 'rgba(196,164,124,0.06)' : 'transparent' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 7.5, fontWeight: u ? 700 : 400, color: u ? '#F0EDE8' : '#4A4A48' }}>{n}</span>
              <span style={{ fontSize: 6.5, color: '#3A3A38' }}>{t}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {u && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#C4A47C', flexShrink: 0 }} />}
              <span style={{ fontSize: 7, color: '#4A4A48', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>{m}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '7px 9px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 8, fontWeight: 600, color: '#F0EDE8' }}>Laura H.</div>
        <div style={{ flex: 1, padding: '8px 9px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ alignSelf: 'flex-start', background: '#1C1C1A', borderRadius: '2px 6px 6px 6px', padding: '4px 7px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 7.5, color: '#D0CCC8' }}>These photos are beautiful 🤍</span>
          </div>
          <div style={{ alignSelf: 'flex-end', background: 'rgba(196,164,124,0.14)', borderRadius: '6px 2px 6px 6px', padding: '4px 7px', border: '1px solid rgba(196,164,124,0.2)' }}>
            <span style={{ fontSize: 7.5, color: '#C4A47C' }}>So happy you love them! 🙏</span>
          </div>
          <div style={{ alignSelf: 'flex-start', background: '#1C1C1A', borderRadius: '2px 6px 6px 6px', padding: '4px 7px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 7.5, color: '#D0CCC8' }}>Love the photos! 🤍</span>
          </div>
        </div>
        <div style={{ padding: '5px 9px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ background: '#1C1C1A', borderRadius: 4, padding: '4px 7px', fontSize: 7, color: '#3A3A38' }}>Reply...</div>
        </div>
      </div>
    </div>
  )
}

// ── Screen components (light) ─────────────────────────────────────────
function LightScreenDashboard() {
  return (
    <div style={{ padding: '12px', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#1A1A18', marginBottom: 1 }}>Good morning 👋</div>
      <div style={{ fontSize: 7, color: '#A8A49E', marginBottom: 10 }}>Here&apos;s what&apos;s happening today</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 10 }}>
        {[{ v: '12', l: 'Projects', c: '#3B82F6' }, { v: '3', l: 'Invoices', c: '#F59E0B' }, { v: '8', l: 'Galleries', c: '#10B981' }, { v: '€4.2k', l: 'Revenue', c: '#A8845C' }].map(({ v, l, c }) => (
          <div key={l} style={{ background: '#FFFFFF', borderRadius: 6, padding: '6px 7px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: c, marginBottom: 1 }}>{v}</div>
            <div style={{ fontSize: 6.5, color: '#A8A49E' }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#FFFFFF', borderRadius: 6, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: 8 }}>
        <div style={{ padding: '5px 9px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: 7.5, fontWeight: 700, color: '#1A1A18' }}>Recent Projects</div>
        {[
          { n: 'Laura & Marc Wedding', d: 'Mar 27', s: 'Active', c: '#10B981' },
          { n: 'Portrait — Anna K.', d: 'Apr 3', s: 'Contract', c: '#F59E0B' },
          { n: 'Brand Shoot TechCorp', d: 'Apr 10', s: 'Gallery', c: '#3B82F6' },
        ].map(({ n, d, s, c }) => (
          <div key={n} style={{ padding: '5px 9px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 7.5, fontWeight: 600, color: '#2A2A28' }}>{n}</div>
              <div style={{ fontSize: 6.5, color: '#A8A49E' }}>{d}</div>
            </div>
            <div style={{ fontSize: 6.5, fontWeight: 600, color: c, background: `${c}15`, padding: '1px 5px', borderRadius: 999 }}>{s}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LightScreenGalleries() {
  return (
    <div style={{ padding: '12px', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#1A1A18', marginBottom: 10 }}>Galleries</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
        {[
          { name: 'Laura & Marc Wedding', count: '248', status: 'Published', c: '#10B981', bg: 'linear-gradient(135deg,#2A2118,#1E1A14)' },
          { name: 'Portrait — Anna K.', count: '84', status: 'Draft', c: '#F59E0B', bg: 'linear-gradient(135deg,#1A1E2A,#14181E)' },
          { name: 'Brand Shoot TechCorp', count: '132', status: 'Published', c: '#10B981', bg: 'linear-gradient(135deg,#1A2A1E,#141E16)' },
          { name: 'Miller Family', count: '67', status: 'Draft', c: '#F59E0B', bg: 'linear-gradient(135deg,#2A1A18,#1E1414)' },
        ].map(({ name, count, status, c, bg }) => (
          <div key={name} style={{ background: '#FFFFFF', borderRadius: 7, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ height: 48, background: bg, position: 'relative' }}>
              <div style={{ position: 'absolute', bottom: 5, right: 6, fontSize: 6.5, fontWeight: 600, color: c, background: `${c}20`, padding: '1px 5px', borderRadius: 999 }}>{status}</div>
            </div>
            <div style={{ padding: '5px 7px' }}>
              <div style={{ fontSize: 7.5, fontWeight: 600, color: '#1A1A18', marginBottom: 1 }}>{name}</div>
              <div style={{ fontSize: 6.5, color: '#A8A49E' }}>{count} photos</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LightScreenContracts() {
  return (
    <div style={{ padding: '12px', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#1A1A18', marginBottom: 10 }}>Contracts</div>
      <div style={{ background: '#FFFFFF', borderRadius: 6, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 46px 52px', padding: '4px 9px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: 6.5, color: '#A8A49E', fontWeight: 600 }}>
          <span>Client</span><span>Date</span><span>Status</span>
        </div>
        {[
          { n: 'Laura & Marc Hoffmann', d: 'Mar 20', s: 'Signed', c: '#10B981' },
          { n: 'Anna K.', d: 'Mar 28', s: 'Sent', c: '#3B82F6' },
          { n: 'TechCorp GmbH', d: 'Apr 1', s: 'Draft', c: '#A8A49E' },
          { n: 'Miller Family', d: 'Apr 8', s: 'Signed', c: '#10B981' },
          { n: 'Sophia L.', d: 'Apr 14', s: 'Sent', c: '#3B82F6' },
        ].map(({ n, d, s, c }, i) => (
          <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr 46px 52px', padding: '5px 9px', borderBottom: '1px solid rgba(0,0,0,0.04)', alignItems: 'center', background: i === 0 ? 'rgba(168,132,92,0.04)' : 'transparent' }}>
            <div style={{ fontSize: 7.5, fontWeight: i === 0 ? 600 : 400, color: '#1A1A18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 4 }}>{n}</div>
            <div style={{ fontSize: 7, color: '#A8A49E' }}>{d}</div>
            <div style={{ fontSize: 6.5, fontWeight: 600, color: c, background: `${c}15`, padding: '1px 5px', borderRadius: 999, width: 'fit-content' }}>{s}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LightScreenAnalytics() {
  return (
    <div style={{ padding: '12px', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#1A1A18', marginBottom: 10 }}>Analytics</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginBottom: 8 }}>
        {[
          { label: 'Revenue', value: '€8.4k', sub: '+12% ↑', color: '#10B981' },
          { label: 'Clients', value: '24', sub: '+4 this month', color: '#3B82F6' },
          { label: 'Conversion', value: '68%', sub: 'Leads → Bookings', color: '#A8845C' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={{ background: '#FFFFFF', borderRadius: 6, padding: '7px 8px', border: '1px solid rgba(0,0,0,0.06)', borderTop: `2px solid ${color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color, marginBottom: 1 }}>{value}</div>
            <div style={{ fontSize: 6.5, color: '#A8A49E', marginBottom: 1 }}>{label}</div>
            <div style={{ fontSize: 6.5, color: `${color}99` }}>{sub}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#FFFFFF', borderRadius: 6, padding: '7px 9px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: 7.5, fontWeight: 700, color: '#1A1A18', marginBottom: 7 }}>Revenue — last 6 months</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 34 }}>
          {[55, 70, 45, 85, 65, 100].map((h, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ width: '100%', height: `${h * 0.3}px`, borderRadius: '3px 3px 0 0', background: i === 5 ? '#A8845C' : 'rgba(168,132,92,0.2)' }} />
              <div style={{ fontSize: 6, color: '#A8A49E' }}>{['O', 'N', 'D', 'J', 'F', 'M'][i]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Sequences ─────────────────────────────────────────────────────────
type Step = { nav: string; url: string; content: string; duration: number }

const DARK_STEPS: Step[] = [
  { nav: 'Dashboard', url: 'fotonizer.com/dashboard',                     content: 'dashboard', duration: 3200 },
  { nav: 'Projects',  url: 'fotonizer.com/dashboard/projects',            content: 'projects',  duration: 3000 },
  { nav: 'Projects',  url: 'fotonizer.com/dashboard/projects/laura-marc', content: 'detail',    duration: 3600 },
  { nav: 'Inbox',     url: 'fotonizer.com/dashboard/inbox',               content: 'inbox',     duration: 3400 },
]

const LIGHT_STEPS: Step[] = [
  { nav: 'Dashboard', url: 'fotonizer.com/dashboard',                  content: 'dashboard', duration: 3200 },
  { nav: 'Galleries', url: 'fotonizer.com/dashboard/galleries',        content: 'galleries', duration: 3000 },
  { nav: 'Contracts', url: 'fotonizer.com/dashboard/contracts',        content: 'contracts', duration: 3400 },
  { nav: 'Analytics', url: 'fotonizer.com/dashboard/analytics',        content: 'analytics', duration: 3400 },
]

// ── Animated Dashboard ────────────────────────────────────────────────
function AnimatedDashboard({ steps, mode }: { steps: Step[]; mode: 'dark' | 'light' }) {
  const [idx, setIdx] = useState(0)
  const [contentFade, setContentFade] = useState(true)
  const [contentZoom, setContentZoom] = useState(1)
  const [clicking, setClicking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [cursorPos, setCursorPos] = useState({ x: 55, y: 22 }) // start at Dashboard nav item
  const containerRef = useRef<HTMLDivElement>(null)

  const step = steps[idx]
  const nextStep = steps[(idx + 1) % steps.length]

  // Nav item Y positions (approx, matches sidebar layout)
  const NAV_Y: Record<string, number> = {
    Dashboard: 22, Inbox: 30, Bookings: 38, Projects: 46,
    Pipeline: 54, Clients: 62, Forms: 70, Galleries: 78,
    Contracts: 86, Invoices: 94, Templates: 102, Analytics: 110,
  }

  useEffect(() => {
    setProgress(0)
    const start = Date.now()
    const dur = step.duration

    // Progress bar
    const progressId = setInterval(() => {
      setProgress(Math.min((Date.now() - start) / dur, 1))
    }, 16)

    // 600ms before end: move cursor to next nav item + click flash
    const CLICK_BEFORE = 700
    const cursorMove = setTimeout(() => {
      const targetNav = nextStep.nav
      setCursorPos({ x: 55, y: NAV_Y[targetNav] ?? 22 })
    }, dur - CLICK_BEFORE)

    // 350ms before end: clicking state + zoom in
    const clickStart = setTimeout(() => {
      setClicking(true)
      setContentZoom(1.025)
    }, dur - 350)

    // content fade out + zoom out
    const fadeOut = setTimeout(() => {
      setContentFade(false)
      setContentZoom(0.975)
    }, dur - 220)

    // advance
    const advance = setTimeout(() => {
      setIdx(i => (i + 1) % steps.length)
      setClicking(false)
      setContentFade(true)
      setContentZoom(1)
    }, dur)

    return () => {
      clearInterval(progressId)
      clearTimeout(cursorMove)
      clearTimeout(clickStart)
      clearTimeout(fadeOut)
      clearTimeout(advance)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  const isDark = mode === 'dark'
  const barBg   = isDark ? '#1A1A18' : '#F0EDE8'
  const bodyBg  = isDark ? '#141412' : '#F8F7F4'
  const urlCol  = isDark ? '#4A4A48' : '#A8A49E'
  const urlBg   = isDark ? '#1C1C1A' : '#E8E4DE'
  const accent  = isDark ? '#C4A47C' : '#A8845C'

  return (
    <div ref={containerRef} style={{
      borderRadius: 10, overflow: 'hidden',
      boxShadow: isDark
        ? '0 24px 60px rgba(0,0,0,0.55), 0 6px 20px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)'
        : '0 20px 50px rgba(0,0,0,0.12), 0 4px 14px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.07)',
      position: 'relative',
    }}>

      {/* Global CSS for animations */}
      <style>{`
        @keyframes rippleFade {
          0%   { opacity: 0.8; transform: scale(0.8); }
          100% { opacity: 0;   transform: scale(1.4); }
        }
        @keyframes cursorClick {
          0%   { transform: scale(1);    opacity: 1; }
          40%  { transform: scale(0.75); opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes clickRing {
          0%   { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>

      {/* Browser bar */}
      <div style={{ background: barBg, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`, padding: '7px 11px', display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c, i) => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />)}
        </div>
        {/* Step dots */}
        <div style={{ display: 'flex', gap: 3, marginLeft: 4 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ width: i === idx ? 14 : 5, height: 5, borderRadius: 3, background: i === idx ? accent : (isDark ? '#2A2A28' : '#D8D4CE'), transition: 'width 0.3s ease' }} />
          ))}
        </div>
        <div style={{ flex: 1, background: urlBg, borderRadius: 4, height: 16, display: 'flex', alignItems: 'center', paddingLeft: 7, fontSize: 8, color: urlCol, fontFamily: 'monospace', opacity: contentFade ? 1 : 0.4, transition: 'opacity 0.3s' }}>
          {step.url}
        </div>
      </div>

      {/* Loading bar */}
      <div style={{ height: 2, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }}>
        <div style={{ height: '100%', background: accent, width: `${progress * 100}%`, transition: 'width 0.1s linear', opacity: 0.7 }} />
      </div>

      {/* Dashboard body */}
      <div style={{ background: bodyBg, display: 'flex', height: 260, position: 'relative' }}>

        {/* Sidebar */}
        {isDark
          ? <DarkSidebar active={step.nav} clicking={clicking} />
          : <LightSidebar active={step.nav} clicking={clicking} />
        }

        {/* Main content — zoom + fade */}
        <div style={{
          flex: 1, overflow: 'hidden',
          opacity: contentFade ? 1 : 0,
          transform: `scale(${contentZoom})`,
          transformOrigin: clicking ? 'left center' : 'center center',
          transition: contentFade
            ? 'opacity 0.22s ease, transform 0.22s ease'
            : 'opacity 0.18s ease, transform 0.18s ease',
        }}>
          {isDark && step.content === 'dashboard' && <DarkScreenDashboard />}
          {isDark && step.content === 'projects'  && <DarkScreenProjects />}
          {isDark && step.content === 'detail'    && <DarkScreenProjectDetail />}
          {isDark && step.content === 'inbox'     && <DarkScreenInbox />}
          {!isDark && step.content === 'dashboard' && <LightScreenDashboard />}
          {!isDark && step.content === 'galleries' && <LightScreenGalleries />}
          {!isDark && step.content === 'contracts' && <LightScreenContracts />}
          {!isDark && step.content === 'analytics' && <LightScreenAnalytics />}
        </div>

        {/* Fake cursor — overlaid on the sidebar */}
        <div style={{
          position: 'absolute',
          left: cursorPos.x,
          top: cursorPos.y,
          pointerEvents: 'none',
          zIndex: 50,
          transition: 'left 0.4s cubic-bezier(0.34,1.56,0.64,1), top 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          {/* Cursor dot */}
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: accent,
            boxShadow: `0 0 0 2px ${isDark ? '#141412' : '#F8F7F4'}, 0 0 8px ${accent}80`,
            animation: clicking ? 'cursorClick 0.28s ease-out' : 'none',
          }} />
          {/* Click ring */}
          {clicking && (
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: 18, height: 18,
              marginTop: -9, marginLeft: -9,
              borderRadius: '50%',
              border: `1.5px solid ${accent}`,
              animation: 'clickRing 0.45s ease-out forwards',
            }} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function DashboardReelsPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#060605',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '48px 40px',
      gap: 32,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
    }}>

      <div style={{ color: '#2A2A28', fontSize: 11, fontFamily: 'monospace', textAlign: 'center', lineHeight: 2 }}>
        FOTONIZER — Dashboard Reels · QuickTime → New Screen Recording → select a frame
        <br />
        Each loop is ~13s · record once, cut in CapCut / Premiere / iMovie
      </div>

      <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>

        {/* Dark 9:16 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 10, color: '#2A2A28', fontFamily: 'monospace' }}>🌙 DARK · 390 × 693 · 9:16</div>
          <div style={{
            width: 390, height: 693,
            background: '#0F0F0D',
            borderRadius: 24,
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.07)',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 45% at 50% -5%, rgba(196,164,124,0.18) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
            <div style={{ position: 'absolute', top: 32, left: 24, zIndex: 20, display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(196,164,124,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                  <path d="M4 14V7.5L10 4L16 7.5V14" stroke="#C4A47C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7.5 14V10.5H12.5V14" stroke="#C4A47C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8', letterSpacing: '-0.02em' }}>Fotonizer</span>
            </div>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 354, zIndex: 10 }}>
              <AnimatedDashboard steps={DARK_STEPS} mode="dark" />
            </div>
            <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, textAlign: 'center', zIndex: 20 }}>
              <span style={{ fontSize: 10, color: '#1E1E1C', letterSpacing: '0.1em', fontWeight: 500 }}>FOTONIZER.COM</span>
            </div>
          </div>
        </div>

        {/* Light 9:16 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 10, color: '#2A2A28', fontFamily: 'monospace' }}>☀️ LIGHT · 390 × 693 · 9:16</div>
          <div style={{
            width: 390, height: 693,
            background: '#F8F7F4',
            borderRadius: 24,
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 40px 100px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.07)',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 45% at 50% -5%, rgba(196,164,124,0.14) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
            <div style={{ position: 'absolute', top: 32, left: 24, zIndex: 20, display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(196,164,124,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                  <path d="M4 14V7.5L10 4L16 7.5V14" stroke="#A8845C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7.5 14V10.5H12.5V14" stroke="#A8845C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1A1A18', letterSpacing: '-0.02em' }}>Fotonizer</span>
            </div>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 354, zIndex: 10 }}>
              <AnimatedDashboard steps={LIGHT_STEPS} mode="light" />
            </div>
            <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, textAlign: 'center', zIndex: 20 }}>
              <span style={{ fontSize: 10, color: '#C8C4BE', letterSpacing: '0.1em', fontWeight: 500 }}>FOTONIZER.COM</span>
            </div>
          </div>
        </div>

      </div>

      <div style={{ color: '#1E1E1C', fontSize: 11, fontFamily: 'monospace', textAlign: 'center', lineHeight: 2 }}>
        cursor moves to the next nav item · click ripple + zoom in → screen transitions · loop auto-restarts
      </div>
    </div>
  )
}
