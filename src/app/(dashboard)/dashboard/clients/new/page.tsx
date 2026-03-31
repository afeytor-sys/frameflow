'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ArrowLeft, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import { useLocale } from '@/hooks/useLocale'

const PROJECT_TYPES_DE = [
  { value: 'wedding', label: 'Hochzeit' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'event', label: 'Event' },
  { value: 'commercial', label: 'Kommerziell' },
  { value: 'realEstate', label: 'Immobilien' },
  { value: 'fineArt', label: 'Fine Art' },
  { value: 'newborn', label: 'Neugeborene' },
  { value: 'family', label: 'Familie' },
  { value: 'other', label: 'Sonstiges' },
]

const PROJECT_TYPES_EN = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'event', label: 'Event' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'realEstate', label: 'Real Estate' },
  { value: 'fineArt', label: 'Fine Art' },
  { value: 'newborn', label: 'Newborn' },
  { value: 'family', label: 'Family' },
  { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS_DE = [
  { value: 'lead', label: 'Interessent' },
  { value: 'active', label: 'Aktiv' },
  { value: 'delivered', label: 'Geliefert' },
  { value: 'archived', label: 'Archiviert' },
]

const STATUS_OPTIONS_EN = [
  { value: 'lead', label: 'Lead' },
  { value: 'active', label: 'Active' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'archived', label: 'Archived' },
]

export default function NewClientPage() {
  const router = useRouter()
  const locale = useLocale()
  const de = locale === 'de'
  const PROJECT_TYPES = de ? PROJECT_TYPES_DE : PROJECT_TYPES_EN
  const STATUS_OPTIONS = de ? STATUS_OPTIONS_DE : STATUS_OPTIONS_EN
  const { canCreateClient, clientCount, limits, plan, loading: limitsLoading } = usePlanLimits()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    shoot_date: '',
    location: '',
    project_type: '',
    notes: '',
    status: 'lead',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name.trim()) {
      toast.error('Name is required')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('clients')
      .insert({
        photographer_id: user!.id,
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        shoot_date: form.shoot_date || null,
        location: form.location.trim() || null,
        project_type: form.project_type || null,
        notes: form.notes.trim() || null,
        status: form.status,
      })
      .select()
      .single()

    if (error) {
      toast.error('Error creating client')
      setLoading(false)
      return
    }

    toast.success('Client created!')
    router.push(`/dashboard/clients/${data.id}`)
  }

  const inputClass = 'input-base w-full'

  // ── Plan limit block ──
  if (!limitsLoading && !canCreateClient) {
    return (
      <div className="space-y-6 animate-in">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/clients" className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E8E8E4] text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F0F0EC] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="font-display text-2xl font-semibold text-[#1A1A1A]">{de ? 'Neuer Kunde' : 'New Client'}</h1>
        </div>
        <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(196,164,124,0.12)' }}>
            <Lock className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="font-black text-[18px] mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            {de ? 'Kundenlimit erreicht' : 'Client limit reached'}
          </h2>
          <p className="text-[13.5px] mb-1" style={{ color: 'var(--text-muted)' }}>
            {de
              ? <>{`Du hast `}<strong>{clientCount}</strong>{` von `}<strong>{limits.maxClients}</strong>{` Kunden im `}<strong>{plan.charAt(0).toUpperCase() + plan.slice(1)}</strong>{`-Plan verwendet.`}</>
              : <>You have used <strong>{clientCount}</strong> of <strong>{limits.maxClients}</strong> clients on the <strong>{plan.charAt(0).toUpperCase() + plan.slice(1)}</strong> plan.</>
            }
          </p>
          <p className="text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>
            {de ? 'Upgrade auf Starter oder Pro für mehr Kunden.' : 'Upgrade to Starter or Pro for more clients.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/clients" className="px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
              {de ? 'Zurück' : 'Back'}
            </Link>
            <Link href="/dashboard/billing" className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90" style={{ background: 'var(--accent)' }}>
              {de ? 'Jetzt upgraden →' : 'Upgrade now →'}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/clients"
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors" style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{de ? 'Neuer Kunde' : 'New Client'}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{de ? 'Kundendaten eingeben' : 'Enter client details'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="modal-glass rounded-2xl p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            {de ? 'Vollständiger Name' : 'Full Name'} <span className="text-[#E84C1A]">*</span>
          </label>
          <input
            type="text"
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            required
            placeholder="Anna Smith"
            className={inputClass}
          />
        </div>

        {/* Email + Phone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>E-Mail</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="anna@beispiel.de"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{de ? 'Telefon' : 'Phone'}</label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+49 123 456789"
              className={inputClass}
            />
          </div>
        </div>

        {/* Shoot date + Location */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{de ? 'Shooting-Datum' : 'Shoot Date'}</label>
            <input
              type="date"
              name="shoot_date"
              value={form.shoot_date}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{de ? 'Ort' : 'Location'}</label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Berlin, Studio"
              className={inputClass}
            />
          </div>
        </div>

        {/* Project type + Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{de ? 'Projekt-Typ' : 'Project Type'}</label>
            <select
              name="project_type"
              value={form.project_type}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">Select...</option>
              {PROJECT_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className={inputClass}
            >
              {STATUS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{de ? 'Notizen' : 'Notes'}</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            placeholder={de ? 'Interne Notizen zum Kunden...' : 'Internal notes about client...'}
            className={cn(inputClass, 'resize-none')}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/dashboard/clients"
            className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors" style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
          >
            {de ? 'Abbrechen' : 'Cancel'}
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50" style={{ background: 'var(--text-primary)', color: 'var(--bg-surface)' }}
          >
            {loading ? (de ? 'Wird erstellt...' : 'Creating...') : (de ? 'Kunden erstellen' : 'Create client')}
          </button>
        </div>
      </form>
    </div>
  )
}
