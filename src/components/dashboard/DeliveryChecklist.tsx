'use client'

import { CheckCircle2, Circle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface CheckItem {
  key: string
  label: string
  done: boolean
  hint?: string
}

interface Props {
  hasContract: boolean
  contractSent: boolean
  hasPhotos: boolean
  hasTimeline?: boolean
  hasShootDate: boolean
  hasClientEmail: boolean
}

export default function DeliveryChecklist({
  hasContract,
  contractSent,
  hasPhotos,
  hasShootDate,
  hasClientEmail,
}: Props) {
  const [expanded, setExpanded] = useState(false)

  const items: CheckItem[] = [
    { key: 'email',    label: 'Client email entered',  done: hasClientEmail,  hint: 'Go to Clients → Add email' },
    { key: 'date',     label: 'Shooting-Datum festgelegt',       done: hasShootDate,    hint: 'Datum im Projekt eintragen' },
    { key: 'contract', label: 'Vertrag erstellt',                done: hasContract,     hint: 'Vertrag-Tab → Neuen Vertrag erstellen' },
    { key: 'sent',     label: 'Vertrag an Kunden gesendet',      done: contractSent,    hint: 'Vertrag-Tab → An Kunden senden' },
    { key: 'photos',   label: 'Mindestens 1 Foto hochgeladen',   done: hasPhotos,       hint: 'Galerie-Tab → Fotos hochladen' },
  ]

  const doneCount = items.filter(i => i.done).length
  const total = items.length
  const allDone = doneCount === total
  const pct = Math.round((doneCount / total) * 100)

  if (allDone) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(42,155,104,0.08)', border: '1px solid rgba(42,155,104,0.20)' }}>
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#2A9B68' }} />
        <p className="text-[13px] font-medium" style={{ color: '#2A9B68' }}>Portal ready to send — everything completedig ✓</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
        style={{ background: 'var(--bg-surface)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
      >
        <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#CC8415' }} />
        <div className="flex-1 text-left">
          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Portal-Checkliste — {doneCount}/{total} erledigt
          </p>
          {/* Progress bar */}
          <div className="mt-1.5 h-1 rounded-full overflow-hidden w-48" style={{ background: 'var(--border-color)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: '#C4A47C' }}
            />
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
        }
      </button>

      {/* Items */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-color)' }}>
          {items.map(({ key, label, done, hint }) => (
            <div key={key} className="flex items-start gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--border-color)' }}>
              {done
                ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#2A9B68' }} />
                : <Circle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--border-strong)' }} />
              }
              <div>
                <p className="text-[13px] font-medium" style={{ color: done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none' }}>
                  {label}
                </p>
                {!done && hint && (
                  <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{hint}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
