'use client'

import { useState, useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Check, RotateCcw, Download, ArrowLeft, Braces, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { Contract } from '@/types/database'

interface Props {
  contract: Contract
  clientName: string
  token: string
}

// Extract all {{variable}} keys from HTML content
// Handles both plain {{key}} and TipTap's <span class="contract-variable">{{key}}</span>
function extractVariables(html: string): string[] {
  const keys: string[] = []

  // Match inside span.contract-variable: <span class="contract-variable">{{key}}</span>
  const spanMatches = html.matchAll(/<span[^>]*class="contract-variable"[^>]*>\{\{([^}]+)\}\}<\/span>/g)
  for (const m of spanMatches) keys.push(m[1].trim())

  // Also match plain {{key}} not inside a span (fallback)
  const plainMatches = html.matchAll(/\{\{([^}]+)\}\}/g)
  for (const m of plainMatches) keys.push(m[1].trim())

  return [...new Set(keys)] // deduplicate
}

// Replace variables in HTML with filled values
function applyVariables(html: string, fields: Record<string, string>): string {
  let result = html
  for (const [key, value] of Object.entries(fields)) {
    const filled = value.trim()
      ? `<span style="background:rgba(196,164,124,0.15);color:#8B5CF6;border-radius:3px;padding:0 3px;font-weight:600;">${value}</span>`
      : `<span style="background:rgba(239,68,68,0.10);color:#EF4444;border-radius:3px;padding:0 3px;font-style:italic;">[${key}]</span>`

    // Replace TipTap span wrapper (exact class match)
    result = result.replace(
      new RegExp(`<span[^>]*class="contract-variable"[^>]*>\\{\\{${escapeRegex(key)}\\}\\}<\\/span>`, 'g'),
      filled
    )
    // Replace plain {{key}} (fallback)
    result = result.replace(new RegExp(`\\{\\{${escapeRegex(key)}\\}\\}`, 'g'), filled)
  }
  return result
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Label map for known variable keys
const VARIABLE_LABELS: Record<string, string> = {
  'endereço':        'Adresse',
  'CPF':             'CPF / Ausweis-Nr.',
  'data_nascimento': 'Geburtsdatum',
  'telefone':        'Telefon',
  'cidade':          'Stadt',
  'campo_livre':     'Freies Feld',
}

function getLabel(key: string): string {
  return VARIABLE_LABELS[key] || key.replace(/_/g, ' ')
}

export default function ContractSigningClient({ contract, clientName, token }: Props) {
  const sigCanvasRef = useRef<SignatureCanvas>(null)
  const [agreed, setAgreed] = useState(false)
  const [signerName, setSignerName] = useState(clientName)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(contract.status === 'signed')
  const [pdfUrl, setPdfUrl] = useState(contract.pdf_url || null)
  const [scrollProgress, setScrollProgress] = useState(0)

  // Client fields (variables)
  const variables = extractVariables(contract.content || '')
  const [clientFields, setClientFields] = useState<Record<string, string>>(
    Object.fromEntries(variables.map(k => [k, '']))
  )
  const [fieldsStep, setFieldsStep] = useState<'fields' | 'sign'>(
    variables.length > 0 ? 'fields' : 'sign'
  )

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const progress = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100
    setScrollProgress(Math.min(100, Math.round(progress)))
  }

  const clearSignature = () => {
    sigCanvasRef.current?.clear()
  }

  const proceedToSign = () => {
    // Validate required fields (all fields are required)
    const missing = variables.filter(k => !clientFields[k]?.trim())
    if (missing.length > 0) {
      toast.error(`Bitte fülle alle Felder aus: ${missing.map(getLabel).join(', ')}`)
      return
    }
    setFieldsStep('sign')
  }

  const handleSign = async () => {
    if (!agreed) {
      toast.error('Bitte bestätige, dass du den Vertrag gelesen hast')
      return
    }
    if (!signerName.trim()) {
      toast.error('Bitte gib deinen vollständigen Namen ein')
      return
    }
    if (sigCanvasRef.current?.isEmpty()) {
      toast.error('Bitte unterschreibe im Unterschriftsfeld')
      return
    }

    setSigning(true)

    const signatureData = sigCanvasRef.current?.toDataURL('image/png')

    const res = await fetch('/api/contracts/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractId: contract.id,
        signedByName: signerName.trim(),
        signatureData,
        token,
        clientFields,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error || 'Fehler beim Unterschreiben')
      setSigning(false)
      return
    }

    const data = await res.json()
    setPdfUrl(data.pdfUrl || null)
    setSigned(true)
    toast.success('Vertrag erfolgreich unterschrieben! 🎉')
    setSigning(false)
  }

  // Already signed view
  if (signed) {
    return (
      <div className="space-y-6 animate-in">
        <Link href={`/client/${token}`} className="inline-flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Zurück zum Portal
        </Link>

        <div className="bg-white rounded-xl border border-[#3DBA6F]/30 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#3DBA6F]/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-[#3DBA6F]" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-[#1A1A1A] mb-2">
            Vertrag unterschrieben! 🎉
          </h2>
          <p className="text-[#6B6B6B] text-sm mb-6">
            Unterschrieben von <strong>{contract.signed_by_name || signerName}</strong>
            {contract.signed_at && ` am ${new Date(contract.signed_at).toLocaleDateString('de-DE')}`}
          </p>

          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors"
            >
              <Download className="w-4 h-4" />
              Unterschriebenes PDF herunterladen
            </a>
          )}
        </div>

        {/* Show contract content read-only with filled values */}
        <div className="bg-white rounded-xl border border-[#E8E8E4] p-6">
          <h3 className="font-display text-lg font-semibold text-[#1A1A1A] mb-4">{contract.title}</h3>
          <div
            className="prose prose-sm max-w-none text-[#1A1A1A]"
            dangerouslySetInnerHTML={{ __html: applyVariables(contract.content || '', clientFields) }}
          />
        </div>
      </div>
    )
  }

  // ── Step 1: Fill client fields ─────────────────────────────────────────
  if (fieldsStep === 'fields' && variables.length > 0) {
    return (
      <div className="space-y-6 animate-in">
        <div className="flex items-center gap-3">
          <Link href={`/client/${token}`} className="inline-flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Link>
          <h1 className="font-display text-xl font-semibold text-[#1A1A1A]">{contract.title}</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold bg-[#1A1A1A] text-white">1</div>
            <span className="text-sm font-semibold text-[#1A1A1A]">Deine Angaben</span>
          </div>
          <div className="flex-1 h-px bg-[#E8E8E4]" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold bg-[#E8E8E4] text-[#6B6B6B]">2</div>
            <span className="text-sm text-[#6B6B6B]">Unterschreiben</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E8E8E4] p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <Braces className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[#1A1A1A] text-[15px]">Bitte fülle deine Angaben aus</h3>
              <p className="text-[12px] text-[#6B6B6B]">Diese Informationen werden in den Vertrag eingetragen</p>
            </div>
          </div>

          {variables.map(key => (
            <div key={key}>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                {getLabel(key)} <span className="text-[#E84C1A]">*</span>
              </label>
              <input
                type="text"
                value={clientFields[key] || ''}
                onChange={e => setClientFields(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={`${getLabel(key)} eingeben...`}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E8E8E4] focus:border-[#C8A882] focus:ring-2 focus:ring-[#C8A882]/20 outline-none transition-all text-sm text-[#1A1A1A] bg-white"
              />
            </div>
          ))}

          <button
            onClick={proceedToSign}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] transition-colors"
          >
            Weiter zum Vertrag
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // ── Step 2: Read & Sign ────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <Link href={`/client/${token}`} className="inline-flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Link>
        <h1 className="font-display text-xl font-semibold text-[#1A1A1A]">{contract.title}</h1>
      </div>

      {/* Step indicator (only shown if there were fields) */}
      {variables.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold bg-[#3DBA6F] text-white">✓</div>
            <span className="text-sm text-[#6B6B6B]">Deine Angaben</span>
          </div>
          <div className="flex-1 h-px bg-[#E8E8E4]" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold bg-[#1A1A1A] text-white">2</div>
            <span className="text-sm font-semibold text-[#1A1A1A]">Unterschreiben</span>
          </div>
        </div>
      )}

      {/* Scroll progress */}
      <div className="bg-[#E8E8E4] rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-[#C8A882] transition-all duration-300 rounded-full"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
      <p className="text-xs text-[#6B6B6B] text-right -mt-4">{scrollProgress}% gelesen</p>

      {/* Contract content with filled variables */}
      <div
        className="bg-white rounded-xl border border-[#E8E8E4] p-6 max-h-[60vh] overflow-y-auto"
        onScroll={handleScroll}
      >
        <div
          className="prose prose-sm max-w-none text-[#1A1A1A]"
          dangerouslySetInnerHTML={{ __html: applyVariables(contract.content || '', clientFields) }}
        />
      </div>

      {/* Signing section */}
      <div className="bg-white rounded-xl border border-[#E8E8E4] p-6 space-y-5">
        <h3 className="font-display text-lg font-semibold text-[#1A1A1A]">Vertrag unterschreiben</h3>

        {/* Agreement checkbox */}
        <label className="flex items-start gap-3 cursor-pointer">
          <div
            onClick={() => setAgreed(!agreed)}
            className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all cursor-pointer',
              agreed ? 'border-[#C8A882] bg-[#C8A882]' : 'border-[#E8E8E4]'
            )}
          >
            {agreed && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className="text-sm text-[#1A1A1A]">
            Ich habe den Vertrag vollständig gelesen und stimme den Bedingungen zu.
          </span>
        </label>

        {/* Full name */}
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            Vollständiger Name <span className="text-[#E84C1A]">*</span>
          </label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Dein vollständiger Name"
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#E8E8E4] focus:border-[#C8A882] focus:ring-2 focus:ring-[#C8A882]/20 outline-none transition-all text-sm text-[#1A1A1A] bg-white"
          />
        </div>

        {/* Signature canvas */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-[#1A1A1A]">
              Unterschrift <span className="text-[#E84C1A]">*</span>
            </label>
            <button
              type="button"
              onClick={clearSignature}
              className="flex items-center gap-1 text-xs text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Löschen
            </button>
          </div>
          <div className="border-2 border-dashed border-[#E8E8E4] rounded-xl overflow-hidden bg-[#FAFAF8] hover:border-[#C8A882]/50 transition-colors">
            <SignatureCanvas
              ref={sigCanvasRef}
              canvasProps={{
                className: 'w-full',
                style: { height: '160px', touchAction: 'none' },
              }}
              backgroundColor="transparent"
              penColor="#1A1A1A"
            />
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1.5">
            Mit Maus oder Finger unterschreiben
          </p>
        </div>

        {/* Sign button */}
        <button
          onClick={handleSign}
          disabled={signing || !agreed}
          className={cn(
            'w-full py-3 rounded-xl text-sm font-medium transition-all',
            agreed
              ? 'bg-[#1A1A1A] text-white hover:bg-[#2A2A2A]'
              : 'bg-[#E8E8E4] text-[#6B6B6B] cursor-not-allowed',
            signing && 'opacity-70'
          )}
        >
          {signing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Wird verarbeitet...
            </span>
          ) : (
            'Vertrag jetzt unterschreiben ✍️'
          )}
        </button>

        <p className="text-xs text-[#6B6B6B] text-center">
          Diese digitale Unterschrift ist rechtsgültig gemäß eIDAS-Verordnung.
        </p>
      </div>
    </div>
  )
}
