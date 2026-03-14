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
    { key: 'email',    label: 'E-Mail des Kunden eingetragen',  done: hasClientEmail,  hint: 'Gehe zu Kunden → E-Mail hinzufügen' },
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
      <div className="flex items-center gap-3 px-4 py-3 bg-[#2A9B68]/6 border border-[#2A9B68]/20 rounded-xl">
        <CheckCircle2 className="w-4 h-4 text-[#2A9B68] flex-shrink-0" />
        <p className="text-[13px] font-medium text-[#2A9B68]">Portal bereit zum Versand — alles vollständig ✓</p>
      </div>
    )
  }

  return (
    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F7F7F5] transition-colors"
      >
        <AlertCircle className="w-4 h-4 text-[#CC8415] flex-shrink-0" />
        <div className="flex-1 text-left">
          <p className="text-[13px] font-semibold text-[#111827]">
            Portal-Checkliste — {doneCount}/{total} erledigt
          </p>
          {/* Progress bar */}
          <div className="mt-1.5 h-1 bg-[#E5E7EB] rounded-full overflow-hidden w-48">
            <div
              className="h-full bg-[#C4A47C] rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-[#9CA3AF] flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-[#9CA3AF] flex-shrink-0" />
        }
      </button>

      {/* Items */}
      {expanded && (
        <div className="border-t border-[#E5E7EB] divide-y divide-[#F3F4F6]">
          {items.map(({ key, label, done, hint }) => (
            <div key={key} className="flex items-start gap-3 px-4 py-2.5">
              {done
                ? <CheckCircle2 className="w-4 h-4 text-[#2A9B68] flex-shrink-0 mt-0.5" />
                : <Circle className="w-4 h-4 text-[#D1D5DB] flex-shrink-0 mt-0.5" />
              }
              <div>
                <p className={`text-[13px] font-medium ${done ? 'text-[#4B5563] line-through' : 'text-[#111827]'}`}>
                  {label}
                </p>
                {!done && hint && (
                  <p className="text-[11.5px] text-[#9CA3AF] mt-0.5">{hint}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
