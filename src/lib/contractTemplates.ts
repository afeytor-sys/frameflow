export interface ContractTemplate {
  id: string
  name: string
  description: string
  content: string
}

// ─── English templates ────────────────────────────────────────────────────────
export const CONTRACT_TEMPLATES_EN: ContractTemplate[] = [
  {
    id: 'wedding',
    name: 'Wedding Photography',
    description: 'Standard contract for wedding photography',
    content: `<h2>Photography Contract – Wedding</h2>

<p>This contract is entered into between the photographer (hereinafter "Contractor") and the client (hereinafter "Client").</p>

<h3>1. Scope of Services</h3>
<p>The Contractor agrees to photographically document the Client's wedding celebration. The exact scope of services (date, time, location) is set out in the appendix.</p>

<h3>2. Compensation</h3>
<p>The agreed compensation is the amount stated in the offer. Payment is due as follows:</p>
<ul>
  <li>50% deposit upon signing of the contract</li>
  <li>50% no later than 14 days before the wedding date</li>
</ul>

<h3>3. Photo Delivery</h3>
<p>The edited photos will be delivered within 6–8 weeks after the wedding day via the client portal. The client will receive at least 400 edited photos in digital form.</p>

<h3>4. Usage Rights</h3>
<p>The client receives a simple right of use for private purposes. Commercial use requires the written consent of the photographer. The photographer retains the right to use selected images for portfolio and marketing purposes.</p>

<h3>5. Cancellation</h3>
<p>In case of cancellation by the client:</p>
<ul>
  <li>More than 90 days before the date: Refund of deposit minus a processing fee of €150</li>
  <li>30–90 days before the date: The deposit is forfeited</li>
  <li>Less than 30 days before the date: The full amount is due</li>
</ul>

<h3>6. Liability</h3>
<p>In case of force majeure (illness, accident, natural disaster) the photographer will provide an equivalent replacement photographer or fully refund the amount already paid.</p>

<h3>7. Data Protection</h3>
<p>The collected personal data will be used exclusively for contract processing and will not be passed on to third parties. The provisions of the GDPR apply.</p>

<h3>8. Final Provisions</h3>
<p>Amendments and additions to this contract require written form. German law applies.</p>`,
  },
  {
    id: 'portrait',
    name: 'Portrait Session',
    description: 'Contract for portrait and family shoots',
    content: `<h2>Photography Contract – Portrait Session</h2>

<p>This contract is entered into between the photographer (hereinafter "Contractor") and the client (hereinafter "Client").</p>

<h3>1. Scope of Services</h3>
<p>The photographer will conduct a portrait session. Date, time and location will be agreed separately. The session lasts approx. 1–2 hours.</p>

<h3>2. Compensation</h3>
<p>The agreed compensation is to be paid before or on the day of the session. Payment methods: bank transfer, PayPal or cash.</p>

<h3>3. Photo Delivery</h3>
<p>The client will receive 20–30 edited photos in digital form via the client portal within 2–3 weeks after the session. The client can mark up to 5 favorites to be edited first.</p>

<h3>4. Usage Rights</h3>
<p>The delivered photos may be used for private purposes, including social media. Commercial use is not permitted without a written agreement.</p>

<h3>5. Cancellation</h3>
<p>Cancellations must be made at least 48 hours before the appointment. For short-notice cancellations or no-shows, a cancellation fee of €50 will be charged.</p>

<h3>6. Data Protection</h3>
<p>The collected personal data will be used exclusively for contract processing. The provisions of the GDPR apply.</p>`,
  },
  {
    id: 'event',
    name: 'Event Photography',
    description: 'Contract for events, corporate events and parties',
    content: `<h2>Photography Contract – Event</h2>

<p>This contract is entered into between the photographer (hereinafter "Contractor") and the client (hereinafter "Client").</p>

<h3>1. Scope of Services</h3>
<p>The Contractor will photographically document the Client's event. The exact details (date, time, location, duration) are set out in the offer.</p>

<h3>2. Compensation</h3>
<p>The compensation is based on the agreed hourly rate or flat fee. Travel costs will be charged separately if the venue is more than 30 km from the photographer's location.</p>

<h3>3. Photo Delivery</h3>
<p>The edited photos will be delivered within 2–4 weeks after the event via the client portal. The number of delivered photos depends on the event duration (approx. 50–100 photos per hour).</p>

<h3>4. Usage Rights</h3>
<p>The client receives the right to use the photos for internal and external communication, including social media and marketing materials. The photographer retains the right to use them for portfolio purposes.</p>

<h3>5. Cancellation</h3>
<ul>
  <li>More than 14 days before the event: Free cancellation</li>
  <li>7–14 days before the event: 50% of the agreed fee</li>
  <li>Less than 7 days before the event: 100% of the agreed fee</li>
</ul>

<h3>6. Data Protection and Consent</h3>
<p>The client is responsible for ensuring that all persons depicted have consented to being photographed. The photographer assumes no liability for missing consents.</p>`,
  },
  {
    id: 'commercial',
    name: 'Commercial Photography',
    description: 'Contract for product and commercial photography',
    content: `<h2>Photography Contract – Commercial Photography</h2>

<p>This contract is entered into between the photographer (hereinafter "Contractor") and the client (hereinafter "Client").</p>

<h3>1. Scope of Services</h3>
<p>The photographer will create photographs according to the agreed briefing. Type, scope and technical requirements are documented in the briefing document.</p>

<h3>2. Compensation and Usage Rights</h3>
<p>The compensation consists of:</p>
<ul>
  <li>Production fee (shooting day)</li>
  <li>License fee (depending on type, duration and territory of use)</li>
</ul>
<p>The exact terms are specified in the offer.</p>

<h3>3. Photo Delivery</h3>
<p>The final images will be delivered within the agreed deadline in the specified formats. Raw files remain with the Contractor.</p>

<h3>4. Usage Rights</h3>
<p>The client receives only the usage rights specified in the offer. Any use beyond this requires a separate agreement and compensation.</p>

<h3>5. Changes and Corrections</h3>
<p>Up to 2 revision rounds are included in the price. Further changes will be charged by effort.</p>

<h3>6. Copyright</h3>
<p>The copyright remains with the photographer. The photos may only be used within the agreed scope.</p>`,
  },
]

// ─── German templates ─────────────────────────────────────────────────────────
export const CONTRACT_TEMPLATES_DE: ContractTemplate[] = [
  {
    id: 'wedding',
    name: 'Hochzeitsfotografie',
    description: 'Standardvertrag für Hochzeitsfotografie',
    content: `<h2>Fotografievertrag – Hochzeit</h2>

<p>Dieser Vertrag wird geschlossen zwischen dem Fotografen (nachfolgend „Auftragnehmer") und dem Kunden (nachfolgend „Auftraggeber").</p>

<h3>1. Leistungsumfang</h3>
<p>Der Auftragnehmer verpflichtet sich, die Hochzeitsfeier des Auftraggebers fotografisch zu dokumentieren. Der genaue Leistungsumfang (Datum, Uhrzeit, Ort) wird im Anhang festgehalten.</p>

<h3>2. Vergütung</h3>
<p>Die vereinbarte Vergütung entspricht dem im Angebot genannten Betrag. Die Zahlung erfolgt wie folgt:</p>
<ul>
  <li>50 % Anzahlung bei Vertragsunterzeichnung</li>
  <li>50 % spätestens 14 Tage vor dem Hochzeitsdatum</li>
</ul>

<h3>3. Bildlieferung</h3>
<p>Die bearbeiteten Fotos werden innerhalb von 6–8 Wochen nach dem Hochzeitstag über das Kundenportal geliefert. Der Auftraggeber erhält mindestens 400 bearbeitete Fotos in digitaler Form.</p>

<h3>4. Nutzungsrechte</h3>
<p>Der Auftraggeber erhält ein einfaches Nutzungsrecht für private Zwecke. Eine kommerzielle Nutzung bedarf der schriftlichen Zustimmung des Fotografen. Der Fotograf behält sich das Recht vor, ausgewählte Bilder für Portfolio- und Marketingzwecke zu verwenden.</p>

<h3>5. Stornierung</h3>
<p>Bei Stornierung durch den Auftraggeber:</p>
<ul>
  <li>Mehr als 90 Tage vor dem Termin: Rückerstattung der Anzahlung abzüglich einer Bearbeitungsgebühr von 150 €</li>
  <li>30–90 Tage vor dem Termin: Die Anzahlung verfällt</li>
  <li>Weniger als 30 Tage vor dem Termin: Der Gesamtbetrag ist fällig</li>
</ul>

<h3>6. Haftung</h3>
<p>Bei höherer Gewalt (Krankheit, Unfall, Naturkatastrophe) stellt der Fotograf einen gleichwertigen Ersatzfotografen oder erstattet den bereits gezahlten Betrag vollständig zurück.</p>

<h3>7. Datenschutz</h3>
<p>Die erhobenen personenbezogenen Daten werden ausschließlich zur Vertragsabwicklung verwendet und nicht an Dritte weitergegeben. Es gelten die Bestimmungen der DSGVO.</p>

<h3>8. Schlussbestimmungen</h3>
<p>Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform. Es gilt deutsches Recht.</p>`,
  },
  {
    id: 'portrait',
    name: 'Portrait-Session',
    description: 'Vertrag für Portrait- und Familienshootings',
    content: `<h2>Fotografievertrag – Portrait-Session</h2>

<p>Dieser Vertrag wird geschlossen zwischen dem Fotografen (nachfolgend „Auftragnehmer") und dem Kunden (nachfolgend „Auftraggeber").</p>

<h3>1. Leistungsumfang</h3>
<p>Der Fotograf führt eine Portrait-Session durch. Datum, Uhrzeit und Ort werden gesondert vereinbart. Die Session dauert ca. 1–2 Stunden.</p>

<h3>2. Vergütung</h3>
<p>Die vereinbarte Vergütung ist vor oder am Tag der Session zu entrichten. Zahlungsmethoden: Überweisung, PayPal oder Barzahlung.</p>

<h3>3. Bildlieferung</h3>
<p>Der Auftraggeber erhält innerhalb von 2–3 Wochen nach der Session 20–30 bearbeitete Fotos in digitaler Form über das Kundenportal. Der Auftraggeber kann bis zu 5 Favoriten markieren, die bevorzugt bearbeitet werden.</p>

<h3>4. Nutzungsrechte</h3>
<p>Die gelieferten Fotos dürfen für private Zwecke, einschließlich sozialer Medien, verwendet werden. Eine kommerzielle Nutzung ist ohne schriftliche Vereinbarung nicht gestattet.</p>

<h3>5. Stornierung</h3>
<p>Stornierungen müssen mindestens 48 Stunden vor dem Termin erfolgen. Bei kurzfristigen Absagen oder Nichterscheinen wird eine Stornogebühr von 50 € erhoben.</p>

<h3>6. Datenschutz</h3>
<p>Die erhobenen personenbezogenen Daten werden ausschließlich zur Vertragsabwicklung verwendet. Es gelten die Bestimmungen der DSGVO.</p>`,
  },
  {
    id: 'event',
    name: 'Event-Fotografie',
    description: 'Vertrag für Events, Firmenveranstaltungen und Partys',
    content: `<h2>Fotografievertrag – Event</h2>

<p>Dieser Vertrag wird geschlossen zwischen dem Fotografen (nachfolgend „Auftragnehmer") und dem Kunden (nachfolgend „Auftraggeber").</p>

<h3>1. Leistungsumfang</h3>
<p>Der Auftragnehmer dokumentiert das Event des Auftraggebers fotografisch. Die genauen Details (Datum, Uhrzeit, Ort, Dauer) werden im Angebot festgehalten.</p>

<h3>2. Vergütung</h3>
<p>Die Vergütung richtet sich nach dem vereinbarten Stundensatz oder der Pauschale. Fahrtkosten werden gesondert berechnet, wenn der Veranstaltungsort mehr als 30 km vom Standort des Fotografen entfernt ist.</p>

<h3>3. Bildlieferung</h3>
<p>Die bearbeiteten Fotos werden innerhalb von 2–4 Wochen nach dem Event über das Kundenportal geliefert. Die Anzahl der gelieferten Fotos hängt von der Eventdauer ab (ca. 50–100 Fotos pro Stunde).</p>

<h3>4. Nutzungsrechte</h3>
<p>Der Auftraggeber erhält das Recht, die Fotos für interne und externe Kommunikation, einschließlich sozialer Medien und Marketingmaterialien, zu verwenden. Der Fotograf behält sich das Recht vor, sie für Portfolio-Zwecke zu nutzen.</p>

<h3>5. Stornierung</h3>
<ul>
  <li>Mehr als 14 Tage vor dem Event: Kostenlose Stornierung</li>
  <li>7–14 Tage vor dem Event: 50 % des vereinbarten Honorars</li>
  <li>Weniger als 7 Tage vor dem Event: 100 % des vereinbarten Honorars</li>
</ul>

<h3>6. Datenschutz und Einwilligung</h3>
<p>Der Auftraggeber ist dafür verantwortlich, dass alle abgebildeten Personen der Fotografie zugestimmt haben. Der Fotograf übernimmt keine Haftung für fehlende Einwilligungen.</p>`,
  },
  {
    id: 'commercial',
    name: 'Kommerzielle Fotografie',
    description: 'Vertrag für Produkt- und Werbefotografie',
    content: `<h2>Fotografievertrag – Kommerzielle Fotografie</h2>

<p>Dieser Vertrag wird geschlossen zwischen dem Fotografen (nachfolgend „Auftragnehmer") und dem Kunden (nachfolgend „Auftraggeber").</p>

<h3>1. Leistungsumfang</h3>
<p>Der Fotograf erstellt Fotografien gemäß dem vereinbarten Briefing. Art, Umfang und technische Anforderungen sind im Briefing-Dokument festgehalten.</p>

<h3>2. Vergütung und Nutzungsrechte</h3>
<p>Die Vergütung setzt sich zusammen aus:</p>
<ul>
  <li>Produktionshonorar (Shooting-Tag)</li>
  <li>Lizenzgebühr (abhängig von Art, Dauer und Gebiet der Nutzung)</li>
</ul>
<p>Die genauen Konditionen werden im Angebot spezifiziert.</p>

<h3>3. Bildlieferung</h3>
<p>Die finalen Bilder werden innerhalb der vereinbarten Frist in den spezifizierten Formaten geliefert. Rohdaten verbleiben beim Auftragnehmer.</p>

<h3>4. Nutzungsrechte</h3>
<p>Der Auftraggeber erhält ausschließlich die im Angebot spezifizierten Nutzungsrechte. Jede darüber hinausgehende Nutzung bedarf einer gesonderten Vereinbarung und Vergütung.</p>

<h3>5. Änderungen und Korrekturen</h3>
<p>Im Preis sind bis zu 2 Korrekturschleifen enthalten. Weitere Änderungen werden nach Aufwand berechnet.</p>

<h3>6. Urheberrecht</h3>
<p>Das Urheberrecht verbleibt beim Fotografen. Die Fotos dürfen nur im vereinbarten Rahmen genutzt werden.</p>`,
  },
]

// ─── Helper ───────────────────────────────────────────────────────────────────
export function getContractTemplatesForLocale(locale: 'en' | 'de'): ContractTemplate[] {
  return locale === 'de' ? CONTRACT_TEMPLATES_DE : CONTRACT_TEMPLATES_EN
}

// Keep backward compat
export const CONTRACT_TEMPLATES = CONTRACT_TEMPLATES_DE

export function getTemplate(id: string): ContractTemplate | undefined {
  return CONTRACT_TEMPLATES.find((t) => t.id === id)
}
