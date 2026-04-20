import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Impressum',
  description: 'Impressum und Anbieterkennzeichnung gemäß § 5 TMG für Fotonizer.',
  robots: { index: false, follow: false },
}

export default function ImpressumPage() {
  return (
    <div className="min-h-screen" style={{ background: '#FAFAF8' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl font-bold mb-10" style={{ color: '#1A1A1A', letterSpacing: '-0.02em' }}>
          Impressum
        </h1>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: '#4B5563' }}>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: '#1A1A1A' }}>
              Angaben gemäß § 5 TMG
            </h2>
            <address className="not-italic space-y-0.5">
              <p className="font-medium" style={{ color: '#1A1A1A' }}>Allan Feitor</p>
              <p>Kiefholzstr. 14</p>
              <p>12435 Berlin</p>
              <p>Deutschland</p>
            </address>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: '#1A1A1A' }}>Kontakt</h2>
            <p>
              E-Mail:{' '}
              <a href="mailto:info.fotonizer@gmail.com" className="underline" style={{ color: '#C8A882' }}>
                info.fotonizer@gmail.com
              </a>
            </p>
            <p>Telefon: +49 173 8701139</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: '#1A1A1A' }}>Umsatzsteuer-ID</h2>
            <p>
              Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:
            </p>
            <p className="mt-1 font-medium" style={{ color: '#374151' }}>362/285/01034</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: '#1A1A1A' }}>
              Verantwortlich für den Inhalt nach § 55 Abs. 2 MStV
            </h2>
            <address className="not-italic">
              <p>Allan Feitor</p>
              <p>Kiefholzstr. 14, 12435 Berlin</p>
            </address>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: '#1A1A1A' }}>
              EU-Streitschlichtung
            </h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                className="underline"
                style={{ color: '#C8A882' }}
                target="_blank"
                rel="noopener noreferrer"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
            </p>
            <p className="mt-2">
              Unsere E-Mail-Adresse lautet: info.fotonizer@gmail.com
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: '#1A1A1A' }}>
              Verbraucherstreitbeilegung
            </h2>
            <p>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: '#1A1A1A' }}>
              Haftung für Inhalte
            </h2>
            <p>
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den
              allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
              verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu
              forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: '#1A1A1A' }}>Urheberrecht</h2>
            <p>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
              Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
              Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            </p>
          </section>

        </div>

        <div className="mt-10 pt-6" style={{ borderTop: '1px solid #E5E7EB' }}>
          <a href="/" className="text-sm" style={{ color: '#C8A882' }}>← Zurück zur Startseite</a>
        </div>
      </div>
    </div>
  )
}
