export interface ContractTemplate {
  id: string
  name: string
  description: string
  content: string
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'wedding',
    name: 'Hochzeitsfotografie',
    description: 'Standard contract for wedding photography',
    content: `<h2>Fotografievertrag – Hochzeit</h2>

<p>Dieser Vertrag wird geschlossen zwischen dem Fotografen (nachfolgend „Auftragnehmer") und dem Kunden (nachfolgend „Auftraggeber").</p>

<h3>1. Leistungsumfang</h3>
<p>Der Auftragnehmer verpflichtet sich, die Hochzeitsfeier des Auftraggebers fotografisch zu dokumentieren. Der genaue Leistungsumfang (Datum, Uhrzeit, Ort) wird im Anhang festgehalten.</p>

<h3>2. Compensation</h3>
<p>The agreed compensation is the amount stated in the offer. Payment is due as follows:</p>
<ul>
  <li>50 % Anzahlung bei Vertragsunterzeichnung</li>
  <li>50% no later than 14 days before the wedding date</li>
</ul>

<h3>3. Bildlieferung</h3>
<p>The edited photos will be delivered within 6–8 weeks after the wedding day via the Fotonizer client portal. The client will receive at least 400 edited photos in digital form.</p>

<h3>4. Nutzungsrechte</h3>
<p>The client receives a simple right of use for private purposes. Commercial use requires the written consent of the photographer. The photographer retains the right to use selected images for portfolio and marketing purposes.</p>

<h3>5. Cancellation</h3>
<p>Bei Stornierung durch den Auftraggeber:</p>
<ul>
  <li>More than 90 days before the date: Refund of deposit minus a processing fee of €150</li>
  <li>30–90 days before the date: The deposit is forfeited</li>
  <li>Less than 30 days before the date: The full amount is due</li>
</ul>

<h3>6. Haftung</h3>
<p>In case of force majeure (illness, accident, natural disaster) the photographer will provide an equivalent replacement photographer or fully refund the amount already paid.</p>

<h3>7. Datenschutz</h3>
<p>The collected personal data will be used exclusively for contract processing and will not be passed on to third parties. The provisions of the GDPR apply.</p>

<h3>8. Schlussbestimmungen</h3>
<p>Amendments and additions to this contract require written form. German law applies.</p>`,
  },
  {
    id: 'portrait',
    name: 'Portrait-Session',
    description: 'Contract for portrait and family shoots',
    content: `<h2>Fotografievertrag – Portrait-Session</h2>

<p>Dieser Vertrag wird geschlossen zwischen dem Fotografen (nachfolgend „Auftragnehmer") und dem Kunden (nachfolgend „Auftraggeber").</p>

<h3>1. Leistungsumfang</h3>
<p>The photographer will conduct a portrait session. Date, time and location will be agreed separately. The session lasts approx. 1–2 hours.</p>

<h3>2. Compensation</h3>
<p>The agreed compensation is to be paid before or on the day of the session. Payment methods: bank transfer, PayPal or cash.</p>

<h3>3. Bildlieferung</h3>
<p>The client will receive 20–30 edited photos in digital form via the Fotonizer client portal within 2–3 weeks after the session. The client can mark up to 5 favorites to be edited first.</p>

<h3>4. Nutzungsrechte</h3>
<p>The delivered photos may be used for private purposes, including social media. Commercial use is not permitted without a written agreement.</p>

<h3>5. Stornierung</h3>
<p>Cancellations must be made at least 48 hours before the appointment. For short-notice cancellations or no-shows, a cancellation fee of €50 will be charged.</p>

<h3>6. Datenschutz</h3>
<p>The collected personal data will be used exclusively for contract processing. The provisions of the GDPR apply.</p>`,
  },
  {
    id: 'event',
    name: 'Event-Fotografie',
    description: 'Contract for events, corporate events and parties',
    content: `<h2>Fotografievertrag – Event</h2>

<p>Dieser Vertrag wird geschlossen zwischen dem Fotografen (nachfolgend „Auftragnehmer") und dem Kunden (nachfolgend „Auftraggeber").</p>

<h3>1. Leistungsumfang</h3>
<p>Der Auftragnehmer dokumentiert das Event des Auftraggebers fotografisch. Die genauen Details (Datum, Uhrzeit, Ort, Dauer) werden im Angebot festgehalten.</p>

<h3>2. Compensation</h3>
<p>The compensation is based on the agreed hourly rate or flat fee. Travel costs will be charged separately if the venue is more than 30 km from the photographer's location.</p>

<h3>3. Bildlieferung</h3>
<p>The edited photos will be delivered within 2–4 weeks after the event via the Fotonizer client portal. The number of delivered photos depends on the event duration (approx. 50–100 photos per hour).</p>

<h3>4. Nutzungsrechte</h3>
<p>The client receives the right to use the photos for internal and external communication, including social media and marketing materials. The photographer retains the right to use them for portfolio purposes.</p>

<h3>5. Stornierung</h3>
<ul>
  <li>Mehr als 14 Tage vor dem Event: Kostenlose Stornierung</li>
  <li>7–14 Tage vor dem Event: 50 % des vereinbarten Honorars</li>
  <li>Weniger als 7 Tage vor dem Event: 100 % des vereinbarten Honorars</li>
</ul>

<h3>6. Datenschutz und Einwilligung</h3>
<p>The client is responsible for ensuring that all persons depicted have consented to being photographed. The photographer assumes no liability for missing consents.</p>`,
  },
  {
    id: 'commercial',
    name: 'Kommerzielle Fotografie',
    description: 'Contract for product and commercial photography',
    content: `<h2>Fotografievertrag – Kommerzielle Fotografie</h2>

<p>Dieser Vertrag wird geschlossen zwischen dem Fotografen (nachfolgend „Auftragnehmer") und dem Kunden (nachfolgend „Auftraggeber").</p>

<h3>1. Leistungsumfang</h3>
<p>The photographer will create photographs according to the agreed briefing. Type, scope and technical requirements are documented in the briefing document.</p>

<h3>2. Compensation and usage rights</h3>
<p>The compensation consists of:</p>
<ul>
  <li>Produktionshonorar (Shooting-Tag)</li>
  <li>License fee (depending on type, duration and territory of use)</li>
</ul>
<p>Die genauen Konditionen werden im Angebot spezifiziert.</p>

<h3>3. Bildlieferung</h3>
<p>Die finalen Bilder werden innerhalb der vereinbarten Frist in den spezifizierten Formaten geliefert. Rohdaten verbleiben beim Auftragnehmer.</p>

<h3>4. Nutzungsrechte</h3>
<p>The client receives only the usage rights specified in the offer. Any use beyond this requires a separate agreement and compensation.</p>

<h3>5. Changes and corrections</h3>
<p>Up to 2 revision rounds are included in the price. Further changes will be charged by effort.</p>

<h3>6. Urheberrecht</h3>
<p>The copyright remains with the photographer. The photos may only be used within the agreed scope.</p>`,
  },
]

export function getTemplate(id: string): ContractTemplate | undefined {
  return CONTRACT_TEMPLATES.find((t) => t.id === id)
}
