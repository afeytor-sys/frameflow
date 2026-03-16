import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description: 'Datenschutzerklärung gemäß DSGVO für die Fotonizer-Plattform.',
  robots: { index: false, follow: false },
}

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="font-display text-3xl font-bold text-[#1A1A1A] mb-2">Datenschutzerklärung</h1>
        <p className="text-sm text-[#6B6B6B] mb-8">Stand: März 2026</p>

        <div className="space-y-8 text-sm text-[#6B6B6B]">
          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">1. Verantwortlicher</h2>
            <p>
              Verantwortlicher im Sinne der DSGVO ist:<br /><br />
              Allan Feitor<br />
              Kiefholzstr 14, 12435 Berlin<br />
              E-Mail: af.photographer.berlin@gmail.com
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">2. Erhobene Daten</h2>
            <p>Wir erheben und verarbeiten folgende personenbezogene Daten:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>E-Mail-Adresse und Name bei der Registrierung</li>
              <li>Zahlungsdaten (verarbeitet durch Stripe, Inc.)</li>
              <li>Hochgeladene Fotos und Dokumente</li>
              <li>IP-Adresse bei der Vertragsunterzeichnung</li>
              <li>Nutzungsdaten (Seitenaufrufe, Aktionen im Dashboard)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">3. Zweck der Verarbeitung</h2>
            <p>Wir verarbeiten deine Daten zur:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Bereitstellung und Verbesserung unserer Dienste</li>
              <li>Abwicklung von Zahlungen</li>
              <li>Kommunikation per E-Mail</li>
              <li>Erfüllung gesetzlicher Pflichten</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">4. Drittanbieter</h2>
            <p>Wir nutzen folgende Drittanbieter:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Supabase</strong> (Datenbank & Speicher) — EU-Region</li>
              <li><strong>Stripe</strong> (Zahlungsabwicklung) — Datenschutzrichtlinie: stripe.com/privacy</li>
              <li><strong>Resend</strong> (E-Mail-Versand) — resend.com/privacy</li>
              <li><strong>Vercel</strong> (Hosting) — vercel.com/legal/privacy-policy</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">5. Datenspeicherung</h2>
            <p>
              Deine Daten werden auf Servern in der EU gespeichert. Wir speichern deine Daten
              solange dein Account aktiv ist. Nach Kündigung werden deine Daten innerhalb von
              30 Tagen gelöscht.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">6. Deine Rechte</h2>
            <p>Du hast das Recht auf:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Auskunft über deine gespeicherten Daten (Art. 15 DSGVO)</li>
              <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
              <li>Löschung deiner Daten (Art. 17 DSGVO)</li>
              <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
              <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
            </ul>
            <p className="mt-2">
              Zur Ausübung deiner Rechte wende dich an: af.photographer.berlin@gmail.com
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">7. Cookies</h2>
            <p>
              Wir verwenden technisch notwendige Cookies für die Authentifizierung und Session-Verwaltung.
              Analytische oder Marketing-Cookies werden nur mit deiner Einwilligung gesetzt.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">8. Beschwerderecht</h2>
            <p>
              Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
              Die zuständige Behörde in Deutschland ist der Bundesbeauftragte für den Datenschutz
              und die Informationsfreiheit (BfDI).
            </p>
          </section>

          <p className="text-xs text-[#C0C0C0] pt-4 border-t border-[#E8E8E4]">
            ⚠️ Diese Datenschutzerklärung ist ein Platzhalter. Bitte lass sie von einem Rechtsanwalt
            prüfen und passe alle Angaben in eckigen Klammern an, bevor du die Seite veröffentlichst.
          </p>
        </div>

        <div className="mt-8">
          <a href="/" className="text-sm text-[#C8A882] hover:underline">← Zurück zur Startseite</a>
        </div>
      </div>
    </div>
  )
}
