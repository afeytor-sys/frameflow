export type GridLayout = '2col' | '3col' | '4col' | 'masonry'

export interface GalleryTheme {
  key: string
  name: string
  moodName: string
  bg: string
  surface: string
  text: string
  textMuted: string
  accent: string
  border: string
  fontFamily: string
  fontImport?: string
  grid: GridLayout
  titleSize: string
  headerStyle: 'minimal' | 'centered' | 'bold'
}

export const GALLERY_THEMES: GalleryTheme[] = [
  {
    key: 'classic-white',
    name: 'Classic White',
    moodName: 'Pure',
    bg: '#FFFFFF',
    surface: '#F9F9F7',
    text: '#111111',
    textMuted: '#6B7280',
    accent: '#C4A47C',
    border: '#E5E7EB',
    fontFamily: '"DM Sans", system-ui, sans-serif',
    grid: '3col',
    titleSize: '2rem',
    headerStyle: 'minimal',
  },
  {
    key: 'midnight-black',
    name: 'Midnight Black',
    moodName: 'Midnight',
    bg: '#0A0A0A',
    surface: '#141414',
    text: '#F5F5F3',
    textMuted: '#9CA3AF',
    accent: '#C4A47C',
    border: '#2A2A2A',
    fontFamily: '"Playfair Display", Georgia, serif',
    fontImport: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap',
    grid: '3col',
    titleSize: '2.5rem',
    headerStyle: 'centered',
  },
  {
    key: 'warm-ivory',
    name: 'Warm Ivory',
    moodName: 'Romantic',
    bg: '#FAF7F2',
    surface: '#F3EDE3',
    text: '#2C2416',
    textMuted: '#8B7355',
    accent: '#B8956A',
    border: '#E8DDD0',
    fontFamily: '"Cormorant Garamond", Georgia, serif',
    fontImport: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&display=swap',
    grid: '2col',
    titleSize: '2.8rem',
    headerStyle: 'centered',
  },
  {
    key: 'editorial',
    name: 'Editorial',
    moodName: 'Editorial',
    bg: '#F2F2F0',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textMuted: '#6B6B6B',
    accent: '#1A1A1A',
    border: '#D4D4D0',
    fontFamily: '"Libre Baskerville", Georgia, serif',
    fontImport: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap',
    grid: 'masonry',
    titleSize: '2.2rem',
    headerStyle: 'bold',
  },
  {
    key: 'minimal-dark',
    name: 'Minimal Dark',
    moodName: 'Cinematic',
    bg: '#1C1C1E',
    surface: '#2C2C2E',
    text: '#EBEBF0',
    textMuted: '#8E8E93',
    accent: '#636366',
    border: '#3A3A3C',
    fontFamily: '"Inter", system-ui, sans-serif',
    grid: '4col',
    titleSize: '1.8rem',
    headerStyle: 'minimal',
  },
  {
    key: 'golden-hour',
    name: 'Golden Hour',
    moodName: 'Golden Hour',
    bg: '#FDF8F0',
    surface: '#FFF8EC',
    text: '#3D2B1F',
    textMuted: '#9C7A5A',
    accent: '#D4A853',
    border: '#F0E0C8',
    fontFamily: '"Lora", Georgia, serif',
    fontImport: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&display=swap',
    grid: '2col',
    titleSize: '2.6rem',
    headerStyle: 'centered',
  },
  {
    key: 'forest',
    name: 'Forest',
    moodName: 'Forest',
    bg: '#1A2318',
    surface: '#243020',
    text: '#E8F0E4',
    textMuted: '#8FAB88',
    accent: '#6BAF5E',
    border: '#2E3D2A',
    fontFamily: '"Josefin Sans", system-ui, sans-serif',
    fontImport: 'https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;600&display=swap',
    grid: '3col',
    titleSize: '2rem',
    headerStyle: 'minimal',
  },
  {
    key: 'blush',
    name: 'Blush',
    moodName: 'Blush',
    bg: '#FDF5F5',
    surface: '#FFF0F0',
    text: '#3D1F1F',
    textMuted: '#B08080',
    accent: '#D4848A',
    border: '#F0D8D8',
    fontFamily: '"Raleway", system-ui, sans-serif',
    fontImport: 'https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;600&display=swap',
    grid: 'masonry',
    titleSize: '2.4rem',
    headerStyle: 'centered',
  },
  {
    key: 'monochrome',
    name: 'Monochrome',
    moodName: 'Monochrome',
    bg: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#000000',
    textMuted: '#555555',
    accent: '#000000',
    border: '#E0E0E0',
    fontFamily: '"Space Grotesk", system-ui, sans-serif',
    fontImport: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;600&display=swap',
    grid: '4col',
    titleSize: '1.6rem',
    headerStyle: 'bold',
  },
  {
    key: 'luxury',
    name: 'Luxury',
    moodName: 'Luxury',
    bg: '#0D0D0D',
    surface: '#1A1A1A',
    text: '#F0E6D0',
    textMuted: '#8A7A60',
    accent: '#C9A84C',
    border: '#2A2520',
    fontFamily: '"Cinzel", Georgia, serif',
    fontImport: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap',
    grid: '2col',
    titleSize: '2.8rem',
    headerStyle: 'centered',
  },
  {
    key: 'olive',
    name: 'Olive',
    moodName: 'Botanik',
    bg: '#FAFAF6',
    surface: '#F2F2EA',
    text: '#22221A',
    textMuted: '#7A7A5E',
    accent: '#7C8C42',
    border: '#E0E0D0',
    fontFamily: '"EB Garamond", Georgia, serif',
    fontImport: 'https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&display=swap',
    grid: '3col',
    titleSize: '2.4rem',
    headerStyle: 'minimal',
  },
  {
    key: 'sand',
    name: 'Sand',
    moodName: 'Sand',
    bg: '#FAF6EE',
    surface: '#F2EADB',
    text: '#2A1E10',
    textMuted: '#9A8A6A',
    accent: '#C4A060',
    border: '#E8DCCA',
    fontFamily: '"Josefin Sans", system-ui, sans-serif',
    fontImport: 'https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;600&display=swap',
    grid: '3col',
    titleSize: '2.2rem',
    headerStyle: 'minimal',
  },
  {
    key: 'terracotta',
    name: 'Terracotta',
    moodName: 'Terracotta',
    bg: '#FBF3EE',
    surface: '#F4E4D8',
    text: '#2C1A10',
    textMuted: '#A0705A',
    accent: '#C4583A',
    border: '#E8D0C0',
    fontFamily: '"Lora", Georgia, serif',
    fontImport: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&display=swap',
    grid: 'masonry',
    titleSize: '2.4rem',
    headerStyle: 'bold',
  },
  {
    key: 'champagne',
    name: 'Champagne',
    moodName: 'Champagne',
    bg: '#FDF8F0',
    surface: '#F8F0E0',
    text: '#2A2216',
    textMuted: '#9A8A60',
    accent: '#D4B868',
    border: '#EEE2C8',
    fontFamily: '"Cormorant Garamond", Georgia, serif',
    fontImport: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&display=swap',
    grid: '2col',
    titleSize: '2.8rem',
    headerStyle: 'centered',
  },
  {
    key: 'nordic',
    name: 'Nordic',
    moodName: 'Nordic',
    bg: '#F4F6F8',
    surface: '#EBEEF2',
    text: '#1A1E2A',
    textMuted: '#7A8494',
    accent: '#4A6480',
    border: '#D4D8E0',
    fontFamily: '"Space Grotesk", system-ui, sans-serif',
    fontImport: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;600&display=swap',
    grid: '4col',
    titleSize: '1.8rem',
    headerStyle: 'minimal',
  },
]

export function getTheme(key: string): GalleryTheme {
  return GALLERY_THEMES.find(t => t.key === key) ?? GALLERY_THEMES[0]
}

// ── Typography Presets ────────────────────────────────────────────────────────

export interface TypographyPreset {
  key: string
  name: string
  description: string
  fontFamily: string
  fontImport?: string
  titleWeight: number
  titleTracking: string
  titleLineHeight: number
  subtitleTracking: string
  subtitleUppercase: boolean
}

export const TYPOGRAPHY_PRESETS: TypographyPreset[] = [
  {
    key: 'editorial-serif',
    name: 'Editorial Serif',
    description: 'Zeitlos, elegant',
    fontFamily: '"Cormorant Garamond", Georgia, serif',
    fontImport: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&display=swap',
    titleWeight: 300,
    titleTracking: '0.04em',
    titleLineHeight: 1.1,
    subtitleTracking: '0.18em',
    subtitleUppercase: true,
  },
  {
    key: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean, zeitgemäß',
    fontFamily: '"Inter", system-ui, sans-serif',
    titleWeight: 300,
    titleTracking: '-0.02em',
    titleLineHeight: 1.15,
    subtitleTracking: '0.12em',
    subtitleUppercase: false,
  },
  {
    key: 'timeless-luxury',
    name: 'Timeless Luxury',
    description: 'Premium, verfeinert',
    fontFamily: '"Playfair Display", Georgia, serif',
    fontImport: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap',
    titleWeight: 400,
    titleTracking: '0.06em',
    titleLineHeight: 1.1,
    subtitleTracking: '0.22em',
    subtitleUppercase: true,
  },
  {
    key: 'fashion-magazine',
    name: 'Fashion Magazine',
    description: 'Bold, direkt',
    fontFamily: '"Libre Baskerville", Georgia, serif',
    fontImport: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap',
    titleWeight: 700,
    titleTracking: '0.08em',
    titleLineHeight: 1.0,
    subtitleTracking: '0.24em',
    subtitleUppercase: true,
  },
  {
    key: 'documentary',
    name: 'Documentary',
    description: 'Authentisch, direkt',
    fontFamily: '"Space Grotesk", system-ui, sans-serif',
    fontImport: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;600&display=swap',
    titleWeight: 500,
    titleTracking: '0em',
    titleLineHeight: 1.15,
    subtitleTracking: '0.06em',
    subtitleUppercase: false,
  },
  {
    key: 'soft-romantic',
    name: 'Soft Romantic',
    description: 'Zart, romantisch',
    fontFamily: '"Lora", Georgia, serif',
    fontImport: 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&display=swap',
    titleWeight: 300,
    titleTracking: '0.06em',
    titleLineHeight: 1.2,
    subtitleTracking: '0.16em',
    subtitleUppercase: true,
  },
  {
    key: 'bold-contemporary',
    name: 'Bold Contemporary',
    description: 'Kraftvoll, modern',
    fontFamily: '"Raleway", system-ui, sans-serif',
    fontImport: 'https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;600;800&display=swap',
    titleWeight: 800,
    titleTracking: '-0.01em',
    titleLineHeight: 1.0,
    subtitleTracking: '0.04em',
    subtitleUppercase: false,
  },
]

export function getTypographyPreset(key: string | null | undefined): TypographyPreset {
  return TYPOGRAPHY_PRESETS.find(t => t.key === key) ?? TYPOGRAPHY_PRESETS[0]
}

// ── Hero Styles ───────────────────────────────────────────────────────────────

export const HERO_STYLES = [
  { key: 'cinematic', label: 'Cinematic',  description: 'Fullscreen, Titel unten links' },
  { key: 'classic',   label: 'Classic',    description: 'Bild + Titelblock darunter' },
  { key: 'minimal',   label: 'Minimal',    description: 'Nur Titel, kein Bild-Header' },
  { key: 'editorial', label: 'Split',      description: 'Bild links, Titel rechts' },
  { key: 'frame',     label: 'Frame',      description: 'Eingerahmtes Bild mit Titel' },
  { key: 'journal',   label: 'Journal',    description: 'Kleines Bild, große Typografie' },
  { key: 'luxury',    label: 'Luxury',     description: 'Cinematic ultra-refined' },
] as const
export type HeroStyle = typeof HERO_STYLES[number]['key']

// ── Spacing Densities ─────────────────────────────────────────────────────────

export const SPACING_DENSITIES = [
  { key: 'compact',  label: 'Compact',  hint: 'Engere Abstände', gap: 3 },
  { key: 'balanced', label: 'Balanced', hint: 'Standard',         gap: 6 },
  { key: 'airy',     label: 'Airy',     hint: 'Mehr Luft',        gap: 16 },
] as const
export type SpacingDensity = typeof SPACING_DENSITIES[number]['key']

export function getSpacingGap(density: SpacingDensity | string | null | undefined): number {
  return SPACING_DENSITIES.find(d => d.key === density)?.gap ?? 6
}
