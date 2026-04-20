import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description: 'Datenschutzerklärung gemäß DSGVO für fotonizer.com.',
  robots: { index: false, follow: false },
}

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen" style={{ background: '#FAFAF8' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">

        <h1 className="text-3xl font-bold mb-2" style={{ color: '#1A1A1A', letterSpacing: '-0.02em' }}>
          Datenschutzerklärung
        </h1>
        <p className="text-sm mb-10" style={{ color: '#9CA3AF' }}>Stand: April 2026</p>

        <div className="space-y-10 text-sm leading-relaxed" style={{ color: '#4B5563' }}>

          {/* 1 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A1A1A' }}>1. Verantwortlicher</h2>
            <p>
              Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
            </p>
            <address className="not-italic mt-2 space-y-0.5">
              <p className="font-medium" style={{ color: '#1A1A1A' }}>Allan Feitor</p>
              <p>Kiefholzstr. 14, 12435 Berlin</p>
              <p>
                E-Mail:{' '}
                <a href="mailto:info.fotonizer@gmail.com" className="underline" style={{ color: '#C8A882' }}>
                  info.fotonizer@gmail.com
                </a>
              </p>
              <p>Telefon: +49 173 8701139</p>
            </address>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A1A1A' }}>2. Welche Daten wir erheben</h2>

            <h3 className="font-semibold mb-1" style={{ color: '#374151' }}>2.1 Buchungs- und Kontaktformulare</h3>
            <p className="mb-3">
              Wenn du über ein Buchungs- oder Kontaktformular eine Anfrage sendest, erheben wir folgende
              personenbezogene Daten, die du aktiv angibst:
            </p>
            <ul className="list-disc list-inside space-y-1 mb-4">
              <li>Vollständiger Name</li>
              <li>E-Mail-Adresse</li>
              <li>Telefonnummer (optional)</li>
              <li>Wunschdatum und -ort (bei Buchungsanfragen)</li>
              <li>Freitextantworten auf projektspezifische Fragen des Fotografen</li>
              <li>Nachrichteninhalt</li>
            </ul>

            <h3 className="font-semibold mb-1" style={{ color: '#374151' }}>2.2 Registrierung (Fotografen-Accounts)</h3>
            <p className="mb-3">
              Fotografen, die einen Account auf fotonizer.com anlegen, übermitteln:
            </p>
            <ul className="list-disc list-inside space-y-1 mb-4">
              <li>E-Mail-Adresse und Passwort (verschlüsselt gespeichert)</li>
              <li>Name und Studioname</li>
              <li>Zahlungsdaten (verarbeitet ausschließlich durch Stripe — wir speichern keine Kartendaten)</li>
              <li>Hochgeladene Fotos, Dokumente und Galerie-Inhalte</li>
            </ul>

            <h3 className="font-semibold mb-1" style={{ color: '#374151' }}>2.3 Automatisch erhobene Daten</h3>
            <p>
              Beim Aufruf unserer Website werden technisch bedingt folgende Daten durch deinen Browser übermittelt:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>IP-Adresse (anonymisiert nach Verarbeitung)</li>
              <li>Datum und Uhrzeit des Zugriffs</li>
              <li>Aufgerufene URL, HTTP-Statuscode</li>
              <li>Browsertyp und Betriebssystem</li>
              <li>Referrer-URL (vorherige Seite)</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A1A1A' }}>3. Zweck und Rechtsgrundlage der Verarbeitung</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ background: '#F3F4F6' }}>
                    <th className="text-left p-3 font-semibold rounded-tl-lg" style={{ color: '#374151' }}>Zweck</th>
                    <th className="text-left p-3 font-semibold" style={{ color: '#374151' }}>Rechtsgrundlage</th>
                    <th className="text-left p-3 font-semibold rounded-tr-lg" style={{ color: '#374151' }}>Daten</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Bearbeitung von Buchungs­anfragen und vorvertragliche Maßnahmen', 'Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung)', 'Name, E-Mail, Telefon, Datum, Antworten'],
                    ['Beantwortung von Kontakt­anfragen', 'Art. 6 Abs. 1 lit. f DSGVO (Berechtigtes Interesse: Kundenkom­munikation)', 'Name, E-Mail, Nachricht'],
                    ['Betrieb der Plattform, Benutzer­authentifizierung', 'Art. 6 Abs. 1 lit. b DSGVO', 'E-Mail, Session-Daten'],
                    ['Zahlungs­abwicklung', 'Art. 6 Abs. 1 lit. b DSGVO', 'Zahlungsdaten (über Stripe)'],
                    ['Versand von E-Mails (Bestätigungen, Erinnerungen)', 'Art. 6 Abs. 1 lit. b DSGVO', 'E-Mail, Name'],
                    ['Webanalyse zur Verbesserung des Angebots', 'Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)', 'Nutzungsdaten, IP (anon.)'],
                    ['Conversion-Tracking (Google Ads)', 'Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)', 'Ereignisdaten'],
                    ['Erfüllung gesetz­licher Aufbewahrungspflichten', 'Art. 6 Abs. 1 lit. c DSGVO', 'Buchungs- und Zahlungsdaten'],
                  ].map(([zweck, basis, daten], i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td className="p-3 align-top">{zweck}</td>
                      <td className="p-3 align-top font-medium" style={{ color: '#374151' }}>{basis}</td>
                      <td className="p-3 align-top" style={{ color: '#6B7280' }}>{daten}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A1A1A' }}>4. Drittanbieter und Auftragsverarbeiter</h2>
            <p className="mb-4">
              Wir setzen folgende Dienstleister ein, die personenbezogene Daten in unserem Auftrag verarbeiten.
              Mit jedem Anbieter besteht ein Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28 DSGVO.
            </p>

            <div className="space-y-5">
              {[
                {
                  name: 'Vercel Inc. (Hosting)',
                  detail: 'Unser Webhosting-Anbieter. Server befinden sich in den USA. Die Übermittlung erfolgt auf Grundlage von EU-Standardvertragsklauseln (SCC) gemäß Art. 46 DSGVO.',
                  link: 'https://vercel.com/legal/privacy-policy',
                },
                {
                  name: 'Supabase Inc. (Datenbank & Datei­speicher)',
                  detail: 'Speicherung aller Buchungsdaten, Nutzerdaten und hochgeladener Dateien. Datenbank-Server befinden sich in der EU (Frankfurt).',
                  link: 'https://supabase.com/privacy',
                },
                {
                  name: 'Resend Inc. (E-Mail-Versand)',
                  detail: 'Versand von Buchungsbestätigungen, Erinnerungen und anderen system­generierten E-Mails an Kunden und Fotografen.',
                  link: 'https://resend.com/privacy',
                },
                {
                  name: 'Stripe Inc. (Zahlungs­abwicklung)',
                  detail: 'Verarbeitung von Abonnement-Zahlungen unserer Fotografen-Kunden. Stripe speichert Zahlungsdaten — wir speichern keine Kreditkartendaten.',
                  link: 'https://stripe.com/privacy',
                },
                {
                  name: 'Cloudflare Inc. (CDN & Bildoptimierung)',
                  detail: 'Auslieferung und Optimierung von Galeriebildern über das Cloudflare-Netzwerk. Bilder werden an globalen Edge-Standorten gecacht.',
                  link: 'https://www.cloudflare.com/privacypolicy/',
                },
                {
                  name: 'Google Analytics 4 (Webanalyse) — nur mit Einwilligung',
                  detail: 'Wir setzen Google Analytics 4 (Google LLC, USA) nur ein, wenn du dem zugestimmt hast. Google Analytics erfasst anonymisierte Nutzungsdaten (Seitenaufrufe, Verweildauer, Herkunftsland). IP-Adressen werden vor der Speicherung anonymisiert. Übertragung in die USA auf Basis von SCC.',
                  link: 'https://policies.google.com/privacy',
                },
                {
                  name: 'Google Ads Conversion-Tracking — nur mit Einwilligung',
                  detail: 'Mit deiner Einwilligung setzen wir Google Ads Conversion-Tracking ein, um die Wirksamkeit unserer Werbekampagnen zu messen. Google LLC, USA; SCC-Basis.',
                  link: 'https://policies.google.com/privacy',
                },
              ].map(({ name, detail, link }) => (
                <div key={name} className="rounded-xl p-4" style={{ background: '#F9F9F7', border: '1px solid #E5E7EB' }}>
                  <p className="font-semibold mb-1" style={{ color: '#1A1A1A', fontSize: '13px' }}>{name}</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>{detail}</p>
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs underline mt-1 inline-block" style={{ color: '#C8A882' }}>
                    Datenschutzerklärung →
                  </a>
                </div>
              ))}
            </div>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A1A1A' }}>5. Cookies</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1" style={{ color: '#374151' }}>5.1 Technisch notwendige Cookies</h3>
                <p>
                  Wir setzen Cookies ein, die für den Betrieb der Website technisch erforderlich sind. Dazu gehören
                  Session-Cookies zur Verwaltung von Anmelde-Sessions (über Supabase Auth). Diese Cookies werden ohne
                  deine Einwilligung gesetzt, da sie auf Art. 6 Abs. 1 lit. b DSGVO gestützt werden.
                </p>
                <p className="mt-2 text-xs" style={{ color: '#9CA3AF' }}>
                  Lebensdauer: Session-basiert (werden beim Schließen des Browsers gelöscht) oder max. 7 Tage bei
                  aktivem &ldquo;Angemeldet bleiben&rdquo;.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-1" style={{ color: '#374151' }}>5.2 Analytische Cookies (Google Analytics)</h3>
                <p>
                  Nur mit deiner Einwilligung setzen wir Google Analytics 4 ein. Dabei werden Cookies gesetzt
                  (<code className="text-xs px-1 py-0.5 rounded" style={{ background: '#F3F4F6' }}>_ga</code>,{' '}
                  <code className="text-xs px-1 py-0.5 rounded" style={{ background: '#F3F4F6' }}>_ga_*</code>),
                  die eine Analyse deines Nutzungsverhaltens ermöglichen.
                </p>
                <p className="mt-2 text-xs" style={{ color: '#9CA3AF' }}>
                  Lebensdauer: 2 Jahre. Du kannst deine Einwilligung jederzeit über die Cookie-Einstellungen (Banner
                  unten rechts) widerrufen.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-1" style={{ color: '#374151' }}>5.3 Marketing-Cookies (Google Ads)</h3>
                <p>
                  Nur mit deiner Einwilligung verwenden wir Google Ads Conversion-Tracking. Dabei werden Cookies
                  gesetzt, die Conversions (z.&nbsp;B. Registrierungen) unseren Werbekampagnen zuordnen.
                </p>
                <p className="mt-2 text-xs" style={{ color: '#9CA3AF' }}>
                  Lebensdauer: 90 Tage. Widerruf jederzeit über die Cookie-Einstellungen.
                </p>
              </div>
            </div>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A1A1A' }}>6. E-Mail-Kommunikation und Öffnungs-Tracking</h2>
            <p className="mb-3">
              Wenn wir dir systemgenerierte E-Mails senden (z.&nbsp;B. Buchungsbestätigungen, Erinnerungen), kann
              in diesen E-Mails ein unsichtbares 1×1-Pixel-Bild enthalten sein. Anhand dieser Technologie können
              wir feststellen, ob und wann eine E-Mail geöffnet wurde.
            </p>
            <p>
              Zweck dieser Verarbeitung ist die Verbesserung unserer Kommunikation und die Bestätigung des
              Zustellungserfolgs.
              <strong style={{ color: '#374151' }}> Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO
              (Berechtigtes Interesse). Du kannst das Laden externer Bilder in deinem E-Mail-Programm deaktivieren,
              um dieses Tracking zu unterbinden.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A1A1A' }}>7. Datenspeicherung und Löschfristen</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ background: '#F3F4F6' }}>
                    <th className="text-left p-3 font-semibold" style={{ color: '#374151' }}>Datenkategorie</th>
                    <th className="text-left p-3 font-semibold" style={{ color: '#374151' }}>Aufbewahrungsfrist</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Buchungsanfragen und Kommunikation', '3 Jahre (handels- und steuerrechtliche Aufbewahrungspflicht)'],
                    ['Rechnungen und Zahlungsbelege', '10 Jahre (§ 147 AO)'],
                    ['Kontaktanfragen ohne Vertragsabschluss', '6 Monate nach letztem Kontakt'],
                    ['Fotografen-Account-Daten', 'Bis zur Kündigung; danach 30 Tage, dann Löschung'],
                    ['Server-Logs (IP-Adressen)', 'Max. 90 Tage, dann automatische Löschung'],
                    ['Google Analytics Daten', '14 Monate (Standardeinstellung Google Analytics)'],
                    ['E-Mail-Öffnungs-Tracking', 'Gelöscht mit dem zugehörigen E-Mail-Eintrag'],
                  ].map(([kat, frist], i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td className="p-3 align-top font-medium" style={{ color: '#374151' }}>{kat}</td>
                      <td className="p-3 align-top">{frist}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A1A1A' }}>8. Deine Rechte als betroffene Person</h2>
            <p className="mb-3">
              Du hast gemäß DSGVO folgende Rechte gegenüber uns als Verantwortlichem:
            </p>
            <div className="space-y-2">
              {[
                ['Auskunftsrecht (Art. 15 DSGVO)', 'Du kannst Auskunft darüber verlangen, welche Daten wir über dich gespeichert haben.'],
                ['Berichtigungsrecht (Art. 16 DSGVO)', 'Du hast das Recht, unrichtige Daten berichtigen zu lassen.'],
                ['Recht auf Löschung (Art. 17 DSGVO)', 'Du kannst die Löschung deiner Daten verlangen, sofern keine gesetzliche Aufbewahrungspflicht entgegensteht.'],
                ['Recht auf Einschränkung (Art. 18 DSGVO)', 'Du kannst die Einschränkung der Verarbeitung verlangen, z.B. wenn du die Richtigkeit der Daten bestreitest.'],
                ['Datenübertragbarkeit (Art. 20 DSGVO)', 'Du hast das Recht, deine Daten in einem strukturierten, maschinenlesbaren Format zu erhalten.'],
                ['Widerspruchsrecht (Art. 21 DSGVO)', 'Du kannst der Verarbeitung auf Basis berechtigter Interessen widersprechen. Wir verarbeiten die Daten dann nicht mehr, es sei denn, es bestehen zwingende schutzwürdige Gründe.'],
                ['Widerruf von Einwilligungen (Art. 7 Abs. 3 DSGVO)', 'Eine erteilte Einwilligung (z.B. für Google Analytics) kannst du jederzeit mit Wirkung für die Zukunft widerrufen — über die Cookie-Einstellungen auf unserer Website.'],
              ].map(([title, desc]) => (
                <div key={title as string} className="rounded-xl p-3" style={{ background: '#F9F9F7', border: '1px solid #E5E7EB' }}>
                  <p className="font-semibold text-xs mb-0.5" style={{ color: '#1A1A1A' }}>{title}</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>{desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-4">
              Zur Ausübung deiner Rechte wende dich per E-Mail an:{' '}
              <a href="mailto:info.fotonizer@gmail.com" className="underline" style={{ color: '#C8A882' }}>
                info.fotonizer@gmail.com
              </a>
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A1A1A' }}>9. Beschwerderecht bei der Aufsichtsbehörde</h2>
            <p>
              Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung deiner
              personenbezogenen Daten durch uns zu beschweren. Die für Berlin zuständige Behörde ist:
            </p>
            <address className="not-italic mt-3 space-y-0.5 text-xs" style={{ color: '#374151' }}>
              <p className="font-medium">Berliner Beauftragte für Datenschutz und Informationsfreiheit</p>
              <p>Friedrichstr. 219, 10969 Berlin</p>
              <p>
                Website:{' '}
                <a href="https://www.datenschutz-berlin.de" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#C8A882' }}>
                  www.datenschutz-berlin.de
                </a>
              </p>
            </address>
            <p className="mt-3">
              Alternativ: Bundesbeauftragter für den Datenschutz und die Informationsfreiheit (BfDI),{' '}
              <a href="https://www.bfdi.bund.de" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#C8A882' }}>
                www.bfdi.bund.de
              </a>
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A1A1A' }}>10. Aktualität dieser Erklärung</h2>
            <p>
              Diese Datenschutzerklärung ist aktuell gültig und hat den Stand April 2026. Durch die
              Weiterentwicklung unserer Website oder geänderte gesetzliche Vorgaben kann es notwendig werden, diese
              Datenschutzerklärung anzupassen. Die jeweils aktuelle Version findest du stets unter{' '}
              <a href="/datenschutz" className="underline" style={{ color: '#C8A882' }}>fotonizer.com/datenschutz</a>.
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
