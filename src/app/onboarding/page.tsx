'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Camera, Check, ArrowRight, ArrowLeft, Upload, Gift } from 'lucide-react'
import toast from 'react-hot-toast'

const PHOTOGRAPHY_TYPES = [
  { key: 'wedding', label: 'Hochzeit' },
  { key: 'portrait', label: 'Portrait' },
  { key: 'event', label: 'Event' },
  { key: 'commercial', label: 'Kommerziell' },
  { key: 'realEstate', label: 'Immobilien' },
  { key: 'fineArt', label: 'Fine Art' },
  { key: 'newborn', label: 'Neugeborene' },
  { key: 'family', label: 'Familie' },
  { key: 'fashion', label: 'Mode' },
  { key: 'sport', label: 'Sport' },
]

const STEPS = [
  { id: 1, label: 'Profil' },
  { id: 2, label: 'Studio' },
  { id: 3, label: 'Typen' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [fullName, setFullName] = useState('')
  const [studioName, setStudioName] = useState('')
  const [photographyTypes, setPhotographyTypes] = useState<string[]>([])
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteApplied, setInviteApplied] = useState(false)

  // Pre-fill invite code from signup page (stored in localStorage)
  useEffect(() => {
    const pending = localStorage.getItem('pending_invite_code')
    if (pending) {
      setInviteCode(pending)
      localStorage.removeItem('pending_invite_code')
    }
  }, [])

  const toggleType = (key: string) => {
    setPhotographyTypes((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    )
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo darf maximal 2MB groß sein')
      return
    }
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setLogoPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleComplete = async () => {
    if (!fullName.trim()) {
      toast.error('Bitte gib deinen Namen ein')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    let logoUrl: string | null = null

    // Upload logo if provided
    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const path = `${user.id}/logo.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(path, logoFile, { upsert: true })

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(path)
        logoUrl = publicUrl
      }
    }

    // Upsert photographer profile
    const { error } = await supabase
      .from('photographers')
      .upsert({
        id: user.id,
        email: user.email!,
        full_name: fullName.trim(),
        studio_name: studioName.trim() || null,
        photography_types: photographyTypes.length > 0 ? photographyTypes : null,
        logo_url: logoUrl,
        plan: 'free',
        language: 'de',
        onboarding_completed: true,
      })

    if (error) {
      toast.error('Fehler beim Speichern. Bitte versuche es erneut.')
      setLoading(false)
      return
    }

    toast.success('Willkommen bei Fotonizer!')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center h-16 border-b border-[#E8E8E4] bg-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#1A1A1A] rounded-lg flex items-center justify-center">
            <Camera className="w-3.5 h-3.5 text-[#C8A882]" />
          </div>
          <span className="font-display text-lg font-semibold text-[#1A1A1A]">Fotonizer</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                      step > s.id
                        ? 'bg-[#3DBA6F] text-white'
                        : step === s.id
                        ? 'bg-[#1A1A1A] text-white'
                        : 'bg-[#E8E8E4] text-[#6B6B6B]'
                    )}
                  >
                    {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                  </div>
                  <span className="text-xs text-[#6B6B6B]">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'w-16 h-0.5 mb-4 transition-all',
                      step > s.id ? 'bg-[#3DBA6F]' : 'bg-[#E8E8E4]'
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="bg-white rounded-2xl border border-[#E8E8E4] p-8 shadow-sm">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-2xl font-semibold text-[#1A1A1A] mb-1">
                    Willkommen bei Fotonizer
                  </h1>
                  <p className="text-[#6B6B6B] text-sm">Lass uns dein Profil einrichten</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                    Vollständiger Name <span className="text-[#E84C1A]">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Max Mustermann"
                    className={cn(
                      'w-full px-3.5 py-2.5 rounded-lg border text-sm',
                      'border-[#E8E8E4] focus:border-[#C8A882] focus:ring-2 focus:ring-[#C8A882]/20',
                      'outline-none transition-all'
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                    Profilfoto <span className="text-[#6B6B6B] font-normal">(optional)</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-[#F0F0EC] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[#6B6B6B] text-xl font-display">
                          {fullName ? fullName[0].toUpperCase() : '?'}
                        </span>
                      )}
                    </div>
                    <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm text-[#6B6B6B] hover:border-[#C8A882] hover:text-[#1A1A1A] transition-all">
                      <Upload className="w-4 h-4" />
                      Foto hochladen
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!fullName.trim()) {
                      toast.error('Bitte gib deinen Namen ein')
                      return
                    }
                    setStep(2)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-[#2A2A2A] transition-colors"
                >
                  Weiter
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-2xl font-semibold text-[#1A1A1A] mb-1">
                    Dein Studio
                  </h1>
                  <p className="text-[#6B6B6B] text-sm">Wie heißt dein Studio?</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                    Studio-Name <span className="text-[#6B6B6B] font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    placeholder="Muster Fotografie"
                    className={cn(
                      'w-full px-3.5 py-2.5 rounded-lg border text-sm',
                      'border-[#E8E8E4] focus:border-[#C8A882] focus:ring-2 focus:ring-[#C8A882]/20',
                      'outline-none transition-all'
                    )}
                  />
                  <p className="text-xs text-[#6B6B6B] mt-1.5">
                    Wird im Kunden-Portal angezeigt
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 px-4 py-2.5 border border-[#E8E8E4] text-[#6B6B6B] rounded-lg text-sm font-medium hover:bg-[#F0F0EC] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Zurück
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-[#2A2A2A] transition-colors"
                  >
                    Weiter
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-2xl font-semibold text-[#1A1A1A] mb-1">
                    Fotografie-Typen
                  </h1>
                  <p className="text-[#6B6B6B] text-sm">Wähle alle zutreffenden aus</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {PHOTOGRAPHY_TYPES.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => toggleType(key)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left',
                        photographyTypes.includes(key)
                          ? 'border-[#C8A882] bg-[#C8A882]/10 text-[#1A1A1A]'
                          : 'border-[#E8E8E4] text-[#6B6B6B] hover:border-[#C8A882]/50 hover:text-[#1A1A1A]'
                      )}
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                          photographyTypes.includes(key)
                            ? 'border-[#C8A882] bg-[#C8A882]'
                            : 'border-[#E8E8E4]'
                        )}
                      >
                        {photographyTypes.includes(key) && (
                          <Check className="w-2.5 h-2.5 text-white" />
                        )}
                      </div>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Invite code field */}
                <div className="pt-2 border-t border-[#E8E8E4]">
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5 flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-[#C8A882]" />
                    Einladungscode <span className="text-[#6B6B6B] font-normal">(optional)</span>
                  </label>
                  {inviteApplied ? (
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#3DBA6F] bg-[#3DBA6F]/10 text-sm text-[#3DBA6F] font-medium">
                      <Check className="w-4 h-4" />
                      Code aktiviert — 6 Monate Pro gratis! 🎉
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        placeholder="FOTO-BETA-XXXX"
                        className="flex-1 px-3.5 py-2.5 rounded-lg border border-[#E8E8E4] focus:border-[#C8A882] focus:ring-2 focus:ring-[#C8A882]/20 outline-none transition-all text-sm font-mono"
                      />
                      <button
                        type="button"
                        disabled={!inviteCode.trim() || inviteLoading}
                        onClick={async () => {
                          if (!inviteCode.trim()) return
                          setInviteLoading(true)
                          try {
                            const res = await fetch('/api/invite/redeem', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ code: inviteCode }),
                            })
                            const data = await res.json()
                            if (!res.ok) {
                              toast.error(data.error || 'Ungültiger Code')
                            } else {
                              setInviteApplied(true)
                              toast.success('🎉 6 Monate Pro aktiviert!')
                            }
                          } catch {
                            toast.error('Fehler beim Einlösen')
                          } finally {
                            setInviteLoading(false)
                          }
                        }}
                        className="px-4 py-2.5 bg-[#C8A882] text-white rounded-lg text-sm font-medium hover:bg-[#B8956E] transition-colors disabled:opacity-40"
                      >
                        {inviteLoading ? '...' : 'Einlösen'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 px-4 py-2.5 border border-[#E8E8E4] text-[#6B6B6B] rounded-lg text-sm font-medium hover:bg-[#F0F0EC] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Zurück
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Wird gespeichert...
                      </>
                    ) : (
                      <>
                        Einrichtung abschließen
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Skip */}
          {step < 3 && (
            <p className="text-center mt-4">
              <button
                onClick={handleComplete}
                className="text-xs text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
              >
                Überspringen und später einrichten
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
