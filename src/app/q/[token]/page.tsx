import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import QuotePublicClient from './QuotePublicClient'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const supabase = createServiceClient()
  const { data: quote } = await supabase
    .from('quotes')
    .select('title')
    .eq('client_token', token)
    .single()
  return { title: quote ? `${quote.title} — Angebot` : 'Angebot' }
}

export default async function PublicQuotePage({ params }: Props) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: quote } = await supabase
    .from('quotes')
    .select(`
      *,
      sections:quote_sections(
        *,
        items:quote_items(*)
      )
    `)
    .eq('client_token', token)
    .single()

  if (!quote) notFound()

  const [photographerResult, responseResult] = await Promise.all([
    supabase
      .from('photographers')
      .select('full_name, studio_name')
      .eq('id', quote.photographer_id)
      .single(),
    quote.status === 'accepted'
      ? supabase
          .from('quote_responses')
          .select('total_amount, client_name, client_email, selections')
          .eq('quote_id', quote.id)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const studioName = photographerResult.data?.studio_name || photographerResult.data?.full_name || 'Studio'

  const sections = (quote.sections || [])
    .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
    .map((s: { items: { position: number }[] } & Record<string, unknown>) => ({
      ...s,
      items: (s.items || []).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
    }))

  return (
    <QuotePublicClient
      quote={{ ...quote, sections }}
      studioName={studioName}
      token={token}
      acceptedResponse={responseResult.data ?? null}
    />
  )
}
