'use client'

import { useState } from 'react'
import { Plus, Copy, ExternalLink, FileText, Check, Pencil, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { FormField } from '@/lib/forms'
import { DEFAULT_FIELDS } from '@/lib/forms'

interface Form {
  id: string
  photographer_id: string
  name: string
  fields: FormField[]
  created_at: string
}

interface Props {
  forms: Form[]
  appUrl: string
}

const CHOICE_TYPES = ['select', 'radio', 'checkbox']

const FIELD_TYPES: { value: FormField['type']; label: string }[] = [
  { value: 'text',     label: 'Text' },
  { value: 'email',    label: 'Email' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'date',     label: 'Date' },
  { value: 'tel',      label: 'Phone' },
  { value: 'select',   label: 'Dropdown' },
  { value: 'radio',    label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
]

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: 'var(--bg-hover, #f5f5f3)',
    border: '1.5px solid var(--card-border, #e5e7eb)',
    color: 'var(--text-primary)',
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    ...extra,
  }
}

export default function FormsClient({ forms: initialForms, appUrl }: Props) {
  const [forms, setForms] = useState(initialForms)

  // Create form state
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Edit fields state
  const [editingForm, setEditingForm] = useState<Form | null>(null)
  const [editFields, setEditFields] = useState<FormField[]>([])
  const [saving, setSaving] = useState(false)

  // Per-field option input state: fieldId → current input value
  const [optionInputs, setOptionInputs] = useState<Record<string, string>>({})

  function formUrl(formId: string) {
    return `${appUrl}/form/${formId}`
  }

  // ── Create form ────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to create form'); return }
      setForms(prev => [data, ...prev])
      setNewName('')
      setShowCreate(false)
      toast.success('Form created!')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  // ── Copy link ──────────────────────────────────────────────────────────────
  async function handleCopy(formId: string) {
    try {
      await navigator.clipboard.writeText(formUrl(formId))
      setCopiedId(formId)
      toast.success('Link copied!')
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.error('Could not copy link')
    }
  }

  // ── Open edit modal ────────────────────────────────────────────────────────
  function openEdit(form: Form) {
    const fields = form.fields && form.fields.length > 0 ? form.fields : DEFAULT_FIELDS
    setEditingForm(form)
    setEditFields(fields.map(f => ({ ...f, options: f.options ? [...f.options] : [] })))
    setOptionInputs({})
  }

  function closeEdit() {
    setEditingForm(null)
    setEditFields([])
    setOptionInputs({})
  }

  // ── Edit field helpers ─────────────────────────────────────────────────────
  function updateField(idx: number, patch: Partial<FormField>) {
    setEditFields(prev => prev.map((f, i) => {
      if (i !== idx) return f
      const updated = { ...f, ...patch }
      // When switching to a choice type, ensure options array exists
      if (patch.type && CHOICE_TYPES.includes(patch.type) && !updated.options) {
        updated.options = []
      }
      return updated
    }))
  }

  function removeField(idx: number) {
    setEditFields(prev => prev.filter((_, i) => i !== idx))
  }

  function addField() {
    setEditFields(prev => [
      ...prev,
      { id: crypto.randomUUID(), label: '', type: 'text', required: false, placeholder: '', options: [] },
    ])
  }

  // ── Options helpers ────────────────────────────────────────────────────────
  function addOption(fieldId: string, idx: number) {
    const val = (optionInputs[fieldId] ?? '').trim()
    if (!val) return
    updateField(idx, { options: [...(editFields[idx].options ?? []), val] })
    setOptionInputs(prev => ({ ...prev, [fieldId]: '' }))
  }

  function removeOption(fieldIdx: number, optIdx: number) {
    const opts = [...(editFields[fieldIdx].options ?? [])]
    opts.splice(optIdx, 1)
    updateField(fieldIdx, { options: opts })
  }

  // ── Save fields ────────────────────────────────────────────────────────────
  async function handleSaveFields(e: React.FormEvent) {
    e.preventDefault()
    if (!editingForm) return

    if (editFields.some(f => !f.label.trim())) {
      toast.error('All fields must have a label')
      return
    }

    // Validate choice fields have at least one option
    const missingOptions = editFields.find(
      f => CHOICE_TYPES.includes(f.type) && (!f.options || f.options.length === 0)
    )
    if (missingOptions) {
      toast.error(`"${missingOptions.label || 'A field'}" requires at least one option`)
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/forms/${editingForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: editFields }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to save'); return }
      setForms(prev => prev.map(f => f.id === editingForm.id ? { ...f, fields: data.fields } : f))
      toast.success('Fields saved!')
      closeEdit()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Formulare
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Create shareable inquiry forms for your clients
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
          style={{ background: 'var(--cta-bg)', color: '#fff' }}
        >
          <Plus className="w-4 h-4" />
          Create Form
        </button>
      </div>

      {/* ── Create modal ──────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div className="modal-glass w-full max-w-md rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>New Form</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Form name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Wedding Inquiry"
                  style={inputStyle()}
                />
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  Default fields (Name, Email, Message) are always included.
                </p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowCreate(false); setNewName('') }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating || !newName.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ background: 'var(--cta-bg)', color: '#fff' }}>
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Fields modal ─────────────────────────────────────────────── */}
      {editingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={e => { if (e.target === e.currentTarget) closeEdit() }}>
          <div className="modal-glass w-full max-w-lg rounded-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

            {/* Modal header */}
            <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
              style={{ borderBottom: '1px solid var(--card-border)' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Edit Fields</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{editingForm.name}</p>
              </div>
              <button onClick={closeEdit} className="text-xl leading-none" style={{ color: 'var(--text-muted)' }}>×</button>
            </div>

            {/* Fields list */}
            <form onSubmit={handleSaveFields} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {editFields.map((field, idx) => {
                  const isChoice = CHOICE_TYPES.includes(field.type)
                  return (
                    <div key={field.id}
                      className="rounded-xl p-4 space-y-3"
                      style={{ background: 'var(--bg-hover, #f5f5f3)', border: '1px solid var(--card-border)' }}>

                      {/* Row 1: Label + Type */}
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>LABEL</label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={e => updateField(idx, { label: e.target.value })}
                            placeholder="Field label"
                            disabled={field.core}
                            style={inputStyle({ opacity: field.core ? 0.6 : 1 })}
                          />
                        </div>
                        <div style={{ width: '130px' }}>
                          <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>TYPE</label>
                          <select
                            value={field.type}
                            onChange={e => updateField(idx, { type: e.target.value as FormField['type'] })}
                            disabled={field.core}
                            style={inputStyle({ opacity: field.core ? 0.6 : 1 })}
                          >
                            {FIELD_TYPES.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Row 2: Placeholder (hidden for choice types) */}
                      {!isChoice && (
                        <div>
                          <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                            PLACEHOLDER (optional)
                          </label>
                          <input
                            type="text"
                            value={field.placeholder ?? ''}
                            onChange={e => updateField(idx, { placeholder: e.target.value })}
                            placeholder="Hint text shown inside the field"
                            style={inputStyle()}
                          />
                        </div>
                      )}

                      {/* Row 3: Options editor (for select / radio / checkbox) */}
                      {isChoice && (
                        <div>
                          <label className="block text-[11px] font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                            OPTIONS
                          </label>

                          {/* Existing options */}
                          <div className="space-y-1.5 mb-2">
                            {(field.options ?? []).length === 0 && (
                              <p className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>
                                No options yet. Add at least one.
                              </p>
                            )}
                            {(field.options ?? []).map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <span
                                  className="flex-1 px-3 py-1.5 rounded-lg text-[12px]"
                                  style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
                                >
                                  {opt}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeOption(idx, optIdx)}
                                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg transition-all"
                                  style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444' }}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Add option input */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={optionInputs[field.id] ?? ''}
                              onChange={e => setOptionInputs(prev => ({ ...prev, [field.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(field.id, idx) } }}
                              placeholder="New option…"
                              style={inputStyle({ flex: 1 })}
                            />
                            <button
                              type="button"
                              onClick={() => addOption(field.id, idx)}
                              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold flex-shrink-0"
                              style={{ background: 'var(--cta-bg)', color: '#fff' }}
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Row 4: Required + Delete */}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!field.required}
                            onChange={e => updateField(idx, { required: e.target.checked })}
                            disabled={field.core}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Required</span>
                        </label>

                        {!field.core ? (
                          <button
                            type="button"
                            onClick={() => removeField(idx)}
                            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg transition-all"
                            style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(6,182,212,0.10)', color: '#06B6D4' }}>
                            Core field
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Add field button */}
                <button
                  type="button"
                  onClick={addField}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{ border: '1.5px dashed var(--card-border)', color: 'var(--text-muted)' }}
                >
                  <Plus className="w-4 h-4" />
                  Add Field
                </button>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 flex gap-3 flex-shrink-0"
                style={{ borderTop: '1px solid var(--card-border)' }}>
                <button type="button" onClick={closeEdit}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ background: 'var(--cta-bg)', color: '#fff' }}>
                  {saving ? 'Saving…' : 'Save Fields'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {forms.length === 0 && (
        <div className="text-center py-16 rounded-2xl"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'var(--bg-hover)' }}>
            <FileText className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No forms yet</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Create your first form and share the link with potential clients.
          </p>
        </div>
      )}

      {/* ── Forms list ────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {forms.map(form => (
          <div key={form.id} className="rounded-2xl px-5 py-6"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
            <div className="flex items-start justify-between gap-4">

              {/* Left: info */}
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(6,182,212,0.10)' }}>
                  <FileText className="w-4 h-4" style={{ color: '#06B6D4' }} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[15px] truncate" style={{ color: 'var(--text-primary)' }}>
                    {form.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Created {formatDate(form.created_at)} · {(form.fields?.length || 0) > 0 ? form.fields.length : DEFAULT_FIELDS.length} fields
                  </p>
                  <p className="text-xs mt-1 truncate font-mono" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                    {formUrl(form.id)}
                  </p>
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(form)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Fields
                </button>

                <button
                  onClick={() => handleCopy(form.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: copiedId === form.id ? 'rgba(42,155,104,0.10)' : 'var(--bg-hover)',
                    color: copiedId === form.id ? '#2A9B68' : 'var(--text-secondary)',
                    border: '1px solid var(--card-border)',
                  }}
                >
                  {copiedId === form.id
                    ? <><Check className="w-3.5 h-3.5" /> Copied</>
                    : <><Copy className="w-3.5 h-3.5" /> Copy Link</>
                  }
                </button>

                <a
                  href={formUrl(form.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: 'rgba(6,182,212,0.08)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.20)' }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Test Form
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
