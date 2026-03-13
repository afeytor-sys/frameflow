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
    description: 'Standardvertrag für Hochzeitsreportagen',
    content: `<h2>Fotografievertrag – Hochzeit</h2>

<p>Dieser Vertrag wird geschlossen zwischen dem Fotografen (nachfolgend „Auftragnehmer") und dem Kunden (nachfolgend „Auftraggeber").</p>

<h3>1. Leistungsumfang</h3>
<p>Der Auftragnehmer verpflichtet sich, die Hochzeitsfeier des Auftraggebers fotografisch zu dokumentieren. Der genaue Leistungsumfang (Datum, Uhrzeit, Ort) wird im Anhang festgehalten.</p>

<h3>2. Vergütung</h3>
<p>Die vereinbarte Vergütung beträgt den im Angebot genannten Betrag. Die Zahlung ist wie folgt fällig:</p>
<ul>
  <li>50 % Anzahlung bei Vertragsunterzeichnung</li>
  <li>50 % spätestens 14 Tage vor dem Hochzeitstermin</li>
</ul>

<h3>3. Bildlieferung</h3>
<p>Die bearbeiteten Bilder werden innerhalb von 6–8 Wochen nach dem Hochzeitstag über das Studioflow-Kundenportal bereitgestellt. Der Auftraggeber erhält mindestens 400 bearbeitete Bilder in digitaler Form.</p>

<h3>4. Nutzungsrechte</h3>
<p>Der Auftraggeber erhält das einfache Nutzungsrecht für private Zwecke. Eine kommerzielle Nutzung bedarf der schriftlichen Zustimmung des Auftragnehmers. Der Auftragnehmer behält das Recht, ausgewählte Bilder für Portfolio- und Marketingzwecke zu verwenden.</p>

<h3>5. Rücktritt und Stornierung</h3>
<p>Bei Stornierung durch den Auftraggeber:</p>
<ul>
  <li>Mehr als 90 Tage vor dem Termin: Rückerstattung der Anzahlung abzüglich einer Bearbeitungsgebühr von 150 €</li>
  <li>30–90 Tage vor dem Termin: Die Anzahlung verfällt</li>
  <li>Weniger als 30 Tage vor dem Termin: Der volle Betrag ist fällig</li>
</ul>

<h3>6. Haftung</h3>
<p>Im Falle höherer Gewalt (Krankheit, Unfall, Naturkatastrophe) wird der Auftragnehmer einen gleichwertigen Ersatzfotografen stellen oder den bereits gezahlten Betrag vollständig erstatten.</p>

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
<p>Der Auftragnehmer führt eine Portrait-Session durch. Datum, Uhrzeit und Ort werden separat vereinbart. Die Session dauert ca. 1–2 Stunden.</p>

<h3>2. Vergütung</h3>
<p>Die vereinbarte Vergütung ist vor oder am Tag der Session zu entrichten. Zahlungsmethoden: Überweisung, PayPal oder Barzahlung.</p>

<h3>3. Bildlieferung</h3>
<p>Der Auftraggeber erhält innerhalb von 2–3 Wochen nach der Session 20–30 bearbeitete Bilder in digitaler Form über das Studioflow-Kundenportal. Der Auftraggeber kann bis zu 5 Favoriten markieren, die bevorzugt bearbeitet werden.</p>

<h3>4. Nutzungsrechte</h3>
<p>Die gelieferten Bilder dürfen für private Zwecke genutzt werden, einschließlich sozialer Medien. Eine kommerzielle Nutzung ist nicht gestattet ohne schriftliche Vereinbarung.</p>

<h3>5. Stornierung</h3>
<p>Stornierungen müssen mindestens 48 Stunden vor dem Termin erfolgen. Bei kurzfristiger Absage oder Nichterscheinen wird eine Ausfallgebühr von 50 € berechnet.</p>

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
<p>Die Vergütung richtet sich nach dem vereinbarten Stundensatz oder Pauschalpreis. Reisekosten werden separat berechnet, sofern der Veranstaltungsort mehr als 30 km vom Standort des Fotografen entfernt ist.</p>

<h3>3. Bildlieferung</h3>
<p>Die bearbeiteten Bilder werden innerhalb von 2–4 Wochen nach dem Event über das Studioflow-Kundenportal bereitgestellt. Die Anzahl der gelieferten Bilder richtet sich nach der Eventdauer (ca. 50–100 Bilder pro Stunde).</p>

<h3>4. Nutzungsrechte</h3>
<p>Der Auftraggeber erhält das Recht, die Bilder für interne und externe Kommunikation zu nutzen, einschließlich sozialer Medien und Marketingmaterialien. Der Auftragnehmer behält das Recht zur Portfolio-Nutzung.</p>

<h3>5. Stornierung</h3>
<ul>
  <li>Mehr als 14 Tage vor dem Event: Kostenlose Stornierung</li>
  <li>7–14 Tage vor dem Event: 50 % des vereinbarten Honorars</li>
  <li>Weniger als 7 Tage vor dem Event: 100 % des vereinbarten Honorars</li>
</ul>

<h3>6. Datenschutz und Einwilligung</h3>
<p>Der Auftraggeber ist verantwortlich dafür, dass alle abgebildeten Personen mit der Fotografie einverstanden sind. Der Auftragnehmer übernimmt keine Haftung für fehlende Einwilligungen.</p>`,
  },
  {
    id: 'commercial',
    name: 'Kommerzielle Fotografie',
    description: 'Vertrag für Produkt- und Werbefotografie',
    content: `<h2>Fotografievertrag – Kommerzielle Fotografie</h2>

<p>Dieser Vertrag wird geschlossen zwischen dem Fotografen (nachfolgend „Auftragnehmer") und dem Kunden (nachfolgend „Auftraggeber").</p>

<h3>1. Leistungsumfang</h3>
<p>Der Auftragnehmer erstellt Fotografien gemäß dem vereinbarten Briefing. Art, Umfang und technische Anforderungen werden im Briefing-Dokument festgehalten.</p>

<h3>2. Vergütung und Nutzungsrechte</h3>
<p>Die Vergütung setzt sich zusammen aus:</p>
<ul>
  <li>Produktionshonorar (Shooting-Tag)</li>
  <li>Lizenzgebühr (abhängig von Nutzungsart, -dauer und -gebiet)</li>
</ul>
<p>Die genauen Konditionen werden im Angebot spezifiziert.</p>

<h3>3. Bildlieferung</h3>
<p>Die finalen Bilder werden innerhalb der vereinbarten Frist in den spezifizierten Formaten geliefert. Rohdaten verbleiben beim Auftragnehmer.</p>

<h3>4. Nutzungsrechte</h3>
<p>Der Auftraggeber erhält ausschließlich die im Angebot spezifizierten Nutzungsrechte. Jede darüber hinausgehende Nutzung bedarf einer gesonderten Vereinbarung und Vergütung.</p>

<h3>5. Änderungen und Korrekturen</h3>
<p>Im Preis inbegriffen sind bis zu 2 Korrekturschleifen. Weitere Änderungen werden nach Aufwand berechnet.</p>

<h3>6. Urheberrecht</h3>
<p>Das Urheberrecht verbleibt beim Auftragnehmer. Die Bilder dürfen nur im vereinbarten Rahmen genutzt werden.</p>`,
  },
]

export function getTemplate(id: string): ContractTemplate | undefined {
  return CONTRACT_TEMPLATES.find((t) => t.id === id)
}
