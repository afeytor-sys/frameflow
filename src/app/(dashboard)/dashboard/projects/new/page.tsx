'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn, generateToken } from '@/lib/utils'
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

export default function NewProjectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClient = searchParams.get('client')

  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([])
  const [form, setForm] = useState({
    title: '',
    client_id: preselectedClient || '',
    shoot_date: '',
    project_type: '',
  })

  useEffect(() => {
    const fetchClients = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('clients')
        .select('id, full_name')
        .order('full_name')
      setClients(data || [])
    }
    fetchClients()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.client_id) {
      toast.error('Titel und Kunde sind erforderlich')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const token = generateToken(32)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin

    const { data, error } = await supabase
      .from('projects')
      .insert({
        photographer_id: user!.id,
        client_id: form.client_id,
        title: form.title.trim(),
        shoot_date: form.shoot_date || null,
        project_type: form.project_type || null,
        status: 'draft',
        client_token: token,
        client_url: `${appUrl}/client/${token}`,
      })
      .select()
      .single()

    if (error) {
      toast.error('Fehler beim Erstellen des Projekts')
      setLoading(false)
      return
    }

    toast.success('Projekt erstellt!')
    router.push(`/dashboard/projects/${data.id}`)
  }

  const inputClass = cn(
    'w-full px-3.5 py-2.5 rounded-lg border text-sm',
    'border-[#E8E8E4] focus:border-[#C8A882] focus:ring-2 focus:ring-[#C8A882]/20',
    'outline-none transition-all bg-white text-[#1A1A1A] placeholder-[#6B6B6B]'
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/projects" className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E8E8E4] text-[#6B6B6B] hover:bg-[#F0F0EC] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#1A1A1A]">Neues Projekt</h1>
          <p className="text-[#6B6B6B] text-sm">Projekt erstellen und Kunden-Portal generieren</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#E8E8E4] p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            Projekttitel <span className="text-[#E84C1A]">*</span>
          </label>
          <input type="text" name="title" value={form.title} onChange={handleChange} required placeholder="Hochzeit Anna & Max" className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            Kunde <span className="text-[#E84C1A]">*</span>
          </label>
          <select name="client_id" value={form.client_id} onChange={handleChange} required className={inputClass}>
            <option value="">Kunden auswählen...</option>
            {clients.map(({ id, full_name }) => (
              <option key={id} value={id}>{full_name}</option>
            ))}
          </select>
          {clients.length === 0 && (
            <p className="text-xs text-[#6B6B6B] mt-1.5">
              <Link href="/dashboard/clients/new" className="text-[#C8A882] hover:underline">Zuerst einen Kunden erstellen</Link>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Shooting-Datum</label>
            <input type="date" name="shoot_date" value={form.shoot_date} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Projekt-Typ</label>
            <select name="project_type" value={form.project_type} onChange={handleChange} className={inputClass}>
              <option value="">Auswählen...</option>
              {PROJECT_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Link href="/dashboard/projects" className="px-4 py-2.5 rounded-lg border border-[#E8E8E4] text-sm font-medium text-[#6B6B6B] hover:bg-[#F0F0EC] transition-colors">
            Abbrechen
          </Link>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#2A2A2A] transition-colors disabled:opacity-50">
            {loading ? 'Wird erstellt...' : 'Projekt erstellen'}
          </button>
        </div>
      </form>
    </div>
  )
}
