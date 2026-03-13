'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const PROJECT_TYPES = [
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

const STATUS_OPTIONS = [
  { value: 'lead', label: 'Interessent' },
  { value: 'active', label: 'Aktiv' },
  { value: 'delivered', label: 'Geliefert' },
  { value: 'archived', label: 'Archiviert' },
]

export default function NewClientPage() {
  const router = useRouter()
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
      toast.error('Name ist erforderlich')
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
      toast.error('Fehler beim Erstellen des Kunden')
      setLoading(false)
      return
    }

    toast.success('Kunde erstellt!')
    router.push(`/dashboard/clients/${data.id}`)
  }

  const inputClass = cn(
    'w-full px-3.5 py-2.5 rounded-lg border text-sm',
    'border-[#E8E8E4] focus:border-[#C8A882] focus:ring-2 focus:ring-[#C8A882]/20',
    'outline-none transition-all bg-white text-[#1A1A1A] placeholder-[#6B6B6B]'
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/clients"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E8E8E4] text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F0F0EC] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#1A1A1A]">Neuer Kunde</h1>
          <p className="text-[#6B6B6B] text-sm">Kundendaten eingeben</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#E8E8E4] p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            Vollständiger Name <span className="text-[#E84C1A]">*</span>
          </label>
          <input
            type="text"
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            required
            placeholder="Anna Müller"
            className={inputClass}
          />
        </div>

        {/* Email + Phone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">E-Mail</label>
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
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Telefon</label>
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
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Shooting-Datum</label>
            <input
              type="date"
              name="shoot_date"
              value={form.shoot_date}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Ort</label>
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
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Projekt-Typ</label>
            <select
              name="project_type"
              value={form.project_type}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">Auswählen...</option>
              {PROJECT_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Status</label>
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
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Notizen</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Interne Notizen zum Kunden..."
            className={cn(inputClass, 'resize-none')}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/dashboard/clients"
            className="px-4 py-2.5 rounded-lg border border-[#E8E8E4] text-sm font-medium text-[#6B6B6B] hover:bg-[#F0F0EC] transition-colors"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
          >
            {loading ? 'Wird erstellt...' : 'Kunde erstellen'}
          </button>
        </div>
      </form>
    </div>
  )
}
