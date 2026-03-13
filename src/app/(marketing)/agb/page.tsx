export default function AGBPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="font-display text-3xl font-bold text-[#1A1A1A] mb-2">Allgemeine Geschäftsbedingungen</h1>
        <p className="text-sm text-[#6B6B6B] mb-8">Stand: März 2026</p>

        <div className="space-y-8 text-sm text-[#6B6B6B]">
          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">§ 1 Geltungsbereich</h2>
            <p>
              Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen
              [Firmenname] (nachfolgend „Anbieter") und den Nutzern der Plattform Studioflow
              (nachfolgend „Nutzer").
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">§ 2 Leistungsbeschreibung</h2>
            <p>
              Studioflow ist eine webbasierte Software-as-a-Service-Plattform für Fotografen.
              Sie ermöglicht die Verwaltung von Kundenprojekten, digitalen Verträgen,
              Fotogalerien und Zeitplänen.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">§ 3 Vertragsschluss</h2>
            <p>
              Der Vertrag kommt durch die Registrierung auf der Plattform und die Bestätigung
              der E-Mail-Adresse zustande. Mit der Registrierung akzeptiert der Nutzer diese AGB.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">§ 4 Preise und Zahlung</h2>
            <p>
              Die aktuellen Preise sind auf der Preisseite einsehbar. Zahlungen werden monatlich
              oder jährlich im Voraus über Stripe abgewickelt. Alle Preise verstehen sich
              zzgl. der gesetzlichen Mehrwertsteuer.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">§ 5 Kündigung</h2>
            <p>
              Der Nutzer kann sein Abonnement jederzeit zum Ende des aktuellen Abrechnungszeitraums
              kündigen. Die Kündigung erfolgt über das Stripe-Kundenportal im Dashboard.
              Nach der Kündigung wird der Account auf den kostenlosen Plan zurückgesetzt.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">§ 6 Nutzungsrechte</h2>
            <p>
              Der Nutzer erhält ein nicht-exklusives, nicht übertragbares Recht zur Nutzung
              der Plattform für die Dauer des Abonnements. Der Nutzer bleibt Eigentümer
              aller hochgeladenen Inhalte.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">§ 7 Haftungsbeschränkung</h2>
            <p>
              Der Anbieter haftet nicht für Datenverluste, entgangene Gewinne oder indirekte
              Schäden. Die Haftung ist auf den Betrag begrenzt, den der Nutzer in den letzten
              12 Monaten gezahlt hat.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">§ 8 Verfügbarkeit</h2>
            <p>
              Der Anbieter strebt eine Verfügbarkeit von 99,5% an, übernimmt jedoch keine
              Garantie. Wartungsarbeiten werden nach Möglichkeit außerhalb der Hauptnutzungszeiten
              durchgeführt.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">§ 9 Anwendbares Recht</h2>
            <p>
              Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts.
              Gerichtsstand ist [Ort des Anbieters].
            </p>
          </section>

          <p className="text-xs text-[#C0C0C0] pt-4 border-t border-[#E8E8E4]">
            ⚠️ Diese AGB sind ein Platzhalter. Bitte lass sie von einem Rechtsanwalt prüfen
            und passe alle Angaben in eckigen Klammern an, bevor du die Seite veröffentlichst.
          </p>
        </div>

        <div className="mt-8">
          <a href="/" className="text-sm text-[#C8A882] hover:underline">← Zurück zur Startseite</a>
        </div>
      </div>
    </div>
  )
}
