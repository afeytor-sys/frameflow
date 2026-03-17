'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Question } from '@/lib/questionnaireTemplates'
import { ClipboardList, CheckCircle2, Send } from 'lucide-react'

interface Props {
  questionnaire: {
    id: string
    title: string
    questions: Question[]
  }
  projectId: string
  studioName: string
  logoUrl: string | null
  alreadySubmitted: boolean
}

export default function QuestionnaireClientPage({ questionnaire, projectId, studioName, logoUrl, alreadySubmitted }: Props) {
  const supabase = createClient()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(alreadySubmitted)
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  const setAnswer = (id: string, value: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }))
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: false }))
  }

  // Toggle a checkbox option on/off
  const toggleCheckbox = (id: string, option: string) => {
    const current = answers[id] ? answers[id].split('|||').filter(Boolean) : []
    const idx = current.indexOf(option)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push(option)
    }
    setAnswer(id, current.join('|||'))
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: false }))
  }

  const isChecked = (id: string, option: string) => {
    return (answers[id] || '').split('|||').includes(option)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    const newErrors: Record<string, boolean> = {}
    questionnaire.questions.forEach(q => {
      if (q.required && !answers[q.id]?.trim()) {
        newErrors[q.id] = true
      }
    })
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from('questionnaire_submissions').insert({
      questionnaire_id: questionnaire.id,
      project_id: projectId,
      answers,
    })

    if (error) {
      console.error(error)
      setSubmitting(false)
      return
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ background: 'var(--bg-page)' }}>
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(61,186,111,0.12)', border: '2px solid rgba(61,186,111,0.25)' }}>
            <CheckCircle2 className="w-10 h-10" style={{ color: '#3DBA6F' }} />
          </div>
          <h1 className="font-black text-[26px] mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Vielen Dank! 🎉
          </h1>
          <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Your answers have been successfully submitted. {studioName} will get back to you.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <div className="max-w-lg mx-auto px-5 py-10">

        {/* Studio branding */}
        <div className="flex items-center gap-2 mb-8 animate-in">
          {logoUrl ? (
            <img src={logoUrl} alt={studioName} className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-[13px]"
              style={{ background: 'var(--accent)' }}>
              {studioName[0]}
            </div>
          )}
          <span className="text-[15px] font-semibold" style={{ color: 'var(--text-muted)' }}>{studioName}</span>
        </div>

        {/* Header card */}
        <div className="rounded-2xl overflow-hidden mb-6 animate-in"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }} />
          <div className="p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(139,92,246,0.10)' }}>
              <ClipboardList className="w-6 h-6" style={{ color: '#8B5CF6' }} />
            </div>
            <div>
              <h1 className="font-black text-[20px] mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                {questionnaire.title}
              </h1>
              <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                Please answer the following questions so we can perfectly prepare for your shoot.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {questionnaire.questions.map((q, idx) => (
            <div
              key={q.id}
              className="rounded-2xl p-5 animate-in"
              style={{
                background: 'var(--card-bg)',
                border: `1px solid ${errors[q.id] ? 'rgba(196,59,44,0.40)' : 'var(--card-border)'}`,
                boxShadow: 'var(--card-shadow)',
                animationDelay: `${idx * 60}ms`,
              }}
            >
              <label className="block mb-3">
                <div className="flex items-start gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>
                    {idx + 1}
                  </span>
                  <span className="text-[14px] font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {q.label}
                    {q.required && <span style={{ color: '#C43B2C' }}> *</span>}
                  </span>
                </div>

                {q.type === 'text' && (
                  <input
                    type="text"
                    value={answers[q.id] || ''}
                    onChange={e => setAnswer(q.id, e.target.value)}
                    placeholder="Deine Antwort..."
                    className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all"
                    style={{
                      background: 'var(--bg-hover)',
                      border: `1px solid ${errors[q.id] ? 'rgba(196,59,44,0.50)' : 'var(--border-color)'}`,
                      color: 'var(--text-primary)',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.12)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors[q.id] ? 'rgba(196,59,44,0.50)' : 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                )}

                {q.type === 'textarea' && (
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={e => setAnswer(q.id, e.target.value)}
                    placeholder="Deine Antwort..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all resize-none"
                    style={{
                      background: 'var(--bg-hover)',
                      border: `1px solid ${errors[q.id] ? 'rgba(196,59,44,0.50)' : 'var(--border-color)'}`,
                      color: 'var(--text-primary)',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.12)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors[q.id] ? 'rgba(196,59,44,0.50)' : 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                )}

                {q.type === 'choice' && q.options && (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {q.options.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswer(q.id, opt)}
                        className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-left transition-all"
                        style={{
                          background: answers[q.id] === opt ? 'rgba(139,92,246,0.12)' : 'var(--bg-hover)',
                          border: `1.5px solid ${answers[q.id] === opt ? '#8B5CF6' : 'var(--border-color)'}`,
                          color: answers[q.id] === opt ? '#8B5CF6' : 'var(--text-primary)',
                        }}
                      >
                        {answers[q.id] === opt && <span className="mr-1.5">✓</span>}
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === 'checkbox' && q.options && (
                  <div className="space-y-2 mt-1">
                    {q.options.map(opt => {
                      const checked = isChecked(q.id, opt)
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleCheckbox(q.id, opt)}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium text-left transition-all"
                          style={{
                            background: checked ? 'rgba(139,92,246,0.10)' : 'var(--bg-hover)',
                            border: `1.5px solid ${checked ? '#8B5CF6' : 'var(--border-color)'}`,
                            color: checked ? '#8B5CF6' : 'var(--text-primary)',
                          }}
                        >
                          <div
                            className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                            style={{
                              background: checked ? '#8B5CF6' : 'transparent',
                              border: `2px solid ${checked ? '#8B5CF6' : 'var(--border-strong)'}`,
                            }}
                          >
                            {checked && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                )}

                {q.type === 'yesno' && (
                  <div className="flex gap-3 mt-1">
                    {['Ja', 'Nein'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswer(q.id, opt)}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all"
                        style={{
                          background: answers[q.id] === opt ? 'rgba(139,92,246,0.12)' : 'var(--bg-hover)',
                          border: `1.5px solid ${answers[q.id] === opt ? '#8B5CF6' : 'var(--border-color)'}`,
                          color: answers[q.id] === opt ? '#8B5CF6' : 'var(--text-primary)',
                        }}
                      >
                        {opt === 'Ja' ? '✓ Ja' : '✗ Nein'}
                      </button>
                    ))}
                  </div>
                )}
              </label>

              {errors[q.id] && (
                <p className="text-[11.5px] mt-1" style={{ color: '#C43B2C' }}>Dieses Feld ist erforderlich</p>
              )}
            </div>
          ))}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-[15px] font-black text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.99]"
            style={{ background: '#8B5CF6', boxShadow: '0 4px 20px rgba(139,92,246,0.30)' }}
          >
            {submitting
              ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Send className="w-4 h-4" />Antworten absenden</>
            }
          </button>
        </form>

        <p className="text-center text-[12px] mt-6" style={{ color: 'var(--text-muted)' }}>
          Powered by Fotonizer
        </p>
      </div>
    </div>
  )
}
