import Link from 'next/link'
import type { GalleryStoreBanner } from '@/lib/store'

const euro = (cents: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)

export default function StoreBanner({ banner }: { banner: GalleryStoreBanner }) {
  return (
    <div style={{ padding: '10px 20px' }}>
      <Link
        href={banner.href}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          maxWidth: 1100, margin: '0 auto', padding: '10px 16px', borderRadius: 12,
          border: '1px solid #E8E4DC', background: '#FFFFFF', color: '#111110', textDecoration: 'none',
          fontSize: 14,
        }}
      >
        <span>
          <strong>{banner.title}</strong>
          <span style={{ color: '#7A7670' }}> · ab {euro(banner.fromCents)}</span>
        </span>
        <span style={{ color: '#C4A47C', fontWeight: 700, whiteSpace: 'nowrap' }}>Album bestellen →</span>
      </Link>
    </div>
  )
}
