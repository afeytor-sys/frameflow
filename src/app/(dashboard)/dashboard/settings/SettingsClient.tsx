'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Building2, Palette, Bell, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Photographer {
  id: string
  full_name: string | null
  email: string | null
  studio_name: string | null
  photography_types: string[] | null
  logo_url: string | null
  plan: string | null
  language: string | null
  bank_account_holder: string | null
  bank_name: string | null
  bank_iban: string | null
  bank_bic: string | null
}

interface Props {
  photographer: Photographer | null
  userId: string
}

const PHOTO_TYPES = [
  'Hochzeit', 'Portrait', 'Event', 'Commercial', 'Immobilien', 'Fine Art', 'Sport', 'Newborn', 'Familie',
]

const TABS = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'studio', label: 'Studio', icon: Building2 },
  { id: 'bank', label: 'Bankdaten', icon: CreditCard },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'notifications', label: 'Benachrichtigungen', icon: Bell },
]

export default function SettingsClient({ photographer, userId }: Props) {
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)

  // Profile form
  const [fullName, setFullName] = useState(photographer?.full_name || '')
  const [language, setLanguage] = useState(photographer?.language || 'de')
  const [photoTypes, setPhotoTypes] = useState<string[]>(photographer?.photography_types || [])

  // Studio form
  const [studioName, setStudioName] = useState(photographer?.studio_name || '')
  const [logoUrl, setLogoUrl] = useState(photographer?.logo_url || '')

  // Bank details form
  const [bankAccountHolder, setBankAccountHolder] = useState(photographer?.bank_account_holder || '')
  const [bankName, setBankName] = useState(photographer?.bank_name || '')
  const [bankIban, setBankIban] = useState(photographer?.bank_iban || '')
  const [bankBic, setBankBic] = useState(photographer?.bank_bic || '')

  const supabase = createClient()
  const plan = photographer?.plan || 'free'
  const isPaidPlan = ['starter', 'pro', 'studio'].includes(plan)

  const togglePhotoType = (type: string) => {
    setPhotoTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const saveProfile = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('photographers')
      .update({ full_name: fullName, language, photography_types: photoTypes })
      .eq('id', userId)
    setSaving(false)
    if (error) toast.error('Fehler beim Speichern')
    else toast.success('Profil gespeichert')
  }

  const saveStudio = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('photographers')
      .update({ studio_name: studioName, logo_url: logoUrl || null })
      .eq('id', userId)
    setSaving(false)
    if (error) toast.error('Fehler beim Speichern')
    else toast.success('Studio-Einstellungen gespeichert')
  }

  const saveBankDetails = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('photographers')
      .update({
        bank_account_holder: bankAccountHolder.trim() || null,
        bank_name: bankName.trim() || null,
        bank_iban: bankIban.trim().replace(/\s/g, '') || null,
        bank_bic: bankBic.trim() || null,
      })
      .eq('id', userId)
    setSaving(false)
    if (error) toast.error('Fehler beim Speichern')
    else toast.success('Bankdaten gespeichert ✓')
  }

  const uploadLogo = async (file: File) => {
    const ext = file.name.split('.').pop()
    const path = `logos/${userId}/logo.${ext}`
    const { error } = await supabase.storage.from('photos').upload(path, file, { upsert: true })
    if (error) { toast.error('Upload fehlgeschlagen'); return }
    const { data } = supabase.storage.from('photos').getPublicUrl(path)
    setLogoUrl(data.publicUrl)
    toast.success('Logo hochgeladen')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#1A1A1A]">Einstellungen</h1>
        <p className="text-sm text-[#6B6B6B] mt-1">Verwalte dein Profil und deine Studio-Einstellungen.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F0F0EC] rounded-xl p-1 flex-wrap">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-white text-[#1A1A1A] shadow-sm'
                  : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-[#E8E8E4] p-6 space-y-5">
          <h2 className="text-sm font-semibold text-[#1A1A1A]">Profil</h2>

          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Vollständiger Name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm text-[#1A1A1A] focus:border-[#C8A882] outline-none bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1">E-Mail</label>
            <input
              type="email"
              value={photographer?.email || ''}
              disabled
              className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm bg-[#FAFAF8] text-[#6B6B6B] cursor-not-allowed"
            />
            <p className="text-xs text-[#6B6B6B] mt-1">E-Mail kann nicht geändert werden.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-2">Sprache</label>
            <div className="flex gap-2">
              {[{ value: 'de', label: '🇩🇪 Deutsch' }, { value: 'en', label: '🇬🇧 English' }].map(lang => (
                <button
                  key={lang.value}
                  onClick={() => setLanguage(lang.value)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium border transition-all',
                    language === lang.value
                      ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                      : 'border-[#E8E8E4] text-[#6B6B6B] hover:border-[#1A1A1A]'
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-2">Fotografie-Typen</label>
            <div className="flex flex-wrap gap-2">
              {PHOTO_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => togglePhotoType(type)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    photoTypes.includes(type)
                      ? 'border-[#C8A882] bg-[#C8A882]/10 text-[#C8A882]'
                      : 'border-[#E8E8E4] text-[#6B6B6B] hover:border-[#C8A882]/50'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
          >
            {saving ? 'Speichern...' : 'Profil speichern'}
          </button>
        </div>
      )}

      {/* Studio tab */}
      {activeTab === 'studio' && (
        <div className="bg-white rounded-xl border border-[#E8E8E4] p-6 space-y-5">
          <h2 className="text-sm font-semibold text-[#1A1A1A]">Studio</h2>

          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Studio-Name</label>
            <input
              type="text"
              value={studioName}
              onChange={e => setStudioName(e.target.value)}
              placeholder="z.B. Lichtblick Photography"
              className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm text-[#1A1A1A] focus:border-[#C8A882] outline-none bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-2">Logo</label>
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-lg border border-[#E8E8E4] mb-3" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])}
              className="block text-sm text-[#6B6B6B] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#F0F0EC] file:text-[#1A1A1A] hover:file:bg-[#E8E8E4] cursor-pointer"
            />
          </div>

          <button
            onClick={saveStudio}
            disabled={saving}
            className="px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
          >
            {saving ? 'Speichern...' : 'Studio speichern'}
          </button>
        </div>
      )}

      {/* Bank details tab */}
      {activeTab === 'bank' && (
        <div className="bg-white rounded-xl border border-[#E8E8E4] p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-[#1A1A1A]">Bankverbindung</h2>
            <p className="text-xs text-[#6B6B6B] mt-1">
              Diese Daten erscheinen auf deinen Rechnungen, damit Kunden die Zahlung überweisen können.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#F0F0EC] border border-[#E8E8E4] flex items-start gap-2">
            <CreditCard className="w-4 h-4 text-[#C8A882] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#6B6B6B]">
              Deine Bankdaten werden <strong className="text-[#1A1A1A]">nur auf deinen Rechnungen</strong> angezeigt und niemals öffentlich geteilt.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1">
              Kontoinhaber <span className="text-[#E84C1A]">*</span>
            </label>
            <input
              type="text"
              value={bankAccountHolder}
              onChange={e => setBankAccountHolder(e.target.value)}
              placeholder="Max Mustermann"
              className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm text-[#1A1A1A] focus:border-[#C8A882] outline-none bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Bank</label>
            <input
              type="text"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              placeholder="z.B. Sparkasse Berlin"
              className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm text-[#1A1A1A] focus:border-[#C8A882] outline-none bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1">
              IBAN <span className="text-[#E84C1A]">*</span>
            </label>
            <input
              type="text"
              value={bankIban}
              onChange={e => setBankIban(e.target.value.toUpperCase())}
              placeholder="DE89 3704 0044 0532 0130 00"
              className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm text-[#1A1A1A] focus:border-[#C8A882] outline-none bg-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1">BIC / SWIFT</label>
            <input
              type="text"
              value={bankBic}
              onChange={e => setBankBic(e.target.value.toUpperCase())}
              placeholder="z.B. COBADEFFXXX"
              className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm text-[#1A1A1A] focus:border-[#C8A882] outline-none bg-white font-mono"
            />
          </div>

          {/* Preview */}
          {(bankAccountHolder || bankIban) && (
            <div className="p-4 rounded-lg border border-[#E8E8E4] bg-[#FAFAF8]">
              <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider mb-2">Vorschau auf Rechnung</p>
              <div className="space-y-1 text-sm">
                {bankAccountHolder && <p className="text-[#1A1A1A]"><span className="text-[#6B6B6B]">Kontoinhaber:</span> {bankAccountHolder}</p>}
                {bankName && <p className="text-[#1A1A1A]"><span className="text-[#6B6B6B]">Bank:</span> {bankName}</p>}
                {bankIban && <p className="text-[#1A1A1A] font-mono"><span className="text-[#6B6B6B] font-sans">IBAN:</span> {bankIban}</p>}
                {bankBic && <p className="text-[#1A1A1A] font-mono"><span className="text-[#6B6B6B] font-sans">BIC:</span> {bankBic}</p>}
              </div>
            </div>
          )}

          <button
            onClick={saveBankDetails}
            disabled={saving}
            className="px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
          >
            {saving ? 'Speichern...' : 'Bankdaten speichern'}
          </button>
        </div>
      )}

      {/* Branding tab */}
      {activeTab === 'branding' && (
        <div className="bg-white rounded-xl border border-[#E8E8E4] p-6 space-y-5">
          <h2 className="text-sm font-semibold text-[#1A1A1A]">Branding</h2>

          {!isPaidPlan ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 rounded-full bg-[#C8A882]/10 flex items-center justify-center mx-auto mb-3">
                <Palette className="w-5 h-5 text-[#C8A882]" />
              </div>
              <p className="text-sm font-medium text-[#1A1A1A] mb-1">Pro-Funktion</p>
              <p className="text-xs text-[#6B6B6B] mb-4">
                Eigenes Branding ist ab dem Pro-Plan verfügbar.
              </p>
              <a
                href="/dashboard/billing"
                className="inline-block px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors"
              >
                Auf Pro upgraden
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#FAFAF8] rounded-lg border border-[#E8E8E4]">
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">"Powered by Fotonizer" ausblenden</p>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">Entfernt den Fotonizer-Hinweis aus dem Kunden-Portal</p>
                </div>
                <div className="w-9 h-5 rounded-full bg-[#3DBA6F] relative cursor-pointer">
                  <div className="absolute top-0.5 left-4 w-4 h-4 bg-white rounded-full shadow" />
                </div>
              </div>
              <p className="text-xs text-[#6B6B6B]">
                Weitere Branding-Optionen (Primärfarbe, Custom Footer) folgen in einem Update.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Notifications tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-xl border border-[#E8E8E4] p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#1A1A1A]">Benachrichtigungen</h2>
          <p className="text-xs text-[#6B6B6B]">
            E-Mail-Benachrichtigungen werden automatisch gesendet für:
          </p>
          {[
            'Vertrag unterschrieben',
            'Galerie aufgerufen',
            'Zahlung fehlgeschlagen',
            'Abo-Änderungen',
          ].map(item => (
            <div key={item} className="flex items-center justify-between py-2 border-b border-[#E8E8E4] last:border-0">
              <span className="text-sm text-[#1A1A1A]">{item}</span>
              <div className="w-9 h-5 rounded-full bg-[#3DBA6F] relative">
                <div className="absolute top-0.5 left-4 w-4 h-4 bg-white rounded-full shadow" />
              </div>
            </div>
          ))}
          <p className="text-xs text-[#6B6B6B] pt-2">
            Granulare Benachrichtigungseinstellungen folgen in einem Update.
          </p>
        </div>
      )}
    </div>
  )
}
