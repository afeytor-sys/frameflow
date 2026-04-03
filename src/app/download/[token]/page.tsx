import { createServiceClient } from '@/lib/supabase/service'
import { r2, R2_BUCKET } from '@/lib/r2'
import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { notFound } from 'next/navigation'
import { Download, FileArchive, Clock, AlertCircle } from 'lucide-react'

// Presigned URL valid for 1 hour — refreshed every page load
const PRESIGN_EXPIRY = 60 * 60

interface DownloadPart {
  name: string
  key: string
  photo_count: number
  part_number: number
  total_parts: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default async function DownloadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: job } = await supabase
    .from('gallery_download_jobs')
    .select('id, status, parts, error, token_expires_at, gallery_id')
    .eq('download_token', token)
    .single()

  if (!job) notFound()

  const now = new Date()
  const isExpired = job.token_expires_at ? new Date(job.token_expires_at) < now : false

  // Fetch gallery info for branding
  const { data: gallery } = await supabase
    .from('galleries')
    .select(`
      title,
      project:projects(
        photographer:photographers(studio_name, full_name, logo_url)
      )
    `)
    .eq('id', job.gallery_id)
    .single() as {
      data: {
        title: string | null
        project: { photographer: { studio_name: string | null; full_name: string | null; logo_url: string | null } | null } | null
      } | null
    }

  const project = Array.isArray(gallery?.project) ? gallery?.project[0] : gallery?.project
  const photographerRaw = project?.photographer
  const photographer = Array.isArray(photographerRaw) ? photographerRaw[0] : photographerRaw
  const studioName = photographer?.studio_name || photographer?.full_name || 'Ihr Fotograf'
  const galleryTitle = gallery?.title || 'Galerie'

  const expiryFormatted = job.token_expires_at
    ? new Date(job.token_expires_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  // Build download items with presigned URLs and file sizes
  const parts: DownloadPart[] = Array.isArray(job.parts) ? job.parts : []

  const downloadItems = await Promise.all(
    parts.map(async (part) => {
      let url: string | null = null
      let size: number | null = null
      try {
        const [signedUrl, head] = await Promise.all([
          getSignedUrl(
            r2,
            new GetObjectCommand({
              Bucket: R2_BUCKET,
              Key: part.key,
              ResponseContentType: 'application/zip',
              ResponseContentDisposition: `attachment; filename="${encodeURIComponent(part.name)}"`,
            }),
            { expiresIn: PRESIGN_EXPIRY },
          ),
          r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: part.key }))
            .then(r => r.ContentLength ?? null)
            .catch(() => null),
        ])
        url = signedUrl
        size = head
      } catch {
        // Key may not exist yet — job might still be processing
      }
      return { ...part, url, size }
    })
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 16px 80px' }}>

        {/* Photographer branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          {photographer?.logo_url ? (
            <img src={photographer.logo_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E8E4DC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#7A7670' }}>
              {studioName[0]}
            </div>
          )}
          <span style={{ fontSize: 14, fontWeight: 600, color: '#7A7670' }}>{studioName}</span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: '#111110', margin: '0 0 6px' }}>
          {isExpired ? 'Link abgelaufen' : job.status === 'failed' ? 'Fehler aufgetreten' : job.status !== 'ready' ? 'Wird vorbereitet…' : 'Download bereit'}
        </h1>
        <p style={{ fontSize: 15, color: '#7A7670', margin: '0 0 32px', lineHeight: 1.5 }}>
          {isExpired
            ? 'Der Download-Link ist nicht mehr gültig. Bitte fordere einen neuen Download an.'
            : job.status === 'failed'
            ? (job.error || 'Bei der Vorbereitung ist ein Fehler aufgetreten.')
            : job.status !== 'ready'
            ? 'Deine Fotos werden gerade verpackt. Lade diese Seite in einigen Minuten erneut.'
            : `Deine Fotos aus "${galleryTitle}" sind bereit zum Download.`
          }
        </p>

        {/* Expired / failed / pending states */}
        {(isExpired || job.status === 'failed' || job.status !== 'ready') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: '#fff', border: `1px solid ${isExpired || job.status === 'failed' ? '#FDDBD9' : '#E8E4DC'}`, borderRadius: 12 }}>
            {isExpired || job.status === 'failed'
              ? <AlertCircle style={{ width: 20, height: 20, color: '#C94030', flexShrink: 0 }} />
              : <Clock style={{ width: 20, height: 20, color: '#C4A47C', flexShrink: 0 }} />
            }
            <p style={{ margin: 0, fontSize: 13, color: '#7A7670' }}>
              {isExpired
                ? 'Bitte kontaktiere deinen Fotografen, um einen neuen Download-Link anzufordern.'
                : job.status === 'failed'
                ? 'Bitte kontaktiere deinen Fotografen für Hilfe.'
                : 'Aktualisiere diese Seite in ein paar Minuten.'
              }
            </p>
          </div>
        )}

        {/* Download items */}
        {!isExpired && job.status === 'ready' && downloadItems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {downloadItems.map((item) => (
              <div key={item.part_number} style={{ background: '#fff', border: '1px solid #E8E4DC', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(196,164,124,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileArchive style={{ width: 20, height: 20, color: '#C4A47C' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111110', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9A9690' }}>
                      {item.photo_count} Fotos{item.size ? ` · ${formatBytes(item.size)}` : ''}
                      {item.total_parts > 1 ? ` · Teil ${item.part_number} von ${item.total_parts}` : ''}
                    </p>
                  </div>
                  {item.url ? (
                    <a
                      href={item.url}
                      download={item.name}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#111110', color: '#F8F7F4', fontSize: 13, fontWeight: 700, textDecoration: 'none', borderRadius: 10, flexShrink: 0 }}
                    >
                      <Download style={{ width: 14, height: 14 }} />
                      Herunterladen
                    </a>
                  ) : (
                    <span style={{ fontSize: 12, color: '#C4A47C', flexShrink: 0 }}>Vorbereitung…</span>
                  )}
                </div>
              </div>
            ))}

            {/* Validity notice */}
            {expiryFormatted && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'rgba(196,164,124,0.08)', borderRadius: 10, marginTop: 4 }}>
                <Clock style={{ width: 14, height: 14, color: '#C4A47C', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 12, color: '#7A7670' }}>
                  Links gültig bis <strong style={{ color: '#111110' }}>{expiryFormatted}</strong>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p style={{ marginTop: 48, fontSize: 12, color: '#B0ACA6', textAlign: 'center' }}>
          Bereitgestellt von <strong>{studioName}</strong> über Fotonizer
        </p>
      </div>
    </div>
  )
}
