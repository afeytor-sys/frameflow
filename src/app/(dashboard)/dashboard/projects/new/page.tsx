'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn, generateToken } from '@/lib/utils'
import { ArrowLeft, Plus, X, UserPlus } from 'lucide-react'
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
  const [showNewClient, setShowNewClient] = useState(false)
  const [creatingClient, setCreatingClient] = useState(false)
  const [newClient, setNewClient] = useState({ full_name: '', email: '', phone: '' })

  const [form, setForm] = useState({
    title: '',
    client_id: preselectedClient || '',
    shoot_date: '',
    project_type: '',
  })

  const fetchClients = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('clients')
      .select('id, full_name')
      .order('full_name')
    setClients(data || [])
  }

  useEffect(() => { fetchClients() }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleCreateClient = async () => {
    if (!newClient.full_name.trim()) {
      toast.error('Name ist erforderlich')
      return
    }
    setCreatingClient(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('clients')
      .insert({
        photographer_id: user!.id,
        full_name: newClient.full_name.trim(),
        email: newClient.email.trim() || null,
        phone: newClient.phone.trim() || null,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      toast.error('Fehler beim Erstellen des Kunden')
      setCreatingClient(false)
      return
    }

    toast.success(`${data.full_name} erstellt!`)
    await fetchClients()
    setForm((prev) => ({ ...prev, client_id: data.id }))
    setNewClient({ full_name: '', email: '', phone: '' })
    setShowNewClient(false)
    setCreatingClient(false)
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
        status: 'booked',
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
    'border-[#E4E1DC] focus:border-[#111110] focus:ring-2 focus:ring-[#111110]/10',
    'outline-none transition-all bg-white text-[#111110] placeholder-[#B0ACA6]'
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/projects" className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E4E1DC] text-[#7A7670] hover:bg-[#F2F0EC] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1
            className="font-semibold text-[#111110]"
            style={{ fontFamily: 'Clash Display, system-ui, sans-serif', fontSize: '24px', letterSpacing: '-0.03em' }}
          >
            Neues Projekt
          </h1>
          <p className="text-[#7A7670] text-[13px]">Projekt erstellen und Kunden-Portal generieren</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-[10px] border border-[#E4E1DC] p-6 space-y-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

        {/* Title */}
        <div>
          <label className="block text-[12px] font-semibold text-[#111110] mb-1.5 uppercase tracking-wide">
            Projekttitel <span className="text-[#C94030]">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            placeholder="Hochzeit Anna & Max"
            className={inputClass}
          />
        </div>

        {/* Client selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[12px] font-semibold text-[#111110] uppercase tracking-wide">
              Kunde <span className="text-[#C94030]">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowNewClient(!showNewClient)}
              className="flex items-center gap-1 text-[12px] font-semibold text-[#C8A882] hover:text-[#B8966E] transition-colors"
            >
              {showNewClient ? (
                <><X className="w-3 h-3" /> Abbrechen</>
              ) : (
                <><UserPlus className="w-3 h-3" /> Neuen Kunden erstellen</>
              )}
            </button>
          </div>

          {/* Existing client dropdown */}
          {!showNewClient && (
            <select
              name="client_id"
              value={form.client_id}
              onChange={handleChange}
              required
              className={inputClass}
            >
              <option value="">Kunden auswählen...</option>
              {clients.map(({ id, full_name }) => (
                <option key={id} value={id}>{full_name}</option>
              ))}
            </select>
          )}

          {/* Inline new client form */}
          {showNewClient && (
            <div className="rounded-lg border border-[#C8A882]/30 bg-[#C8A882]/5 p-4 space-y-3">
              <p className="text-[12px] font-semibold text-[#7A7670] uppercase tracking-wide">Neuen Kunden anlegen</p>

              <div>
                <label className="block text-[11px] font-semibold text-[#111110] mb-1 uppercase tracking-wide">
                  Name <span className="text-[#C94030]">*</span>
                </label>
                <input
                  type="text"
                  value={newClient.full_name}
                  onChange={(e) => setNewClient(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Anna Müller"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111110] mb-1 uppercase tracking-wide">E-Mail</label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient(p => ({ ...p, email: e.target.value }))}
                    placeholder="anna@email.de"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#111110] mb-1 uppercase tracking-wide">Telefon</label>
                  <input
                    type="tel"
                    value={newClient.phone}
                    onChange={(e) => setNewClient(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+49 123 456789"
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateClient}
                disabled={creatingClient || !newClient.full_name.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#111110] text-[#F8F7F4] text-[13px] font-semibold rounded-md hover:bg-[#1E1E1C] disabled:opacity-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {creatingClient ? 'Wird erstellt...' : 'Kunden erstellen & auswählen'}
              </button>
            </div>
          )}
        </div>

        {/* Date + Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#111110] mb-1.5 uppercase tracking-wide">Shooting-Datum</label>
            <input type="date" name="shoot_date" value={form.shoot_date} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#111110] mb-1.5 uppercase tracking-wide">Projekt-Typ</label>
            <select name="project_type" value={form.project_type} onChange={handleChange} className={inputClass}>
              <option value="">Auswählen...</option>
              {PROJECT_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/dashboard/projects"
            className="px-4 py-2.5 rounded-md border border-[#E4E1DC] text-[13px] font-semibold text-[#7A7670] hover:bg-[#F2F0EC] transition-colors"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={loading || showNewClient}
            className="flex-1 py-2.5 rounded-md bg-[#111110] text-[#F8F7F4] text-[13px] font-semibold hover:bg-[#1E1E1C] transition-colors disabled:opacity-50"
          >
            {loading ? 'Wird erstellt...' : 'Projekt erstellen'}
          </button>
        </div>
      </form>
    </div>
  )
}
