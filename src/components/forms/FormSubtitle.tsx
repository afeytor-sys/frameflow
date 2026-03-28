'use client'

const subtitles = {
  en: "Fill out the form below and we'll get back to you shortly.",
  de: 'Füllen Sie das Formular aus und wir melden uns in Kürze bei Ihnen.',
}

export default function FormSubtitle() {
  const lang =
    typeof navigator !== 'undefined' && navigator.language.startsWith('de') ? 'de' : 'en'
  return (
    <p className="text-sm" style={{ color: 'var(--text-secondary, #666)' }}>
      {subtitles[lang]}
    </p>
  )
}
