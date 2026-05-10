export interface OfferTemplateService {
  title: string
  description?: string
  included: boolean
}

export interface OfferTemplateExtra {
  title: string
  description?: string
  price: number   // cents
}

export interface OfferTemplate {
  id: string
  label: string
  introText: string
  services: OfferTemplateService[]
  extras: OfferTemplateExtra[]
  basePrice: number   // cents — suggestion only
  notes: string
}

export const OFFER_TEMPLATES: OfferTemplate[] = [
  {
    id: 'hochzeit-ganz',
    label: 'Hochzeit (Ganztag)',
    introText: 'Ich freue mich sehr, euch ein individuelles Angebot für euren besonderen Tag zusammenstellen zu dürfen. Dieses Angebot wurde speziell für euch erstellt und beinhaltet alles, was ihr für eine vollständige Hochzeitsreportage benötigt.',
    basePrice: 280000,
    notes: '',
    services: [
      { title: '8 Stunden Fotobegleitung', description: 'Von den Vorbereitungen bis zur Feier', included: true },
      { title: 'Vorbereitung & Getting Ready', included: true },
      { title: 'Standesamt oder freie Trauung', included: true },
      { title: 'Familien- & Gruppenfotos', included: true },
      { title: 'Brautpaarportraits', included: true },
      { title: 'Feier & Abendprogramm', included: true },
      { title: 'Online-Galerie (12 Monate)', description: 'Mit Download & Favoritenfunktion', included: true },
      { title: 'Druckfreigabe aller Bilder', included: true },
      { title: 'Anreise & Reisekosten', included: true },
    ],
    extras: [
      { title: 'Zweiter Fotograf', description: 'Zusätzliche Perspektiven', price: 50000 },
      { title: 'Verlobungsshooting', description: 'Kennenlernshooting vorab', price: 25000 },
      { title: 'Fotoalbum (30×30 cm)', description: 'Hochwertiges Lay-flat Album', price: 65000 },
      { title: 'Express-Galerie (72h)', description: 'Schnelle Lieferung der Bilder', price: 15000 },
      { title: 'Videographer', description: 'Koordination mit Kamerateam', price: 0 },
    ],
  },
  {
    id: 'hochzeit-halb',
    label: 'Hochzeit (Halbtag)',
    introText: 'Hier ist euer persönliches Angebot für eine kompakte Hochzeitsreportage. Der Fokus liegt auf den wichtigsten Momenten eures Tages.',
    basePrice: 160000,
    notes: '',
    services: [
      { title: '4 Stunden Fotobegleitung', included: true },
      { title: 'Standesamt oder freie Trauung', included: true },
      { title: 'Brautpaarportraits', included: true },
      { title: 'Familien- & Gruppenfotos', included: true },
      { title: 'Online-Galerie (12 Monate)', included: true },
      { title: 'Druckfreigabe aller Bilder', included: true },
    ],
    extras: [
      { title: 'Zweiter Fotograf', price: 40000 },
      { title: 'Fotoalbum (30×30 cm)', price: 65000 },
      { title: 'Extra-Stunde', price: 20000 },
    ],
  },
  {
    id: 'couple',
    label: 'Couple / Portrait',
    introText: 'Ich freue mich auf unser gemeinsames Shooting! Dieses Angebot enthält alles für ein entspanntes und authentisches Portraitshooting.',
    basePrice: 35000,
    notes: '',
    services: [
      { title: '1,5 Stunden Shooting', included: true },
      { title: 'Freie Ortswahl', description: 'Ich komme zu euch oder gemeinsam gewähltem Ort', included: true },
      { title: 'Online-Galerie', description: 'Mit Downloadfunktion', included: true },
      { title: 'Druckfreigabe aller Bilder', included: true },
    ],
    extras: [
      { title: 'Zweites Outfit / Location', price: 8000 },
      { title: 'Express-Galerie (48h)', price: 6000 },
      { title: 'Prints (A4, 3 Stück)', price: 4500 },
    ],
  },
  {
    id: 'branding',
    label: 'Branding / Business',
    introText: 'Hier ist dein persönliches Branding-Angebot. Professionelle Fotos, die deine Marke und Persönlichkeit authentisch zeigen.',
    basePrice: 85000,
    notes: '',
    services: [
      { title: '3 Stunden Shooting', included: true },
      { title: 'Moodboard & Vorbereitung', description: 'Gemeinsame Planung vorab', included: true },
      { title: 'Business-Portraits', included: true },
      { title: 'Lifestyle & Work-Aufnahmen', included: true },
      { title: 'Online-Galerie', included: true },
      { title: 'Druckfreigabe & Commercial Rights', included: true },
    ],
    extras: [
      { title: 'Produkt-Flatlay Shots', price: 15000 },
      { title: 'Kurz-Video Reel (30s)', price: 30000 },
      { title: 'Extra-Stunde', price: 20000 },
    ],
  },
  {
    id: 'corporate',
    label: 'Corporate / Event',
    introText: 'Ihr Angebot für professionelle Unternehmensfotos und Eventberichterstattung. Bilder, die Ihr Team und Ihre Veranstaltung optimal in Szene setzen.',
    basePrice: 120000,
    notes: '',
    services: [
      { title: 'Ganztagige Begleitung (6h)', included: true },
      { title: 'Teamportraits', included: true },
      { title: 'Gruppenfotos', included: true },
      { title: 'Eventdokumentation', included: true },
      { title: 'Online-Galerie mit Downloadbereich', included: true },
      { title: 'Commercial Lizenz', included: true },
    ],
    extras: [
      { title: 'Video-Zusammenfassung', price: 50000 },
      { title: 'Same-Day-Edit (ausgewählte Bilder)', price: 25000 },
      { title: 'Einzelne Mitarbeiterportraits (extra)', price: 20000 },
    ],
  },
  {
    id: 'family',
    label: 'Familie',
    introText: 'Schön, dass ihr Familienmomente festhalten möchtet! Hier ist euer persönliches Angebot für ein entspanntes Familienshooting.',
    basePrice: 28000,
    notes: '',
    services: [
      { title: '1 Stunde Shooting', included: true },
      { title: 'Freie Ortswahl', included: true },
      { title: 'Online-Galerie', description: 'Mit Downloadfunktion', included: true },
      { title: 'Druckfreigabe aller Bilder', included: true },
    ],
    extras: [
      { title: 'Fotoalbum (20×20 cm)', price: 35000 },
      { title: 'Extra-30-Minuten', price: 7000 },
      { title: 'Weihnachtskarten-Set (10 Stück)', price: 8000 },
    ],
  },
  {
    id: 'mini',
    label: 'Mini Session',
    introText: 'Du hast einen Platz für eine meiner Mini Sessions gebucht! Hier findest du alle Infos zu deinem Termin.',
    basePrice: 12000,
    notes: '',
    services: [
      { title: '30 Minuten Shooting', included: true },
      { title: 'Online-Galerie', included: true },
      { title: 'Druckfreigabe', included: true },
    ],
    extras: [
      { title: 'Prints (A5, 3 Stück)', price: 2500 },
      { title: 'Digitale Grußkarte', price: 1500 },
    ],
  },
]

export function getOfferTemplate(id: string): OfferTemplate | undefined {
  return OFFER_TEMPLATES.find(t => t.id === id)
}
