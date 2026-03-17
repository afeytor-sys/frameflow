import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import QuestionnaireClientPage from './QuestionnaireClientPage'

export default async function QuestionnairePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()

  // Resolve project by slug or token
  let { data: project } = await supabase
    .from('projects')
    .select('id, title, photographer_id, photographer:photographers(studio_name, full_name, logo_url)')
    .eq('custom_slug', token)
    .single()

  if (!project) {
    const { data: byToken } = await supabase
      .from('projects')
      .select('id, title, photographer_id, photographer:photographers(studio_name, full_name, logo_url)')
      .eq('client_token', token)
      .single()
    project = byToken
  }

  if (!project) notFound()

  // Fetch questionnaire for this project
  const { data: questionnaire } = await supabase
    .from('questionnaires')
    .select('*')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!questionnaire) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="text-center p-8">
          <p className="text-[16px]" style={{ color: 'var(--text-muted)' }}>No questionnaire available.</p>
        </div>
      </div>
    )
  }

  // Check if already submitted
  const { data: existing } = await supabase
    .from('questionnaire_submissions')
    .select('id')
    .eq('questionnaire_id', questionnaire.id)
    .single()

  const photographer = Array.isArray(project.photographer) ? project.photographer[0] : project.photographer
  const studioName = (photographer as { studio_name?: string; full_name?: string } | null)?.studio_name
    || (photographer as { studio_name?: string; full_name?: string } | null)?.full_name
    || 'Your photographer'
  const logoUrl = (photographer as { logo_url?: string | null } | null)?.logo_url ?? null

  return (
    <QuestionnaireClientPage
      questionnaire={questionnaire}
      projectId={project.id}
      studioName={studioName}
      logoUrl={logoUrl}
      alreadySubmitted={!!existing}
    />
  )
}
