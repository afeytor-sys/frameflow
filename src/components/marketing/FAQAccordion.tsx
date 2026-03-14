'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FAQItem {
  q: string
  a: string
}

const DEFAULT_ITEMS: FAQItem[] = [
  {
    q: 'Ist die E-Signatur in Deutschland rechtsgültig?',
    a: 'Ja. Fotonizer verwendet eine einfache elektronische Signatur (eES) gemäß eIDAS-Verordnung. Für Fotografieverträge ist diese Signaturform rechtlich anerkannt. Wir speichern Zeitstempel, IP-Adresse und das signierte PDF als Nachweis.',
  },
  {
    q: 'Was passiert, wenn ich mein Kundenlimit erreiche?',
    a: 'Du siehst ein freundliches Upgrade-Modal — keine Fehlermeldung. Du kannst bestehende Kunden weiterhin verwalten und erhältst eine direkte Möglichkeit, auf einen höheren Plan zu wechseln.',
  },
  {
    q: 'Können meine Kunden die Portale anderer Kunden sehen?',
    a: 'Nein. Jeder Kunde erhält einen einzigartigen, zufällig generierten Link (32 Zeichen). Ohne diesen Link ist kein Zugriff möglich. Portale sind vollständig voneinander isoliert.',
  },
  {
    q: 'Wie lange werden Fotos gespeichert?',
    a: 'Fotos werden in Supabase Storage (EU-Region) gespeichert, solange dein Account aktiv ist. Du kannst Galerien jederzeit deaktivieren oder löschen. Bei Kündigung hast du 30 Tage Zeit, deine Daten zu exportieren.',
  },
  {
    q: 'Kann ich meine eigene Domain verwenden?',
    a: 'Custom Domains sind im Studio-Plan (€39/mo) verfügbar. Damit können Kundenportale unter deiner eigenen Domain erscheinen, z.B. portal.deinstudio.de.',
  },
  {
    q: 'Wie kündige ich?',
    a: 'Jederzeit mit einem Klick im Billing-Bereich deines Dashboards. Keine Kündigungsfristen, keine versteckten Gebühren. Dein Account wechselt automatisch zum Free-Plan.',
  },
]

interface Props {
  items?: FAQItem[]
}

export default function FAQAccordion({ items = DEFAULT_ITEMS }: Props) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="bg-white rounded-[10px] border border-[#E4E1DC] overflow-hidden"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-[#F8F7F4] transition-colors"
          >
            <span
              className="text-[15px] font-semibold text-[#111110]"
              style={{ fontFamily: 'Satoshi, system-ui, sans-serif' }}
            >
              {item.q}
            </span>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-[#B0ACA6] flex-shrink-0 transition-transform duration-200',
                open === i && 'rotate-180'
              )}
            />
          </button>
          {open === i && (
            <div className="px-6 pb-5 border-t border-[#F2F0EC]">
              <p
                className="text-[14px] text-[#7A7670] leading-relaxed pt-4"
                style={{ fontFamily: 'Satoshi, system-ui, sans-serif' }}
              >
                {item.a}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
