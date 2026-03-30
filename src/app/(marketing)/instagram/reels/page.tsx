'use client'

import { useEffect, useState } from 'react'

// ── Scene durations (ms) ──────────────────────────────────────────────
const SCENES = [
  { id: 'hook',      duration: 3200 },
  { id: 'intro',     duration: 3000 },
  { id: 'inbox',     duration: 3200 },
  { id: 'galleries', duration: 3200 },
  { id: 'contracts', duration: 3200 },
  { id: 'bookings',  duration: 3200 },
  { id: 'cta',       duration: 4400 },
]

const TOTAL = SCENES.reduce((s, sc) => s + sc.duration, 0)

export default function ReelsPage() {
  const [sceneIdx, setSceneIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const [tick, setTick] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  // Advance scenes
  useEffect(() => {
    const dur = SCENES[sceneIdx].duration - 400
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => {
        setSceneIdx((i) => (i + 1) % SCENES.length)
        setVisible(true)
        setTick((t) => t + 1)
      }, 400)
    }, dur)
    return () => clearTimeout(timer)
  }, [sceneIdx, tick])

  // Progress bar
  useEffect(() => {
    setElapsed(0)
    const start = Date.now()
    const dur = SCENES[sceneIdx].duration
    const id = setInterval(() => {
      const diff = Date.now() - start
      setElapsed(Math.min(diff / dur, 1))
      if (diff >= dur) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [sceneIdx, tick])

  const scene = SCENES[sceneIdx].id

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060605',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      gap: 20,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
    }}>
      {/* Instructions */}
      <div style={{ color: '#2A2A28', fontSize: 12, fontFamily: 'monospace', textAlign: 'center', lineHeight: 2 }}>
        FOTONIZER — Instagram Reels · 9:16 · ~{Math.round(TOTAL / 1000)}s · screen record this
        <br />
        Mac: QuickTime → New Screen Recording → select the frame below
      </div>

      {/* 9:16 frame */}
      <div style={{
        width: 390,
        height: 693,
        background: '#0F0F0D',
        borderRadius: 28,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>

        {/* Ambient glow — changes per scene */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: scene === 'hook' || scene === 'intro' || scene === 'cta'
            ? 'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(196,164,124,0.22) 0%, transparent 65%)'
            : scene === 'galleries'
            ? 'radial-gradient(ellipse 80% 50% at 50% 110%, rgba(16,185,129,0.12) 0%, transparent 65%)'
            : scene === 'contracts'
            ? 'radial-gradient(ellipse 80% 50% at 50% 110%, rgba(59,130,246,0.10) 0%, transparent 65%)'
            : 'radial-gradient(ellipse 80% 50% at 50% 110%, rgba(196,164,124,0.10) 0%, transparent 65%)',
          transition: 'background 0.8s ease',
        }} />

        {/* Scene progress bars (top) */}
        <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', gap: 4, zIndex: 20 }}>
          {SCENES.map((sc, i) => (
            <div key={sc.id} style={{ flex: 1, height: 2.5, background: 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: 'rgba(255,255,255,0.7)',
                borderRadius: 2,
                width: i < sceneIdx ? '100%' : i === sceneIdx ? `${elapsed * 100}%` : '0%',
                transition: i === sceneIdx ? 'none' : 'none',
              }} />
            </div>
          ))}
        </div>

        {/* Logo (always visible top) */}
        <div style={{
          position: 'absolute', top: 30, left: 20, zIndex: 20,
          display: 'flex', alignItems: 'center', gap: 8,
          opacity: scene === 'hook' ? 0 : 1,
          transition: 'opacity 0.4s ease',
        }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(196,164,124,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M4 14V7.5L10 4L16 7.5V14" stroke="#C4A47C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7.5 14V10.5H12.5V14" stroke="#C4A47C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', letterSpacing: '-0.02em' }}>Fotonizer</span>
        </div>

        {/* Scene content */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '80px 28px 60px',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0px) scale(1)' : 'translateY(12px) scale(0.98)',
          transition: 'opacity 0.38s ease, transform 0.38s ease',
        }}>

          {/* ── HOOK ─────────────────────────────────────── */}
          {scene === 'hook' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 52, marginBottom: 24 }}>😩</div>
              <h1 style={{ fontSize: 38, fontWeight: 900, color: '#F0EDE8', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 20 }}>
                Still juggling<br />5 different<br />apps?
              </h1>
              <p style={{ fontSize: 17, color: '#4A4A48', lineHeight: 1.6 }}>
                Calendar · Contracts · Email<br />Galleries · Invoices...
              </p>
            </div>
          )}

          {/* ── INTRO ────────────────────────────────────── */}
          {scene === 'intro' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(196,164,124,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
                <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
                  <path d="M4 14V7.5L10 4L16 7.5V14" stroke="#C4A47C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7.5 14V10.5H12.5V14" stroke="#C4A47C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#C4A47C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>Meet Fotonizer</p>
              <h1 style={{ fontSize: 44, fontWeight: 900, color: '#F0EDE8', letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 20 }}>
                Your studio.<br /><span style={{ color: '#C4A47C' }}>All in one place.</span>
              </h1>
              <p style={{ fontSize: 18, color: '#5A5A58', lineHeight: 1.55 }}>
                Bookings · Contracts · Galleries<br />
                Inbox · Invoices · Templates
              </p>
            </div>
          )}

          {/* ── INBOX ────────────────────────────────────── */}
          {scene === 'inbox' && (
            <div style={{ width: '100%' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#C4A47C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>Inbox</p>
              <h2 style={{ fontSize: 36, fontWeight: 900, color: '#F0EDE8', letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 10, textAlign: 'center' }}>
                Never lose a<br />client message.
              </h2>
              <p style={{ fontSize: 15, color: '#5A5A58', lineHeight: 1.55, marginBottom: 24, textAlign: 'center' }}>
                Every conversation in one place.
              </p>
              {/* Mini inbox UI */}
              <div style={{ background: '#1A1A18', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ padding: '9px 13px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 10, fontWeight: 600, color: '#5A5A58' }}>Inbox</div>
                {[
                  { n: 'Laura H.', m: 'Love the photos! 🤍', t: '2m', u: true },
                  { n: 'Thomas B.', m: 'Can we reschedule?', t: '1h', u: true },
                  { n: 'TechCorp', m: 'Invoice received', t: '3h', u: false },
                ].map(({ n, m, t, u }) => (
                  <div key={n} style={{ padding: '9px 13px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: u ? 'rgba(196,164,124,0.06)' : 'transparent', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: u ? 'rgba(196,164,124,0.15)' : '#242422', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: u ? '#C4A47C' : '#3A3A38' }}>{n[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, fontWeight: u ? 700 : 400, color: u ? '#F0EDE8' : '#4A4A48' }}>{n}</span>
                        <span style={{ fontSize: 9, color: '#3A3A38' }}>{t}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        {u && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C4A47C', flexShrink: 0 }} />}
                        <span style={{ fontSize: 10, color: '#4A4A48', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Conversation preview */}
                <div style={{ padding: '10px 13px', background: '#141412' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div style={{ alignSelf: 'flex-start', background: '#242422', borderRadius: '3px 9px 9px 9px', padding: '7px 10px' }}>
                      <span style={{ fontSize: 10, color: '#D0CCC8' }}>These photos are beautiful 🤍</span>
                    </div>
                    <div style={{ alignSelf: 'flex-end', background: 'rgba(196,164,124,0.14)', borderRadius: '9px 3px 9px 9px', padding: '7px 10px', border: '1px solid rgba(196,164,124,0.2)' }}>
                      <span style={{ fontSize: 10, color: '#C4A47C' }}>So happy you love them! 🙏</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── GALLERIES ────────────────────────────────── */}
          {scene === 'galleries' && (
            <div style={{ width: '100%' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#C4A47C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>Galleries</p>
              <h2 style={{ fontSize: 36, fontWeight: 900, color: '#F0EDE8', letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 10, textAlign: 'center' }}>
                Deliver your work<br />beautifully.
              </h2>
              <p style={{ fontSize: 15, color: '#5A5A58', lineHeight: 1.55, marginBottom: 24, textAlign: 'center' }}>
                Polished galleries. Client favorites.<br />Download control.
              </p>
              {/* Gallery UI */}
              <div style={{ background: '#F8F7F4', borderRadius: 12, padding: '14px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A18' }}>Laura &amp; Marc</div>
                    <div style={{ fontSize: 9, color: '#A8A49E' }}>248 photos · Wedding</div>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#A8845C', background: 'rgba(168,132,92,0.1)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(168,132,92,0.2)' }}>↓ Download</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                  {[
                    { bg: '#2A2118', fav: false }, { bg: '#3A3028', fav: true }, { bg: '#1E1A14', fav: false },
                    { bg: '#342820', fav: true }, { bg: '#2C241C', fav: false }, { bg: '#3E3226', fav: true },
                  ].map(({ bg, fav }, i) => (
                    <div key={i} style={{ aspectRatio: '4/3', borderRadius: 6, background: bg, position: 'relative' }}>
                      {fav && <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 9 }}>🤍</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── CONTRACTS ────────────────────────────────── */}
          {scene === 'contracts' && (
            <div style={{ width: '100%' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#C4A47C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>Contracts</p>
              <h2 style={{ fontSize: 36, fontWeight: 900, color: '#F0EDE8', letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 10, textAlign: 'center' }}>
                Send and sign<br />in minutes.
              </h2>
              <p style={{ fontSize: 15, color: '#5A5A58', lineHeight: 1.55, marginBottom: 24, textAlign: 'center' }}>
                No PDFs. Clients sign online.<br />You keep the record.
              </p>
              {/* Contract UI */}
              <div style={{ background: '#F8F7F4', borderRadius: 12, padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A18' }}>Photography Contract</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: 100, border: '1px solid rgba(16,185,129,0.2)' }}>✓ Signed</div>
                </div>
                <div style={{ background: '#FFFFFF', borderRadius: 8, padding: '12px', border: '1px solid rgba(0,0,0,0.06)', marginBottom: 12 }}>
                  <div style={{ fontSize: 9, color: '#A8A49E', marginBottom: 3 }}>CLIENT</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A18', marginBottom: 10 }}>Laura &amp; Marc Hoffmann</div>
                  <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 8 }} />
                  {[80, 60, 90, 50].map((w, i) => (
                    <div key={i} style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 3, marginBottom: 5, width: `${w}%` }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, padding: '10px', background: '#A8845C', borderRadius: 7, fontSize: 12, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }}>Signed ✓</div>
                  <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.04)', borderRadius: 7, fontSize: 12, color: '#A8A49E', border: '1px solid rgba(0,0,0,0.06)' }}>PDF</div>
                </div>
              </div>
            </div>
          )}

          {/* ── BOOKINGS ─────────────────────────────────── */}
          {scene === 'bookings' && (
            <div style={{ width: '100%' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#C4A47C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>Bookings</p>
              <h2 style={{ fontSize: 36, fontWeight: 900, color: '#F0EDE8', letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 10, textAlign: 'center' }}>
                Your calendar,<br />always in sync.
              </h2>
              <p style={{ fontSize: 15, color: '#5A5A58', lineHeight: 1.55, marginBottom: 24, textAlign: 'center' }}>
                Every shoot in one clear overview.
              </p>
              {/* Bookings UI */}
              <div style={{ background: '#1A1A18', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ padding: '9px 13px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 10, fontWeight: 600, color: '#5A5A58' }}>Upcoming Sessions</div>
                {[
                  { name: 'Laura & Marc', type: 'Wedding', date: 'Mar 27', color: '#C4A47C' },
                  { name: 'Anna K.', type: 'Portrait', date: 'Apr 3', color: '#3B82F6' },
                  { name: 'TechCorp', type: 'Commercial', date: 'Apr 10', color: '#10B981' },
                  { name: 'Miller Family', type: 'Family', date: 'Apr 15', color: '#F59E0B' },
                ].map(({ name, type, date, color }) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width: 3, height: 32, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#D0CCC8' }}>{name}</div>
                      <div style={{ fontSize: 9, color: '#4A4A48' }}>{type}</div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#7A7A78' }}>{date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CTA ──────────────────────────────────────── */}
          {scene === 'cta' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 24 }}>📸</div>
              <h2 style={{ fontSize: 44, fontWeight: 900, color: '#F0EDE8', letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 18 }}>
                Run your studio<br /><span style={{ color: '#C4A47C' }}>like a pro.</span>
              </h2>
              <p style={{ fontSize: 18, color: '#5A5A58', lineHeight: 1.55, marginBottom: 40 }}>
                Join 200+ photographers who<br />simplified their workflow.
              </p>
              <div style={{ padding: '16px 40px', background: '#C4A47C', borderRadius: 12, fontSize: 18, fontWeight: 800, color: '#1A1A18', marginBottom: 24, display: 'inline-block' }}>
                Start for free →
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                {['Free to start', 'GDPR compliant', 'EU servers'].map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                    <span style={{ fontSize: 14, color: '#4A4A48' }}>{t}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 32, fontSize: 22, fontWeight: 800, color: '#2A2A28' }}>fotonizer.com</div>
            </div>
          )}

        </div>

        {/* Bottom gradient */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, #0F0F0D 0%, transparent 100%)', zIndex: 15, pointerEvents: 'none' }} />

        {/* Scene label bottom */}
        <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center', zIndex: 20 }}>
          <span style={{ fontSize: 10, color: '#2A2A28', letterSpacing: '0.1em' }}>FOTONIZER.COM</span>
        </div>

      </div>

      {/* Restart button */}
      <button
        onClick={() => { setSceneIdx(0); setVisible(true); setTick(t => t + 1) }}
        style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: '#3A3A38', fontSize: 12, cursor: 'pointer', fontFamily: 'monospace' }}
      >
        ↺ Restart animation
      </button>
    </div>
  )
}
