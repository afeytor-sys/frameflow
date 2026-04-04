import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

interface Question {
  id: string
  label: string
  type: string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const { submissionId } = await params

  // Auth — photographer must be logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  const { data: submission } = await service
    .from('questionnaire_submissions')
    .select(`
      id,
      answers,
      submitted_at,
      questionnaire:questionnaires(id, title, questions, photographer_id),
      project:projects(title, client:clients(full_name))
    `)
    .eq('id', submissionId)
    .single()

  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const questionnaire = Array.isArray(submission.questionnaire)
    ? submission.questionnaire[0]
    : submission.questionnaire as { id: string; title: string; questions: Question[]; photographer_id: string } | null

  // Verify the questionnaire belongs to the logged-in photographer
  if (questionnaire?.photographer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const projectRaw = Array.isArray(submission.project) ? submission.project[0] : submission.project
  const project = projectRaw as { title?: string; client?: { full_name?: string } | null } | null
  const clientRaw = Array.isArray(project?.client) ? project?.client[0] : project?.client
  const client = clientRaw as { full_name?: string } | null
  const clientName = client?.full_name || 'Kunde'

  // Build human-readable answer list using the question labels
  const answers = (questionnaire?.questions ?? []).map((q: Question) => {
    const raw = (submission.answers as Record<string, string>)[q.id] ?? ''
    return {
      question: q.label,
      answer: raw.includes('|||') ? raw.split('|||').filter(Boolean).join(', ') : raw || '—',
    }
  })

  const output = {
    title: `Fragebogen – ${clientName}`,
    questionnaire: questionnaire?.title ?? '',
    client: clientName,
    submittedAt: submission.submitted_at,
    answers,
  }

  const safeName = clientName.replace(/[^\w\s\-äöüÄÖÜß]/g, '').trim().replace(/\s+/g, '-')
  const filename = `Fragebogen-${safeName}.json`

  return new NextResponse(JSON.stringify(output, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
