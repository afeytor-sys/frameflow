import { getFormById } from '@/lib/forms'
import DynamicForm from '@/components/forms/DynamicForm'
import FormSubtitle from '@/components/forms/FormSubtitle'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ formId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { formId } = await params
  const form = await getFormById(formId)
  return {
    title: form ? `${form.name} — Inquiry` : 'Form not found',
  }
}

export default async function PublicFormPage({ params }: Props) {
  const { formId } = await params
  const form = await getFormById(formId)

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'var(--bg-page, #f9f9f7)' }}>
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
            style={{ background: 'var(--bg-hover, #f0ede8)' }}>
            🔍
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary, #111)' }}>
            Form not found
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary, #666)' }}>
            This form link may be invalid or has been removed.
          </p>
        </div>
      </div>
    )
  }

  // ── Public form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen py-12 px-4"
      style={{ background: 'var(--bg-page, #f9f9f7)' }}>
      <div className="max-w-[500px] mx-auto">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl font-bold text-white"
            style={{ background: 'var(--accent, #C9A96E)' }}>
            ✉
          </div>
          <h1 className="text-2xl font-black mb-1"
            style={{ color: 'var(--text-primary, #111)', letterSpacing: '-0.03em' }}>
            {form.name}
          </h1>
          <FormSubtitle />
        </div>

        {/* Form card */}
        <div className="rounded-2xl p-6 sm:p-8"
          style={{
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--card-border, #e5e7eb)',
            boxShadow: 'var(--card-shadow, 0 1px 3px rgba(0,0,0,0.06))',
          }}>
          <DynamicForm
            formId={form.id}
            formName={form.name}
            fields={form.fields ?? []}
          />
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted, #aaa)' }}>
          Powered by Fotonizer
        </p>

      </div>
    </div>
  )
}
