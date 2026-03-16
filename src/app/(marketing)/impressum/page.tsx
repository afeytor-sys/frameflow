import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Impressum',
  description: 'Impressum und Anbieterkennzeichnung gemäß § 5 TMG für Fotonizer.',
  robots: { index: false, follow: false },
}

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="font-display text-3xl font-bold text-[#1A1A1A] mb-8">Impressum</h1>

        <div className="prose prose-sm text-[#6B6B6B] space-y-6">
          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">Angaben gemäß § 5 TMG</h2>
            <p>
              Allan Feitor<br />
              Kiefholzstr 14<br />
              12435 Berlin<br />
              Deutschland
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">Kontakt</h2>
            <p>
              E-Mail: af.photographer.berlin@gmail.com<br />
              Telefon: +49 173 8701139
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">Umsatzsteuer-ID</h2>
            <p>
              Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
              362/285/01034
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
            <p>
              Allan Feitor<br />
              Kiefholzstr 14, 12435 Berlin
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">Streitschlichtung</h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
              <a href="https://ec.europa.eu/consumers/odr/" className="text-[#C8A882] hover:underline" target="_blank" rel="noopener noreferrer">
                https://ec.europa.eu/consumers/odr/
              </a>
            </p>
            <p>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>
        </div>

        <div className="mt-8">
          <a href="/" className="text-sm text-[#C8A882] hover:underline">← Zurück zur Startseite</a>
        </div>
      </div>
    </div>
  )
}
