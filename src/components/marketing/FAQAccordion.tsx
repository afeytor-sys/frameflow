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
    q: 'Is the e-signature legally valid?',
    a: 'Yes. Fotonizer uses a simple electronic signature (SES) in accordance with the eIDAS regulation. For photography contracts this signature form is legally recognized. We store timestamp, IP address and the signed PDF as proof.',
  },
  {
    q: 'Was passiert, wenn ich mein Kundenlimit erreiche?',
    a: 'You will see a friendly upgrade modal — no error message. You can continue to manage existing clients and get a direct option to upgrade to a higher plan.',
  },
  {
    q: 'Can my clients see other clients\' portals?',
    a: 'No. Each client receives a unique, randomly generated link (32 characters). Without this link, no access is possible. Portals are completely isolated from each other.',
  },
  {
    q: 'Wie lange werden Fotos gespeichert?',
    a: 'Photos are stored in Supabase Storage (EU region) as long as your account is active. You can deactivate or delete them at any time. Upon cancellation you have 30 days to export your data.',
  },
  {
    q: 'Kann ich meine eigene Domain verwenden?',
    a: 'Custom domains are available in the Studio plan (€39/mo). This allows client portals to appear under your own domain, e.g. portal.yourstudio.com.',
  },
  {
    q: 'How do I cancel?',
    a: 'Anytime with one click in the billing section of your dashboard. No notice periods, no hidden fees. Your account automatically switches to the Free plan.',
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
