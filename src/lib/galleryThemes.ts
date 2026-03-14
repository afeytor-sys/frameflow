export type GridLayout = '2col' | '3col' | '4col' | 'masonry'

export interface GalleryTheme {
  key: string
  name: string
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
]

export function getTheme(key: string): GalleryTheme {
  return GALLERY_THEMES.find(t => t.key === key) ?? GALLERY_THEMES[0]
}
