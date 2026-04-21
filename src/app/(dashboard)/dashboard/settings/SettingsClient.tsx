'use client'

import { useLocale } from '@/hooks/useLocale'
import { dashboardT } from '@/lib/dashboardTranslations'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Building2, Palette, Bell, CreditCard, Zap, Link2, Mail, Calendar, CheckCircle2, XCircle, Receipt } from 'lucide-react'
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
  // invoice extended profile
  company_name: string | null
  address_street: string | null
  address_zip: string | null
  address_city: string | null
  address_country: string | null
  phone: string | null
  website: string | null
  tax_number: string | null
  tax_status: string | null
  invoice_prefix: string | null
  invoice_start_number: number | null
  last_invoice_number: number | null
  slug?: string | null
}

interface Props {
  photographer: Photographer | null
  userId: string
}

const PHOTO_TYPES = [
  'Hochzeit', 'Portrait', 'Event', 'Commercial', 'Immobilien', 'Fine Art', 'Sport', 'Newborn', 'Familie',
]

export default function SettingsClient({ photographer, userId }: Props) {
  const locale = useLocale()
  const ts = dashboardT(locale).settingsPage
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

  // Invoice / Rechnung profile
  const [companyName, setCompanyName] = useState(photographer?.company_name || '')
  const [addressStreet, setAddressStreet] = useState(photographer?.address_street || '')
  const [addressZip, setAddressZip] = useState(photographer?.address_zip || '')
  const [addressCity, setAddressCity] = useState(photographer?.address_city || '')
  const [addressCountry, setAddressCountry] = useState(photographer?.address_country || 'Deutschland')
  const [phoneNum, setPhoneNum] = useState(photographer?.phone || '')
  const [website, setWebsite] = useState(photographer?.website || '')
  const [taxNumber, setTaxNumber] = useState(photographer?.tax_number || '')
  const [taxStatus, setTaxStatus] = useState<string>(photographer?.tax_status || 'kleinunternehmer')

  // Invoice numbering
  const [invoicePrefix, setInvoicePrefix] = useState(photographer?.invoice_prefix ?? '')
  const [invoiceStartNumber, setInvoiceStartNumber] = useState(String(photographer?.invoice_start_number ?? 1))

  // Automation settings
  const [autoSettings, setAutoSettings] = useState({
    email_portal_created: true,
    email_contract_sent: true,
    email_gallery_delivered: true,
    reminder_7d: true,
    reminder_1d: true,
  })
  const [autoLoaded, setAutoLoaded] = useState(false)

  // Booking slug
  const [bookingSlug, setBookingSlug] = useState((photographer as (Photographer & { slug?: string | null }) | null)?.slug ?? '')
  const [slugSaving, setSlugSaving] = useState(false)

  // Integrations state
  const [notifEmail, setNotifEmail] = useState('')
  const [googleConnected, setGoogleConnected] = useState(false)
  const [integrationsLoaded, setIntegrationsLoaded] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  // Notification settings (in-app + email for photographer)
  const [notifSettings, setNotifSettings] = useState({
    notify_inapp_new_booking: true,
    notify_email_new_booking: true,
    auto_invoice_on_complete: true,
    notify_inapp_new_inquiry: true,
    notify_email_new_inquiry: true,
    notify_inapp_contract_signed: true,
    notify_email_contract_signed: true,
    notify_inapp_gallery_viewed: true,
    notify_email_gallery_viewed: false,
    notify_inapp_questionnaire: true,
    notify_email_questionnaire: true,
    notify_inapp_photo_downloaded: true,
    notify_email_photo_downloaded: false,
    notify_inapp_gallery_downloaded: true,
    notify_email_gallery_downloaded: true,
    notify_inapp_favorite_marked: true,
    notify_email_favorite_marked: false,
    notify_email_shoot_reminder_photographer: true,
  })
  const [notifLoaded, setNotifLoaded] = useState(false)

  const supabase = createClient()
  useEffect(() => {
    supabase
      .from('automation_settings')
      .select('*')
      .eq('photographer_id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setAutoSettings({
            email_portal_created: data.email_portal_created ?? true,
            email_contract_sent: data.email_contract_sent ?? true,
            email_gallery_delivered: data.email_gallery_delivered ?? true,
            reminder_7d: data.reminder_7d ?? true,
            reminder_1d: data.reminder_1d ?? true,
          })
          setNotifSettings({
            notify_inapp_new_booking: data.notify_inapp_new_booking ?? true,
            notify_email_new_booking: data.notify_email_new_booking ?? true,
            auto_invoice_on_complete: data.auto_invoice_on_complete ?? true,
            notify_inapp_new_inquiry: data.notify_inapp_new_inquiry ?? true,
            notify_email_new_inquiry: data.notify_email_new_inquiry ?? true,
            notify_inapp_contract_signed: data.notify_inapp_contract_signed ?? true,
            notify_email_contract_signed: data.notify_email_contract_signed ?? true,
            notify_inapp_gallery_viewed: data.notify_inapp_gallery_viewed ?? true,
            notify_email_gallery_viewed: data.notify_email_gallery_viewed ?? false,
            notify_inapp_questionnaire: data.notify_inapp_questionnaire ?? true,
            notify_email_questionnaire: data.notify_email_questionnaire ?? true,
            notify_inapp_photo_downloaded: data.notify_inapp_photo_downloaded ?? true,
            notify_email_photo_downloaded: data.notify_email_photo_downloaded ?? false,
            notify_inapp_gallery_downloaded: data.notify_inapp_gallery_downloaded ?? true,
            notify_email_gallery_downloaded: data.notify_email_gallery_downloaded ?? true,
            notify_inapp_favorite_marked: data.notify_inapp_favorite_marked ?? true,
            notify_email_favorite_marked: data.notify_email_favorite_marked ?? false,
            notify_email_shoot_reminder_photographer: data.notify_email_shoot_reminder_photographer ?? true,
          })
        }
        setAutoLoaded(true)
        setNotifLoaded(true)
      })
  }, [userId])

  const saveAutoSettings = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('automation_settings')
      .upsert({ photographer_id: userId, ...autoSettings, updated_at: new Date().toISOString() }, { onConflict: 'photographer_id' })
    setSaving(false)
    if (error) toast.error(isDE ? 'Fehler beim Speichern' : 'Failed to save')
    else toast.success(isDE ? 'Gespeichert' : 'Saved')
  }

  const isDE = locale === 'de'

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
      .update({ full_name: fullName, language, locale: language, photography_types: photoTypes })
      .eq('id', userId)
    setSaving(false)
    if (error) { toast.error(ts.profile.error); return }

    // Apply locale cookie so UI + emails reflect the new language immediately
    document.cookie = `locale=${language}; path=/; max-age=31536000; SameSite=Lax`
    toast.success(ts.profile.saved)
    window.location.reload()
  }

  const saveStudio = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('photographers')
      .update({ studio_name: studioName, logo_url: logoUrl || null })
      .eq('id', userId)
    setSaving(false)
    if (error) toast.error(ts.profile.error)
    else toast.success('Studio settings saved')
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
    if (error) toast.error(ts.bank.error)
    else toast.success(ts.bank.saved)
  }

  const saveInvoiceProfile = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('photographers')
      .update({
        company_name: companyName.trim() || null,
        address_street: addressStreet.trim() || null,
        address_zip: addressZip.trim() || null,
        address_city: addressCity.trim() || null,
        address_country: addressCountry.trim() || null,
        phone: phoneNum.trim() || null,
        website: website.trim() || null,
        tax_number: taxNumber.trim() || null,
        tax_status: taxStatus,
      })
      .eq('id', userId)
    setSaving(false)
    if (error) toast.error('Fehler beim Speichern')
    else toast.success('Rechnungsprofil gespeichert')
  }

  const saveInvoiceNumbering = async () => {
    const startNum = parseInt(invoiceStartNumber, 10)
    if (isNaN(startNum) || startNum < 1) {
      toast.error(isDE ? 'Startnummer muss mindestens 1 sein' : 'Start number must be at least 1')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('photographers')
      .update({
        invoice_prefix: invoicePrefix.trim(),
        invoice_start_number: startNum,
      })
      .eq('id', userId)
    setSaving(false)
    if (error) toast.error('Fehler beim Speichern')
    else toast.success(isDE ? 'Rechnungsnummernkreis gespeichert' : 'Invoice numbering saved')
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
        <h1 className="font-display text-2xl font-semibold text-[#1A1A1A]">{ts.title}</h1>
        <p className="text-sm text-[#6B6B6B] mt-1">{ts.subtitle}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F0F0EC] rounded-xl p-1 flex-wrap">
        {([
          { id: 'profile', label: ts.tabs.profile, icon: User },
          { id: 'studio', label: ts.tabs.studio, icon: Building2 },
          { id: 'bank', label: ts.tabs.bank, icon: CreditCard },
          { id: 'rechnung', label: isDE ? 'Rechnung' : 'Invoices', icon: Receipt },
          { id: 'branding', label: ts.tabs.branding, icon: Palette },
          { id: 'automations', label: isDE ? 'Automationen' : 'Automations', icon: Zap },
        { id: 'notifications', label: ts.tabs.notifications, icon: Bell },
        { id: 'integrations', label: isDE ? 'Integrationen' : 'Integrations', icon: Link2 },
        { id: 'bookings', label: 'Bookings', icon: Calendar },
        ] as const).map(tab => {
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
          <h2 className="text-sm font-semibold text-[#1A1A1A]">{ts.profile.title}</h2>

          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1">{ts.profile.fullName}</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm text-[#1A1A1A] focus:border-[#C8A882] outline-none bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1">{ts.profile.email}</label>
            <input
              type="email"
              value={photographer?.email || ''}
              disabled
              className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm bg-[#FAFAF8] text-[#6B6B6B] cursor-not-allowed"
            />
            <p className="text-xs text-[#6B6B6B] mt-1">{ts.profile.emailHint}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-2">{ts.profile.language}</label>
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
            <label className="block text-xs font-medium text-[#6B6B6B] mb-2">{ts.profile.photoTypes}</label>
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
            {saving ? ts.profile.saving : ts.profile.saveBtn}
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
            {saving ? 'Saving...' : 'Studio speichern'}
          </button>
        </div>
      )}

      {/* Bank details tab */}
      {activeTab === 'bank' && (
        <div className="bg-white rounded-xl border border-[#E8E8E4] p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-[#1A1A1A]">{ts.bank.title}</h2>
            <p className="text-xs text-[#6B6B6B] mt-1">{ts.bank.subtitle}</p>
          </div>

          <div className="p-3 rounded-lg bg-[#F0F0EC] border border-[#E8E8E4] flex items-start gap-2">
            <CreditCard className="w-4 h-4 text-[#C8A882] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#6B6B6B]">
              {ts.bank.infoBox}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1">
              {ts.bank.accountHolder} <span className="text-[#E84C1A]">*</span>
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
              {ts.bank.iban} <span className="text-[#E84C1A]">*</span>
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
              <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider mb-2">{ts.bank.previewTitle}</p>
              <div className="space-y-1 text-sm">
                {bankAccountHolder && <p className="text-[#1A1A1A]"><span className="text-[#6B6B6B]">{ts.bank.accountHolderLabel}</span> {bankAccountHolder}</p>}
                {bankName && <p className="text-[#1A1A1A]"><span className="text-[#6B6B6B]">{ts.bank.bankLabel}</span> {bankName}</p>}
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
            {saving ? ts.bank.saving : ts.bank.saveBtn}
          </button>
        </div>
      )}

      {/* ── Rechnung tab ── */}
      {activeTab === 'rechnung' && (
        <div className="bg-white rounded-xl border border-[#E8E8E4] p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-[#1A1A1A]">{isDE ? 'Rechnungsprofil' : 'Invoice Profile'}</h2>
            <p className="text-xs text-[#6B6B6B] mt-1">
              {isDE
                ? 'Diese Daten erscheinen auf allen Rechnungen als Absenderadresse.'
                : 'These details appear on all invoices as the sender address.'}
            </p>
          </div>

          {/* Steuer-Status */}
          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-2">
              {isDE ? 'Steuerstatus' : 'Tax Status'} <span className="text-[#E84C1A]">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {([
                { value: 'kleinunternehmer', label: isDE ? 'Kleinunternehmer (§19 UStG)' : 'Small business (§19 UStG)', desc: isDE ? 'Keine Mehrwertsteuer — Hinweispflicht auf Rechnung' : 'No VAT — disclaimer required on invoices' },
                { value: 'vat_19', label: isDE ? '19% MwSt (Regelbesteuerung)' : '19% VAT (standard)', desc: isDE ? 'MwSt wird automatisch berechnet und ausgewiesen' : 'VAT is calculated and shown automatically' },
                { value: 'vat_7', label: isDE ? '7% MwSt (ermäßigt)' : '7% VAT (reduced)', desc: isDE ? 'Für bestimmte Leistungen (z.B. Pressefotos)' : 'For certain services (e.g. press photos)' },
              ] as const).map(opt => (
                <label
                  key={opt.value}
                  className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                  style={{
                    borderColor: taxStatus === opt.value ? '#F97316' : '#E8E8E4',
                    background: taxStatus === opt.value ? 'rgba(249,115,22,0.04)' : '#fff',
                  }}
                >
                  <input
                    type="radio"
                    name="tax_status"
                    value={opt.value}
                    checked={taxStatus === opt.value}
                    onChange={() => setTaxStatus(opt.value)}
                    className="mt-0.5 accent-[#F97316]"
                  />
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">{opt.label}</p>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Firmenname */}
          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1">
              {isDE ? 'Firmenname (optional)' : 'Company name (optional)'}
            </label>
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder={isDE ? 'z.B. Lichtblick Photography GbR' : 'e.g. Lichtblick Photography GbR'}
              className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm text-[#1A1A1A] focus:border-[#F97316] outline-none bg-white"
            />
          </div>

          {/* Adresse */}
          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1">
              {isDE ? 'Straße & Hausnummer' : 'Street & number'}
            </label>
            <input
              type="text"
              value={addressStreet}
              onChange={e => setAddressStreet(e.target.value)}
              placeholder="Musterstraße 42"
              className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm text-[#1A1A1A] focus:border-[#F97316] outline-none bg-white"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B6B6B] mb-1">PLZ</label>
              <input
                type="text"
                value={addressZip}
                onChange={e => setAddressZip(e.target.value)}
                placeholder="10115"
                className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm text-[#1A1A1A] focus:border-[#F97316] outline-none bg-white"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#6B6B6B] mb-1">{isDE ? 'Stadt' : 'City'}</label>
              <input
                type="text"
                value={addressCity}
                onChange={e => setAddressCity(e.target.value)}
                placeholder="Berlin"
                className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm text-[#1A1A1A] focus:border-[#F97316] outline-none bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1">{isDE ? 'Land' : 'Country'}</label>
            <input
              type="text"
              value={addressCountry}
              onChange={e => setAddressCountry(e.target.value)}
              placeholder="Deutschland"
              className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm text-[#1A1A1A] focus:border-[#F97316] outline-none bg-white"
            />
          </div>

          {/* Kontakt */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B6B6B] mb-1">{isDE ? 'Telefon' : 'Phone'}</label>
              <input
                type="tel"
                value={phoneNum}
                onChange={e => setPhoneNum(e.target.value)}
                placeholder="+49 30 123456"
                className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm text-[#1A1A1A] focus:border-[#F97316] outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Website</label>
              <input
                type="url"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="www.meinestudio.de"
                className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm text-[#1A1A1A] focus:border-[#F97316] outline-none bg-white"
              />
            </div>
          </div>

          {/* Steuernummer */}
          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1">
              {isDE ? 'Steuernummer / USt-ID' : 'Tax number / VAT ID'}
            </label>
            <input
              type="text"
              value={taxNumber}
              onChange={e => setTaxNumber(e.target.value)}
              placeholder="DE123456789"
              className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm text-[#1A1A1A] focus:border-[#F97316] outline-none bg-white font-mono"
            />
          </div>

          <button
            onClick={saveInvoiceProfile}
            disabled={saving}
            className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            style={{ background: '#F97316' }}
          >
            {saving ? 'Speichern...' : (isDE ? 'Rechnungsprofil speichern' : 'Save invoice profile')}
          </button>

          {/* ── Invoice numbering ── */}
          <div className="border-t border-[#E8E8E4] pt-5 mt-2">
            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1">
              {isDE ? 'Rechnungsnummernkreis' : 'Invoice number sequence'}
            </h3>
            <p className="text-xs text-[#6B6B6B] mb-4">
              {isDE
                ? 'Lege Präfix und Startnummer fest. Neue Rechnungen zählen automatisch hoch.'
                : 'Set a prefix and starting number. New invoices increment automatically.'}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-[#6B6B6B] mb-1">
                  {isDE ? 'Präfix (optional)' : 'Prefix (optional)'}
                </label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={e => setInvoicePrefix(e.target.value)}
                  placeholder="AF-DE-26-"
                  maxLength={20}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm text-[#1A1A1A] focus:border-[#F97316] outline-none bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B6B6B] mb-1">
                  {isDE ? 'Startnummer' : 'Start number'}
                </label>
                <input
                  type="number"
                  min={1}
                  value={invoiceStartNumber}
                  onChange={e => setInvoiceStartNumber(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm text-[#1A1A1A] focus:border-[#F97316] outline-none bg-white font-mono"
                />
              </div>
            </div>

            {/* Live preview */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-[13px]"
              style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.20)' }}>
              <span className="text-[#6B6B6B] text-xs">{isDE ? 'Nächste Nummer:' : 'Next number:'}</span>
              <span className="font-mono font-bold text-[#F97316]">
                {invoicePrefix.trim()}
                {String(Math.max(1, parseInt(invoiceStartNumber || '1', 10))).padStart(3, '0')}
              </span>
            </div>

            {photographer?.last_invoice_number != null && (
              <p className="text-xs text-[#6B6B6B] mb-3">
                {isDE
                  ? `Letzte vergebene Nummer: ${photographer.last_invoice_number} (Präfix-Änderungen gelten ab der nächsten Rechnung)`
                  : `Last used sequence number: ${photographer.last_invoice_number} (prefix changes apply from next invoice)`}
              </p>
            )}

            <button
              onClick={saveInvoiceNumbering}
              disabled={saving}
              className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{ background: '#1A1A1A' }}
            >
              {saving ? 'Speichern...' : (isDE ? 'Nummernkreis speichern' : 'Save numbering')}
            </button>
          </div>
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
                Custom branding is available from the Pro plan.
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
                More branding options (primary color, custom footer) coming in a future update.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Automations tab */}
      {activeTab === 'automations' && (
        <div className="bg-white rounded-xl border border-[#E8E8E4] p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-[#1A1A1A]">{isDE ? 'E-Mail Automationen' : 'Email Automations'}</h2>
            <p className="text-xs text-[#6B6B6B] mt-1">
              {isDE ? 'Automatische E-Mails an deine Kunden — in ihrer Sprache (DE/EN).' : 'Automatic emails to your clients — in their language (DE/EN).'}
            </p>
          </div>

          {!autoLoaded ? (
            <div className="py-4 text-center">
              <div className="w-4 h-4 border-2 border-[#E8E8E4] border-t-[#C8A882] rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <>
              {/* Email automations */}
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B] mb-2">
                  {isDE ? 'E-Mails' : 'Emails'}
                </p>
                {([
                  { key: 'email_portal_created', labelDE: 'Portal erstellt', labelEN: 'Portal created', descDE: 'Wenn ein neues Kunden-Portal erstellt wird', descEN: 'When a new client portal is created' },
                  { key: 'email_contract_sent', labelDE: 'Vertrag gesendet', labelEN: 'Contract sent', descDE: 'Wenn ein Vertrag an den Kunden gesendet wird', descEN: 'When a contract is sent to the client' },
                  { key: 'email_gallery_delivered', labelDE: 'Galerie geliefert', labelEN: 'Gallery delivered', descDE: 'Wenn die Galerie für den Kunden freigegeben wird', descEN: 'When the gallery is delivered to the client' },
                ] as const).map(item => {
                  const label = isDE ? item.labelDE : item.labelEN
                  const desc = isDE ? item.descDE : item.descEN
                  const enabled = autoSettings[item.key]
                  return (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-[#FAFAF8] border border-[#E8E8E4]">
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">{label}</p>
                        <p className="text-xs text-[#6B6B6B] mt-0.5">{desc}</p>
                      </div>
                      <button
                        onClick={() => setAutoSettings(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                        className={cn('w-9 h-5 rounded-full relative transition-colors flex-shrink-0', enabled ? 'bg-[#3DBA6F]' : 'bg-[#E8E8E4]')}
                      >
                        <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', enabled ? 'left-4' : 'left-0.5')} />
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Reminder automations */}
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B] mb-2">
                  {isDE ? 'Shooting-Erinnerungen' : 'Shoot Reminders'}
                </p>
                {([
                  { key: 'reminder_7d', labelDE: '7 Tage vorher', labelEN: '7 days before', descDE: 'Erinnerung 7 Tage vor dem Shooting', descEN: 'Reminder 7 days before the shoot' },
                  { key: 'reminder_1d', labelDE: '1 Tag vorher', labelEN: '1 day before', descDE: 'Erinnerung 1 Tag vor dem Shooting', descEN: 'Reminder 1 day before the shoot' },
                ] as const).map(item => {
                  const label = isDE ? item.labelDE : item.labelEN
                  const desc = isDE ? item.descDE : item.descEN
                  const enabled = autoSettings[item.key]
                  return (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-[#FAFAF8] border border-[#E8E8E4]">
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">{label}</p>
                        <p className="text-xs text-[#6B6B6B] mt-0.5">{desc}</p>
                      </div>
                      <button
                        onClick={() => setAutoSettings(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                        className={cn('w-9 h-5 rounded-full relative transition-colors flex-shrink-0', enabled ? 'bg-[#3DBA6F]' : 'bg-[#E8E8E4]')}
                      >
                        <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', enabled ? 'left-4' : 'left-0.5')} />
                      </button>
                    </div>
                  )
                })}
              </div>

              <button
                onClick={saveAutoSettings}
                disabled={saving}
                className="px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
              >
                {saving ? (isDE ? 'Speichern...' : 'Saving...') : (isDE ? 'Speichern' : 'Save')}
              </button>
            </>
          )}
        </div>
      )}

      {/* Notifications tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-xl border border-[#E8E8E4] p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-[#1A1A1A]">{isDE ? 'Benachrichtigungen' : 'Notifications'}</h2>
            <p className="text-xs text-[#6B6B6B] mt-1">
              {isDE ? 'Wähle für jedes Ereignis, ob du eine In-App- und/oder E-Mail-Benachrichtigung erhalten möchtest.' : 'Choose for each event whether you want an in-app and/or email notification.'}
            </p>
          </div>

          {!notifLoaded ? (
            <div className="py-4 text-center">
              <div className="w-4 h-4 border-2 border-[#E8E8E4] border-t-[#C8A882] rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div className="flex items-center justify-end gap-4 pr-1 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B] w-14 text-center">
                  {isDE ? 'In-App' : 'In-App'}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B] w-14 text-center">
                  E-Mail
                </span>
              </div>

              {/* New booking section */}
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B] mb-2">
                  {isDE ? 'Buchungen' : 'Bookings'}
                </p>
                {(() => {
                  const inappOn = notifSettings.notify_inapp_new_booking
                  const emailOn = notifSettings.notify_email_new_booking
                  return (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAFAF8] border border-[#E8E8E4]">
                      <span className="text-sm text-[#1A1A1A] flex-1">
                        {isDE ? 'Neue Buchung / Anfrage erhalten' : 'New booking received'}
                      </span>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setNotifSettings(prev => ({ ...prev, notify_inapp_new_booking: !prev.notify_inapp_new_booking }))}
                          className={cn('w-9 h-5 rounded-full relative transition-colors flex-shrink-0', inappOn ? 'bg-[#3DBA6F]' : 'bg-[#E8E8E4]')}
                        >
                          <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', inappOn ? 'left-4' : 'left-0.5')} />
                        </button>
                        <button
                          onClick={() => setNotifSettings(prev => ({ ...prev, notify_email_new_booking: !prev.notify_email_new_booking }))}
                          className={cn('w-9 h-5 rounded-full relative transition-colors flex-shrink-0', emailOn ? 'bg-[#C8A882]' : 'bg-[#E8E8E4]')}
                        >
                          <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', emailOn ? 'left-4' : 'left-0.5')} />
                        </button>
                      </div>
                    </div>
                  )
                })()}
                {/* Auto-invoice toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAFAF8] border border-[#E8E8E4] mt-1">
                  <div className="flex-1 min-w-0 pr-4">
                    <span className="text-sm text-[#1A1A1A] block">
                      {isDE ? 'Rechnung automatisch erstellen' : 'Auto-create invoice on complete'}
                    </span>
                    <span className="text-[11px] text-[#6B6B6B]">
                      {isDE ? 'Beim Abschließen einer Buchung wird automatisch eine Rechnung mit Anzahlungsabzug erstellt.' : 'When marking a booking as completed, an invoice is auto-generated with deposit deducted.'}
                    </span>
                  </div>
                  <button
                    onClick={() => setNotifSettings(prev => ({ ...prev, auto_invoice_on_complete: !prev.auto_invoice_on_complete }))}
                    className={cn('w-9 h-5 rounded-full relative transition-colors flex-shrink-0', notifSettings.auto_invoice_on_complete ? 'bg-[#C8A882]' : 'bg-[#E8E8E4]')}
                  >
                    <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', notifSettings.auto_invoice_on_complete ? 'left-4' : 'left-0.5')} />
                  </button>
                </div>
              </div>

              {/* New inquiry section */}
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B] mb-2">
                  {isDE ? 'Neue Anfragen' : 'New Inquiries'}
                </p>
                {(() => {
                  const inappOn = notifSettings.notify_inapp_new_inquiry
                  const emailOn = notifSettings.notify_email_new_inquiry
                  return (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAFAF8] border border-[#E8E8E4]">
                      <span className="text-sm text-[#1A1A1A] flex-1">
                        {isDE ? 'Neue Anfrage erhalten' : 'New inquiry received'}
                      </span>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setNotifSettings(prev => ({ ...prev, notify_inapp_new_inquiry: !prev.notify_inapp_new_inquiry }))}
                          className={cn('w-9 h-5 rounded-full relative transition-colors flex-shrink-0', inappOn ? 'bg-[#3DBA6F]' : 'bg-[#E8E8E4]')}
                        >
                          <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', inappOn ? 'left-4' : 'left-0.5')} />
                        </button>
                        <button
                          onClick={() => setNotifSettings(prev => ({ ...prev, notify_email_new_inquiry: !prev.notify_email_new_inquiry }))}
                          className={cn('w-9 h-5 rounded-full relative transition-colors flex-shrink-0', emailOn ? 'bg-[#C8A882]' : 'bg-[#E8E8E4]')}
                        >
                          <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', emailOn ? 'left-4' : 'left-0.5')} />
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Client activity section */}
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B] mb-2">
                  {isDE ? 'Kunden-Aktivität' : 'Client Activity'}
                </p>
                {([
                  {
                    labelDE: 'Vertrag unterschrieben', labelEN: 'Contract signed',
                    inappKey: 'notify_inapp_contract_signed', emailKey: 'notify_email_contract_signed',
                  },
                  {
                    labelDE: 'Galerie angesehen', labelEN: 'Gallery viewed',
                    inappKey: 'notify_inapp_gallery_viewed', emailKey: 'notify_email_gallery_viewed',
                  },
                  {
                    labelDE: 'Fragebogen ausgefüllt', labelEN: 'Questionnaire filled',
                    inappKey: 'notify_inapp_questionnaire', emailKey: 'notify_email_questionnaire',
                  },
                  {
                    labelDE: 'Foto heruntergeladen', labelEN: 'Photo downloaded',
                    inappKey: 'notify_inapp_photo_downloaded', emailKey: 'notify_email_photo_downloaded',
                  },
                  {
                    labelDE: 'Galerie heruntergeladen', labelEN: 'Gallery downloaded',
                    inappKey: 'notify_inapp_gallery_downloaded', emailKey: 'notify_email_gallery_downloaded',
                  },
                  {
                    labelDE: 'Favorit markiert', labelEN: 'Favorite marked',
                    inappKey: 'notify_inapp_favorite_marked', emailKey: 'notify_email_favorite_marked',
                  },
                ] as const).map(item => {
                  const label = isDE ? item.labelDE : item.labelEN
                  const inappOn = notifSettings[item.inappKey]
                  const emailOn = notifSettings[item.emailKey]
                  return (
                    <div key={item.inappKey} className="flex items-center justify-between p-3 rounded-lg bg-[#FAFAF8] border border-[#E8E8E4]">
                      <span className="text-sm text-[#1A1A1A] flex-1">{label}</span>
                      <div className="flex items-center gap-4">
                        {/* In-App toggle */}
                        <button
                          onClick={() => setNotifSettings(prev => ({ ...prev, [item.inappKey]: !prev[item.inappKey] }))}
                          className={cn('w-9 h-5 rounded-full relative transition-colors flex-shrink-0', inappOn ? 'bg-[#3DBA6F]' : 'bg-[#E8E8E4]')}
                        >
                          <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', inappOn ? 'left-4' : 'left-0.5')} />
                        </button>
                        {/* Email toggle */}
                        <button
                          onClick={() => setNotifSettings(prev => ({ ...prev, [item.emailKey]: !prev[item.emailKey] }))}
                          className={cn('w-9 h-5 rounded-full relative transition-colors flex-shrink-0', emailOn ? 'bg-[#C8A882]' : 'bg-[#E8E8E4]')}
                        >
                          <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', emailOn ? 'left-4' : 'left-0.5')} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Shooting reminders section */}
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B] mb-2">
                  {isDE ? 'Shooting-Erinnerungen (für dich)' : 'Shoot Reminders (for you)'}
                </p>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAFAF8] border border-[#E8E8E4]">
                  <div>
                    <p className="text-sm text-[#1A1A1A]">{isDE ? '1 Tag vorher — E-Mail an dich' : '1 day before — Email to you'}</p>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">{isDE ? 'Du erhältst eine Erinnerung am Tag vor dem Shooting' : 'You receive a reminder the day before the shoot'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-9" /> {/* spacer for in-app column */}
                    <button
                      onClick={() => setNotifSettings(prev => ({ ...prev, notify_email_shoot_reminder_photographer: !prev.notify_email_shoot_reminder_photographer }))}
                      className={cn('w-9 h-5 rounded-full relative transition-colors flex-shrink-0', notifSettings.notify_email_shoot_reminder_photographer ? 'bg-[#C8A882]' : 'bg-[#E8E8E4]')}
                    >
                      <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', notifSettings.notify_email_shoot_reminder_photographer ? 'left-4' : 'left-0.5')} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 pt-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#3DBA6F]" />
                  <span className="text-[11px] text-[#6B6B6B]">{isDE ? 'In-App (Glocke)' : 'In-App (bell)'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#C8A882]" />
                  <span className="text-[11px] text-[#6B6B6B]">{isDE ? 'E-Mail an dich' : 'Email to you'}</span>
                </div>
              </div>

              <button
                onClick={async () => {
                  setSaving(true)
                  const { error } = await supabase
                    .from('automation_settings')
                    .upsert({ photographer_id: userId, ...notifSettings, updated_at: new Date().toISOString() }, { onConflict: 'photographer_id' })
                  setSaving(false)
                  if (error) toast.error(isDE ? 'Fehler beim Speichern' : 'Failed to save')
                  else toast.success(isDE ? 'Gespeichert' : 'Saved')
                }}
                disabled={saving}
                className="px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
              >
                {saving ? (isDE ? 'Speichern...' : 'Saving...') : (isDE ? 'Speichern' : 'Save')}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Integrations tab ─────────────────────────────────────────────── */}
      {activeTab === 'integrations' && (
        <IntegrationsTab
          userId={userId}
          isDE={isDE}
          supabase={supabase}
          notifEmail={notifEmail}
          setNotifEmail={setNotifEmail}
          googleConnected={googleConnected}
          setGoogleConnected={setGoogleConnected}
          integrationsLoaded={integrationsLoaded}
          setIntegrationsLoaded={setIntegrationsLoaded}
          disconnecting={disconnecting}
          setDisconnecting={setDisconnecting}
        />
      )}

      {/* ── Bookings tab ─────────────────────────────────────────────────── */}
      {activeTab === 'bookings' && (
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}
        >
          <div>
            <h2 className="font-bold text-[15px] mb-1" style={{ color: 'var(--text-primary)' }}>Booking Link</h2>
            <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
              Dein öffentlicher Booking-Link. Clients buchen unter: fotonizer.com/b/<strong>{bookingSlug || 'dein-slug'}</strong>/...
            </p>
            <label className="block text-[12px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
              Dein Slug
            </label>
            <div className="flex items-center gap-2">
              <div
                className="flex items-center rounded-xl overflow-hidden flex-1"
                style={{ border: '1px solid var(--border-color)', background: 'var(--bg-hover)' }}
              >
                <span className="px-3 py-2 text-[12px] flex-shrink-0" style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border-color)' }}>
                  fotonizer.com/b/
                </span>
                <input
                  className="flex-1 px-3 py-2 text-[14px] bg-transparent"
                  style={{ color: 'var(--text-primary)' }}
                  value={bookingSlug}
                  onChange={e => setBookingSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''))}
                  placeholder="max-mustermann"
                  maxLength={60}
                />
              </div>
              <button
                onClick={async () => {
                  if (!bookingSlug.trim()) { toast.error('Slug darf nicht leer sein'); return }
                  setSlugSaving(true)
                  try {
                    const { error } = await supabase
                      .from('photographers')
                      .update({ slug: bookingSlug.trim() })
                      .eq('id', userId)
                    if (error) throw error
                    toast.success('Slug gespeichert!')
                  } catch {
                    toast.error('Slug ist bereits vergeben oder ungültig')
                  } finally {
                    setSlugSaving(false)
                  }
                }}
                disabled={slugSaving}
                className="px-4 py-2 rounded-xl text-[13px] font-bold disabled:opacity-50 transition-all"
                style={{ background: 'var(--accent)', color: '#1A1A18' }}
              >
                {slugSaving ? '…' : isDE ? 'Speichern' : 'Save'}
              </button>
            </div>
            <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
              Nur Kleinbuchstaben, Zahlen und Bindestriche. Dieser Slug ist eindeutig und kann nicht von anderen verwendet werden.
            </p>
          </div>

          <div className="pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
            <a
              href="/dashboard/booking-types"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              <Calendar className="w-4 h-4" />
              Booking Types verwalten →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Integrations sub-component ────────────────────────────────────────────────
function IntegrationsTab({
  userId, isDE, supabase,
  notifEmail, setNotifEmail,
  googleConnected, setGoogleConnected,
  integrationsLoaded, setIntegrationsLoaded,
  disconnecting, setDisconnecting,
}: {
  userId: string
  isDE: boolean
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
  notifEmail: string
  setNotifEmail: (v: string) => void
  googleConnected: boolean
  setGoogleConnected: (v: boolean) => void
  integrationsLoaded: boolean
  setIntegrationsLoaded: (v: boolean) => void
  disconnecting: boolean
  setDisconnecting: (v: boolean) => void
}) {
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('photographers')
      .select('notification_email, google_calendar_access_token')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setNotifEmail(data.notification_email || '')
          setGoogleConnected(!!data.google_calendar_access_token)
        }
        setIntegrationsLoaded(true)
      })
  }, [userId])

  const saveNotifEmail = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('photographers')
      .update({ notification_email: notifEmail.trim() || null })
      .eq('id', userId)
    setSaving(false)
    if (error) toast.error(isDE ? 'Fehler beim Speichern' : 'Failed to save')
    else toast.success(isDE ? 'Gespeichert!' : 'Saved!')
  }

  const disconnectGoogle = async () => {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/integrations/google/disconnect', { method: 'POST' })
      if (res.ok) {
        setGoogleConnected(false)
        toast.success(isDE ? 'Google Kalender getrennt' : 'Google Calendar disconnected')
      } else {
        toast.error(isDE ? 'Fehler beim Trennen' : 'Failed to disconnect')
      }
    } catch {
      toast.error(isDE ? 'Fehler beim Trennen' : 'Failed to disconnect')
    }
    setDisconnecting(false)
  }

  if (!integrationsLoaded) {
    return (
      <div className="bg-white rounded-xl border border-[#E8E8E4] p-6 flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-[#E8E8E4] border-t-[#C8A882] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Email BCC card ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E8E8E4] p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F0F0EC] flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4 text-[#C8A882]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#1A1A1A]">
              {isDE ? 'E-Mail-Kopie (BCC)' : 'Email Copy (BCC)'}
            </h2>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              {isDE
                ? 'Alle E-Mails, die Fotonizer an deine Kunden sendet, werden auch an diese Adresse weitergeleitet. So hast du immer eine Kopie in deinem eigenen Postfach.'
                : 'All emails Fotonizer sends to your clients will also be forwarded to this address. You always have a copy in your own inbox.'}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6B6B6B] mb-1">
            {isDE ? 'Deine E-Mail-Adresse' : 'Your email address'}
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={notifEmail}
              onChange={e => setNotifEmail(e.target.value)}
              placeholder={isDE ? 'z.B. dein@gmail.com' : 'e.g. your@gmail.com'}
              className="flex-1 px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm text-[#1A1A1A] focus:border-[#C8A882] outline-none bg-white"
            />
            <button
              onClick={saveNotifEmail}
              disabled={saving}
              className="px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {saving ? '...' : (isDE ? 'Speichern' : 'Save')}
            </button>
          </div>
          {notifEmail && (
            <p className="text-xs text-[#3DBA6F] mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {isDE ? `Kopie wird an ${notifEmail} gesendet` : `Copy will be sent to ${notifEmail}`}
            </p>
          )}
        </div>

        <div className="p-3 rounded-lg bg-[#F8F7F4] border border-[#E8E8E4]">
          <p className="text-xs text-[#6B6B6B]">
            💡 {isDE
              ? 'Tipp: Wenn du antwortest, antwortet der Kunde direkt an diese Adresse — nicht an noreply@fotonizer.com.'
              : 'Tip: When clients reply, they reply directly to this address — not to noreply@fotonizer.com.'}
          </p>
        </div>
      </div>

      {/* ── Google Calendar card ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E8E8E4] p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F0F0EC] flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 text-[#4285F4]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#1A1A1A]">Google Calendar</h2>
              {googleConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#3DBA6F]/10 text-[#3DBA6F] text-[11px] font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  {isDE ? 'Verbunden' : 'Connected'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8E8E4] text-[#6B6B6B] text-[11px] font-medium">
                  <XCircle className="w-3 h-3" />
                  {isDE ? 'Nicht verbunden' : 'Not connected'}
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              {isDE
                ? 'Shooting-Termine werden automatisch in deinen Google Kalender eingetragen, wenn du ein Datum in einem Projekt speicherst.'
                : 'Shooting dates are automatically added to your Google Calendar when you save a date in a project.'}
            </p>
          </div>
        </div>

        {googleConnected ? (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-[#3DBA6F]/5 border border-[#3DBA6F]/20">
              <p className="text-xs text-[#3DBA6F] font-medium">
                ✓ {isDE ? 'Google Kalender ist verbunden. Neue Shootings werden automatisch eingetragen.' : 'Google Calendar is connected. New shoots will be added automatically.'}
              </p>
            </div>
            <button
              onClick={disconnectGoogle}
              disabled={disconnecting}
              className="px-4 py-2 border border-[#E8E8E4] text-[#6B6B6B] text-sm font-medium rounded-lg hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              {disconnecting ? '...' : (isDE ? 'Verbindung trennen' : 'Disconnect')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <ul className="space-y-1.5">
              {(isDE ? [
                'Shooting-Termine automatisch im Kalender',
                'Änderungen werden synchronisiert',
                'Funktioniert mit Google Workspace & Gmail',
              ] : [
                'Shooting dates automatically in your calendar',
                'Changes are synced automatically',
                'Works with Google Workspace & Gmail',
              ]).map(item => (
                <li key={item} className="flex items-center gap-2 text-xs text-[#6B6B6B]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C8A882] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <a
              href="/api/integrations/google/connect"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E8E8E4] text-[#1A1A1A] text-sm font-medium rounded-lg hover:border-[#4285F4] hover:bg-[#4285F4]/5 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isDE ? 'Mit Google verbinden' : 'Connect with Google'}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
