import type { ReactNode } from 'react'

// ── Slide Wrapper ─────────────────────────────────────────────────────
function Slide({
  n,
  children,
  glow,
}: {
  n: number
  children: ReactNode
  glow?: string
}) {
  return (
    <div
      id={`slide-${n}`}
      style={{
        width: 1080,
        height: 1080,
        background: '#0F0F0D',
        position: 'relative',
        overflow: 'hidden',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", sans-serif',
        flexShrink: 0,
        outline: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Glow accent */}
      {glow && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: glow,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 52,
          left: 64,
          right: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: 'rgba(196,164,124,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 14V7.5L10 4L16 7.5V14"
                stroke="#C4A47C"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7.5 14V10.5H12.5V14"
                stroke="#C4A47C"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#F0EDE8',
              letterSpacing: '-0.02em',
            }}
          >
            Fotonizer
          </span>
        </div>
        {/* Dot indicators */}
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              style={{
                width: i === n - 1 ? 22 : 7,
                height: 7,
                borderRadius: 4,
                background: i === n - 1 ? '#C4A47C' : '#2A2A28',
              }}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 50,
          left: 64,
          right: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 17, color: '#2A2A28' }}>fotonizer.com</span>
        <span
          style={{
            fontSize: 15,
            color: '#222220',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Studio Management for Photographers
        </span>
      </div>

      {children}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────
export default function InstagramCarouselPage() {
  return (
    <div
      style={{
        background: '#060605',
        minHeight: '100vh',
        padding: '60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '64px',
      }}
    >
      {/* Instructions */}
      <div
        style={{
          color: '#3A3A38',
          fontFamily: 'monospace',
          fontSize: 13,
          textAlign: 'center',
          lineHeight: 2,
        }}
      >
        FOTONIZER — Instagram Carousel · 8 slides · 1080 × 1080 px
        <br />
        Mac: Cmd + Shift + 4 → select each slide · Windows: Win + Shift + S
      </div>

      {/* ── SLIDE 1: COVER ────────────────────────────────────────────── */}
      <Slide
        n={1}
        glow="radial-gradient(ellipse 90% 55% at 50% -5%, rgba(196,164,124,0.20) 0%, transparent 70%)"
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '120px 80px',
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              padding: '9px 22px',
              borderRadius: 100,
              background: 'rgba(196,164,124,0.1)',
              border: '1px solid rgba(196,164,124,0.22)',
              marginBottom: 52,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10B981',
              }}
            />
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#C4A47C',
                letterSpacing: '0.04em',
              }}
            >
              Built for photographers, by photographers
            </span>
          </div>

          <h1
            style={{
              fontSize: 92,
              fontWeight: 900,
              color: '#F0EDE8',
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              textAlign: 'center',
              marginBottom: 40,
            }}
          >
            Your studio.
            <br />
            <span style={{ color: '#C4A47C' }}>All in one place.</span>
          </h1>

          <p
            style={{
              fontSize: 32,
              color: '#5A5A58',
              textAlign: 'center',
              lineHeight: 1.6,
              maxWidth: 740,
              marginBottom: 64,
            }}
          >
            Bookings, contracts, galleries, client communication
            <br />— one clean platform.
          </p>

          <div style={{ display: 'flex', gap: 12 }}>
            {['Inbox', 'Contracts', 'Galleries', 'Bookings', 'Analytics'].map(
              (label) => (
                <div
                  key={label}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.07)',
                    fontSize: 15,
                    color: '#4A4A48',
                    fontWeight: 500,
                  }}
                >
                  {label}
                </div>
              )
            )}
          </div>
        </div>
      </Slide>

      {/* ── SLIDE 2: INBOX ────────────────────────────────────────────── */}
      <Slide n={2}>
        <div
          style={{
            position: 'absolute',
            top: 134,
            left: 64,
            right: 64,
            bottom: 110,
          }}
        >
          <p
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#C4A47C',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: 18,
            }}
          >
            01 — Inbox
          </p>
          <h2
            style={{
              fontSize: 68,
              fontWeight: 900,
              color: '#F0EDE8',
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              marginBottom: 20,
            }}
          >
            Never lose a<br />client message.
          </h2>
          <p
            style={{
              fontSize: 29,
              color: '#5A5A58',
              lineHeight: 1.55,
              marginBottom: 44,
            }}
          >
            Every conversation in one place.
            <br />
            No more digging through email threads.
          </p>
          {/* Inbox UI */}
          <div
            style={{
              display: 'flex',
              background: '#1A1A18',
              borderRadius: 14,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.06)',
              height: 294,
            }}
          >
            {/* Left: list */}
            <div
              style={{
                width: 270,
                borderRight: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                style={{
                  padding: '13px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#5A5A58',
                }}
              >
                Inbox
              </div>
              {[
                { n: 'Laura H.', m: 'Love the photos! 🤍', t: '2m', u: true },
                { n: 'Thomas B.', m: 'Can we reschedule?', t: '1h', u: true },
                { n: 'TechCorp', m: 'Invoice received', t: '3h', u: false },
                { n: 'Anna K.', m: 'Thank you so much!', t: 'Tue', u: false },
              ].map(({ n, m, t, u }) => (
                <div
                  key={n}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: u ? 'rgba(196,164,124,0.06)' : 'transparent',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: u ? 700 : 400,
                        color: u ? '#F0EDE8' : '#4A4A48',
                      }}
                    >
                      {n}
                    </span>
                    <span style={{ fontSize: 10, color: '#3A3A38' }}>{t}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    {u && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#C4A47C',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: 10,
                        color: '#4A4A48',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 210,
                      }}
                    >
                      {m}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* Right: conversation */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  padding: '13px 18px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#F0EDE8',
                }}
              >
                Laura H.
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    alignSelf: 'flex-start',
                    background: '#242422',
                    borderRadius: '4px 12px 12px 12px',
                    padding: '9px 13px',
                    maxWidth: '82%',
                  }}
                >
                  <span
                    style={{ fontSize: 11, color: '#D0CCC8', lineHeight: 1.4 }}
                  >
                    These are absolutely beautiful 🤍
                  </span>
                </div>
                <div
                  style={{
                    alignSelf: 'flex-end',
                    background: 'rgba(196,164,124,0.14)',
                    borderRadius: '12px 4px 12px 12px',
                    padding: '9px 13px',
                    maxWidth: '82%',
                    border: '1px solid rgba(196,164,124,0.2)',
                  }}
                >
                  <span
                    style={{ fontSize: 11, color: '#C4A47C', lineHeight: 1.4 }}
                  >
                    So happy you love them! 🙏
                  </span>
                </div>
                <div
                  style={{
                    alignSelf: 'flex-start',
                    background: '#242422',
                    borderRadius: '4px 12px 12px 12px',
                    padding: '9px 13px',
                    maxWidth: '82%',
                  }}
                >
                  <span
                    style={{ fontSize: 11, color: '#D0CCC8', lineHeight: 1.4 }}
                  >
                    Love the photos! 🤍
                  </span>
                </div>
              </div>
              <div style={{ padding: '10px 18px' }}>
                <div
                  style={{
                    background: '#242422',
                    borderRadius: 7,
                    padding: '8px 12px',
                    fontSize: 10,
                    color: '#3A3A38',
                  }}
                >
                  Reply to Laura...
                </div>
              </div>
            </div>
          </div>
        </div>
      </Slide>

      {/* ── SLIDE 3: FORMS ────────────────────────────────────────────── */}
      <Slide n={3}>
        <div
          style={{
            position: 'absolute',
            top: 134,
            left: 64,
            right: 64,
            bottom: 110,
          }}
        >
          <p
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#C4A47C',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: 18,
            }}
          >
            02 — Forms
          </p>
          <h2
            style={{
              fontSize: 68,
              fontWeight: 900,
              color: '#F0EDE8',
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              marginBottom: 20,
            }}
          >
            Capture every
            <br />
            inquiry.
          </h2>
          <p
            style={{
              fontSize: 29,
              color: '#5A5A58',
              lineHeight: 1.55,
              marginBottom: 44,
            }}
          >
            Stop losing leads to missed messages.
            <br />
            Every request lands in your dashboard.
          </p>
          {/* Form UI */}
          <div
            style={{
              background: '#F8F7F4',
              borderRadius: 14,
              padding: '28px',
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#1A1A18',
                marginBottom: 4,
              }}
            >
              Inquiry — Anna Fotografie
            </div>
            <div
              style={{ fontSize: 12, color: '#A8A49E', marginBottom: 20 }}
            >
              Tell me about your project.
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
                marginBottom: 16,
              }}
            >
              {[
                { label: 'Name', value: 'Laura Hoffmann' },
                { label: 'Date', value: 'June 14, 2026' },
                { label: 'Shoot type', value: 'Wedding' },
                { label: 'Location', value: 'Vienna, Austria' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: '#7A7670',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: 5,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 7,
                      padding: '9px 12px',
                      border: '1px solid rgba(168,132,92,0.25)',
                      fontSize: 13,
                      color: '#1A1A18',
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                padding: '13px 0',
                background: '#A8845C',
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 700,
                color: '#FFFFFF',
                textAlign: 'center',
              }}
            >
              Send Inquiry →
            </div>
          </div>
        </div>
      </Slide>

      {/* ── SLIDE 4: GALLERIES ────────────────────────────────────────── */}
      <Slide n={4}>
        <div
          style={{
            position: 'absolute',
            top: 134,
            left: 64,
            right: 64,
            bottom: 110,
          }}
        >
          <p
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#C4A47C',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: 18,
            }}
          >
            03 — Galleries
          </p>
          <h2
            style={{
              fontSize: 68,
              fontWeight: 900,
              color: '#F0EDE8',
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              marginBottom: 20,
            }}
          >
            Deliver your work
            <br />
            beautifully.
          </h2>
          <p
            style={{
              fontSize: 29,
              color: '#5A5A58',
              lineHeight: 1.55,
              marginBottom: 44,
            }}
          >
            Polished online galleries with download
            <br />
            control and client favorites.
          </p>
          {/* Gallery UI */}
          <div
            style={{
              background: '#F8F7F4',
              borderRadius: 14,
              padding: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#1A1A18',
                  }}
                >
                  Laura &amp; Marc · Wedding
                </div>
                <div style={{ fontSize: 11, color: '#A8A49E' }}>
                  248 photos · March 27, 2026
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#A8845C',
                  background: 'rgba(168,132,92,0.1)',
                  padding: '7px 16px',
                  borderRadius: 8,
                  border: '1px solid rgba(168,132,92,0.2)',
                }}
              >
                ↓ Download all
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6,
              }}
            >
              {[
                { bg: '#2A2118', fav: false },
                { bg: '#3A3028', fav: true },
                { bg: '#1E1A14', fav: false },
                { bg: '#342820', fav: true },
                { bg: '#2C241C', fav: false },
                { bg: '#3E3226', fav: false },
                { bg: '#241C14', fav: true },
                { bg: '#302820', fav: false },
              ].map(({ bg, fav }, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '4/3',
                    borderRadius: 7,
                    background: bg,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {fav && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 5,
                        right: 5,
                        fontSize: 12,
                      }}
                    >
                      🤍
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Slide>

      {/* ── SLIDE 5: CONTRACTS ────────────────────────────────────────── */}
      <Slide n={5}>
        <div
          style={{
            position: 'absolute',
            top: 134,
            left: 64,
            right: 64,
            bottom: 110,
          }}
        >
          <p
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#C4A47C',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: 18,
            }}
          >
            04 — Contracts
          </p>
          <h2
            style={{
              fontSize: 68,
              fontWeight: 900,
              color: '#F0EDE8',
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              marginBottom: 20,
            }}
          >
            Send and sign
            <br />
            in minutes.
          </h2>
          <p
            style={{
              fontSize: 29,
              color: '#5A5A58',
              lineHeight: 1.55,
              marginBottom: 44,
            }}
          >
            No PDFs, no printing, no back-and-forth.
            <br />
            Clients sign online, you keep the record.
          </p>
          {/* Contract UI */}
          <div
            style={{
              background: '#F8F7F4',
              borderRadius: 14,
              padding: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#1A1A18',
                }}
              >
                Photography Contract
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#10B981',
                  background: 'rgba(16,185,129,0.1)',
                  padding: '5px 14px',
                  borderRadius: 100,
                  border: '1px solid rgba(16,185,129,0.22)',
                }}
              >
                ✓ Signed
              </div>
            </div>
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 9,
                padding: '16px',
                border: '1px solid rgba(0,0,0,0.06)',
                marginBottom: 14,
              }}
            >
              <div
                style={{ fontSize: 10, color: '#A8A49E', marginBottom: 4 }}
              >
                CLIENT
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#1A1A18',
                  marginBottom: 12,
                }}
              >
                Laura &amp; Marc Hoffmann
              </div>
              <div
                style={{
                  height: 1,
                  background: 'rgba(0,0,0,0.06)',
                  marginBottom: 10,
                }}
              />
              {[80, 65, 90, 55].map((w, i) => (
                <div
                  key={i}
                  style={{
                    height: 7,
                    background: 'rgba(0,0,0,0.06)',
                    borderRadius: 3,
                    marginBottom: 6,
                    width: `${w}%`,
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#A8845C',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  textAlign: 'center',
                }}
              >
                Contract Signed ✓
              </div>
              <div
                style={{
                  padding: '12px 18px',
                  background: 'rgba(0,0,0,0.04)',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#A8A49E',
                  textAlign: 'center',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                PDF
              </div>
            </div>
          </div>
        </div>
      </Slide>

      {/* ── SLIDE 6: BOOKINGS ─────────────────────────────────────────── */}
      <Slide n={6}>
        <div
          style={{
            position: 'absolute',
            top: 134,
            left: 64,
            right: 64,
            bottom: 110,
          }}
        >
          <p
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#C4A47C',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: 18,
            }}
          >
            05 — Bookings
          </p>
          <h2
            style={{
              fontSize: 68,
              fontWeight: 900,
              color: '#F0EDE8',
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              marginBottom: 20,
            }}
          >
            Your calendar,
            <br />
            always in sync.
          </h2>
          <p
            style={{
              fontSize: 29,
              color: '#5A5A58',
              lineHeight: 1.55,
              marginBottom: 44,
            }}
          >
            Every shoot and session in one clear overview.
            <br />
            Know exactly what&apos;s next.
          </p>
          {/* Bookings UI */}
          <div
            style={{
              background: '#1A1A18',
              borderRadius: 14,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              style={{
                padding: '13px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                fontSize: 12,
                fontWeight: 600,
                color: '#5A5A58',
              }}
            >
              Upcoming Sessions
            </div>
            {[
              {
                name: 'Laura & Marc',
                type: 'Wedding',
                date: 'Mar 27',
                time: '10:00',
                color: '#C4A47C',
              },
              {
                name: 'Anna K.',
                type: 'Portrait',
                date: 'Apr 3',
                time: '14:00',
                color: '#3B82F6',
              },
              {
                name: 'TechCorp',
                type: 'Commercial',
                date: 'Apr 10',
                time: '09:00',
                color: '#10B981',
              },
              {
                name: 'Miller Family',
                type: 'Family',
                date: 'Apr 15',
                time: '16:00',
                color: '#F59E0B',
              },
            ].map(({ name, type, date, time, color }) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div
                  style={{
                    width: 4,
                    height: 38,
                    borderRadius: 2,
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#D0CCC8',
                    }}
                  >
                    {name}
                  </div>
                  <div style={{ fontSize: 11, color: '#4A4A48' }}>{type}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#D0CCC8',
                    }}
                  >
                    {date}
                  </div>
                  <div style={{ fontSize: 11, color: '#4A4A48' }}>{time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Slide>

      {/* ── SLIDE 7: EVERYTHING INCLUDED ──────────────────────────────── */}
      <Slide
        n={7}
        glow="radial-gradient(ellipse 70% 50% at 50% 50%, rgba(196,164,124,0.07) 0%, transparent 70%)"
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '120px 80px',
          }}
        >
          <p
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#C4A47C',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: 28,
              textAlign: 'center',
            }}
          >
            Everything included
          </p>
          <h2
            style={{
              fontSize: 80,
              fontWeight: 900,
              color: '#F0EDE8',
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              textAlign: 'center',
              marginBottom: 56,
            }}
          >
            One tool.
            <br />
            Every step covered.
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 14,
              width: '100%',
            }}
          >
            {[
              { icon: '📬', label: 'Inbox' },
              { icon: '📋', label: 'Forms' },
              { icon: '🖼️', label: 'Galleries' },
              { icon: '✍️', label: 'Contracts' },
              { icon: '📅', label: 'Bookings' },
              { icon: '💌', label: 'Email Templates' },
              { icon: '👥', label: 'Client CRM' },
              { icon: '📊', label: 'Analytics' },
              { icon: '💳', label: 'Invoices' },
            ].map(({ icon, label }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '16px 20px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span style={{ fontSize: 22 }}>{icon}</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#7A7A78' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Slide>

      {/* ── SLIDE 8: CTA ──────────────────────────────────────────────── */}
      <Slide
        n={8}
        glow="radial-gradient(ellipse 90% 60% at 50% 115%, rgba(196,164,124,0.18) 0%, transparent 65%)"
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '120px 80px',
          }}
        >
          <div style={{ fontSize: 88, marginBottom: 40 }}>📸</div>
          <h2
            style={{
              fontSize: 80,
              fontWeight: 900,
              color: '#F0EDE8',
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              textAlign: 'center',
              marginBottom: 28,
            }}
          >
            Run your studio
            <br />
            <span style={{ color: '#C4A47C' }}>like a pro.</span>
          </h2>
          <p
            style={{
              fontSize: 30,
              color: '#5A5A58',
              textAlign: 'center',
              lineHeight: 1.55,
              maxWidth: 720,
              marginBottom: 56,
            }}
          >
            Join 200+ photographers who simplified
            <br />
            their workflow with Fotonizer.
          </p>
          <div
            style={{
              padding: '20px 56px',
              background: '#C4A47C',
              borderRadius: 14,
              fontSize: 22,
              fontWeight: 800,
              color: '#1A1A18',
              letterSpacing: '-0.01em',
              marginBottom: 32,
            }}
          >
            Start for free →
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            {['Free to start', 'GDPR compliant', 'EU servers'].map((text) => (
              <div
                key={text}
                style={{ display: 'flex', alignItems: 'center', gap: 7 }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#10B981',
                  }}
                />
                <span style={{ fontSize: 16, color: '#4A4A48' }}>{text}</span>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 44,
              fontSize: 28,
              fontWeight: 800,
              color: '#3A3A38',
              letterSpacing: '0.01em',
            }}
          >
            fotonizer.com
          </div>
        </div>
      </Slide>
    </div>
  )
}
