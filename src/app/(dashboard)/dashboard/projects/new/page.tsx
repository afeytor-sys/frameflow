'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { generateToken } from '@/lib/utils'
import { ArrowLeft, Plus, X, UserPlus, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import { useLocale } from '@/hooks/useLocale'

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

const PROJECT_TYPES_DE = [
  { value: 'wedding', label: 'Hochzeit' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'event', label: 'Event' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'realEstate', label: 'Immobilien' },
  { value: 'fineArt', label: 'Fine Art' },
  { value: 'newborn', label: 'Newborn' },
  { value: 'family', label: 'Familie' },
  { value: 'other', label: 'Sonstiges' },
]

const SHOOTING_TYPES_EN = [
  { value: 'Wedding',    label: '💍 Wedding',    color: '#E879A0' },
  { value: 'Portrait',   label: '🧑 Portrait',   color: '#8B5CF6' },
  { value: 'Event',      label: '🎉 Event',      color: '#F59E0B' },
  { value: 'Commercial', label: '💼 Commercial', color: '#3B82F6' },
  { value: 'Real Estate',label: '🏠 Real Estate',color: '#10B981' },
  { value: 'Fine Art',   label: '🎨 Fine Art',   color: '#C4A47C' },
  { value: 'Sport',      label: '⚽ Sport',      color: '#EF4444' },
  { value: 'Newborn',    label: '👶 Newborn',    color: '#F97316' },
  { value: 'Family',     label: '👨‍👩‍👧 Family',    color: '#06B6D4' },
]

const SHOOTING_TYPES_DE = [
  { value: 'Wedding',    label: '💍 Hochzeit',   color: '#E879A0' },
  { value: 'Portrait',   label: '🧑 Portrait',   color: '#8B5CF6' },
  { value: 'Event',      label: '🎉 Event',      color: '#F59E0B' },
  { value: 'Commercial', label: '💼 Commercial', color: '#3B82F6' },
  { value: 'Real Estate',label: '🏠 Immobilien', color: '#10B981' },
  { value: 'Fine Art',   label: '🎨 Fine Art',   color: '#C4A47C' },
  { value: 'Sport',      label: '⚽ Sport',      color: '#EF4444' },
  { value: 'Newborn',    label: '👶 Newborn',    color: '#F97316' },
  { value: 'Family',     label: '👨‍👩‍👧 Familie',   color: '#06B6D4' },
]

const T = {
  en: {
    title: 'New project',
    subtitle: 'Create project and generate client portal',
    projectTitle: 'Project title',
    projectTitlePlaceholder: 'Wedding Anna & Max',
    client: 'Client',
    createNewClient: 'Create new client',
    cancel: 'Cancel',
    selectClient: 'Select client...',
    addNewClient: 'Add new client',
    name: 'Name',
    namePlaceholder: 'Jane Smith',
    email: 'E-Mail',
    phone: 'Phone',
    creating: 'Creating...',
    createClientBtn: 'Create client & select',
    shootingDate: 'Shooting date',
    projectType: 'Project type',
    select: 'Select...',
    shootingType: 'Shooting type',
    cancelBtn: 'Cancel',
    createProject: 'Create project',
    errorTitle: 'Title and client are required',
    errorCreating: 'Error creating project',
    successCreated: 'Project created!',
    errorClientName: 'Name is required',
    errorCreatingClient: 'Error creating client',
    // Plan limit
    limitTitle: 'Project limit reached',
    limitDesc: (count: number, max: number, plan: string) =>
      `You have used ${count} of ${max} projects on the ${plan} plan.`,
    limitUpgrade: 'Upgrade to Starter or Pro for more projects.',
    back: 'Back',
    upgradeNow: 'Upgrade now →',
  },
  de: {
    title: 'Neues Projekt',
    subtitle: 'Projekt erstellen und Kundenportal generieren',
    projectTitle: 'Projekttitel',
    projectTitlePlaceholder: 'Hochzeit Anna & Max',
    client: 'Kunde',
    createNewClient: 'Neuen Kunden erstellen',
    cancel: 'Abbrechen',
    selectClient: 'Kunde auswählen...',
    addNewClient: 'Neuen Kunden hinzufügen',
    name: 'Name',
    namePlaceholder: 'Jane Smith',
    email: 'E-Mail',
    phone: 'Telefon',
    creating: 'Wird erstellt...',
    createClientBtn: 'Kunde erstellen & auswählen',
    shootingDate: 'Shooting-Datum',
    projectType: 'Projekttyp',
    select: 'Auswählen...',
    shootingType: 'Shooting-Typ',
    cancelBtn: 'Abbrechen',
    createProject: 'Projekt erstellen',
    errorTitle: 'Titel und Kunde sind erforderlich',
    errorCreating: 'Fehler beim Erstellen des Projekts',
    successCreated: 'Projekt erstellt!',
    errorClientName: 'Name ist erforderlich',
    errorCreatingClient: 'Fehler beim Erstellen des Kunden',
    // Plan limit
    limitTitle: 'Projektlimit erreicht',
    limitDesc: (count: number, max: number, plan: string) =>
      `Du hast ${count} von ${max} Projekten im ${plan}-Plan verwendet.`,
    limitUpgrade: 'Upgrade auf Starter oder Pro für mehr Projekte.',
    back: 'Zurück',
    upgradeNow: 'Jetzt upgraden →',
  },
}

export default function NewProjectPage() {
  const locale = useLocale()
  const t = T[locale]
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClient = searchParams.get('client')
  const { canCreateProject, projectCount, limits, plan, loading: limitsLoading } = usePlanLimits()

  const PROJECT_TYPES = locale === 'de' ? PROJECT_TYPES_DE : PROJECT_TYPES_EN
  const SHOOTING_TYPES = locale === 'de' ? SHOOTING_TYPES_DE : SHOOTING_TYPES_EN

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
    shooting_type: '',
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
      toast.error(t.errorClientName)
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
      toast.error(t.errorCreatingClient)
      setCreatingClient(false)
      return
    }

    toast.success(`${data.full_name} ${locale === 'de' ? 'erstellt!' : 'created!'}`)
    await fetchClients()
    setForm((prev) => ({ ...prev, client_id: data.id }))
    setNewClient({ full_name: '', email: '', phone: '' })
    setShowNewClient(false)
    setCreatingClient(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.client_id) {
      toast.error(t.errorTitle)
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
        shooting_type: form.shooting_type || null,
        status: 'booked',
        client_token: token,
        client_url: `${appUrl}/client/${token}`,
      })
      .select()
      .single()

    if (error) {
      toast.error(t.errorCreating)
      setLoading(false)
      return
    }

    toast.success(t.successCreated)
    router.push(`/dashboard/projects/${data.id}`)
  }

  const inputClass = 'input-base w-full'

  // ── Plan limit block ──
  if (!limitsLoading && !canCreateProject) {
    return (
      <div className="space-y-6 animate-in">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/projects" className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E4E1DC] text-[#7A7670] hover:bg-[#F2F0EC] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="font-semibold text-[#111110]" style={{ fontSize: '24px', letterSpacing: '-0.03em' }}>
            {t.title}
          </h1>
        </div>
        <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(196,164,124,0.12)' }}>
            <Lock className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="font-black text-[18px] mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            {t.limitTitle}
          </h2>
          <p className="text-[13.5px] mb-1" style={{ color: 'var(--text-muted)' }}>
            {t.limitDesc(projectCount, limits.maxGalleries ?? 0, plan.charAt(0).toUpperCase() + plan.slice(1))}
          </p>
          <p className="text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>
            {t.limitUpgrade}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/projects" className="px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
              {t.back}
            </Link>
            <Link href="/dashboard/billing" className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90" style={{ background: 'var(--accent)' }}>
              {t.upgradeNow}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/projects" className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors" style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1
            className="font-semibold"
            style={{ fontFamily: 'Clash Display, system-ui, sans-serif', fontSize: '24px', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}
          >
            {t.title}
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t.subtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="modal-glass rounded-2xl p-6 space-y-5">

        {/* Title */}
        <div>
          <label className="block text-[12px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
            {t.projectTitle} <span className="text-[#C94030]">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            placeholder={t.projectTitlePlaceholder}
            className={inputClass}
          />
        </div>

        {/* Client selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[12px] font-semibold text-[#111110] uppercase tracking-wide">
              {t.client} <span className="text-[#C94030]">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowNewClient(!showNewClient)}
              className="flex items-center gap-1 text-[12px] font-semibold transition-colors" style={{ color: 'var(--accent)' }}
            >
              {showNewClient ? (
                <><X className="w-3 h-3" /> {t.cancel}</>
              ) : (
                <><UserPlus className="w-3 h-3" /> {t.createNewClient}</>
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
              <option value="">{t.selectClient}</option>
              {clients.map(({ id, full_name }) => (
                <option key={id} value={id}>{full_name}</option>
              ))}
            </select>
          )}

          {/* Inline new client form */}
          {showNewClient && (
            <div className="rounded-lg p-4 space-y-3" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-hover)' }}>
              <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t.addNewClient}</p>

              <div>
                <label className="block text-[11px] font-semibold mb-1 uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
                  {t.name} <span className="text-[#C94030]">*</span>
                </label>
                <input
                  type="text"
                  value={newClient.full_name}
                  onChange={(e) => setNewClient(p => ({ ...p, full_name: e.target.value }))}
                  placeholder={t.namePlaceholder}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1 uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>{t.email}</label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient(p => ({ ...p, email: e.target.value }))}
                    placeholder="anna@email.de"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1 uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>{t.phone}</label>
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
                {creatingClient ? t.creating : t.createClientBtn}
              </button>
            </div>
          )}
        </div>

        {/* Date + Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>{t.shootingDate}</label>
            <input type="date" name="shoot_date" value={form.shoot_date} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>{t.projectType}</label>
            <select name="project_type" value={form.project_type} onChange={handleChange} className={inputClass}>
              <option value="">{t.select}</option>
              {PROJECT_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Shooting type */}
        <div>
          <label className="block text-[12px] font-semibold text-[#111110] mb-2 uppercase tracking-wide">
            {t.shootingType}
          </label>
          <div className="flex flex-wrap gap-2">
            {SHOOTING_TYPES.map(({ value, label, color }) => {
              const selected = form.shooting_type === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, shooting_type: selected ? '' : value }))}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all"
                  style={{
                    background: selected ? color + '18' : 'transparent',
                    borderColor: selected ? color : 'var(--border-color)',
                    color: selected ? color : 'var(--text-muted)',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/dashboard/projects"
            className="px-4 py-2.5 rounded-md text-[13px] font-semibold transition-colors" style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
          >
            {t.cancelBtn}
          </Link>
          <button
            type="submit"
            disabled={loading || showNewClient}
            className="flex-1 py-2.5 rounded-md bg-[#111110] text-[#F8F7F4] text-[13px] font-semibold hover:bg-[#1E1E1C] transition-colors disabled:opacity-50"
          >
            {loading ? t.creating : t.createProject}
          </button>
        </div>
      </form>
    </div>
  )
}
