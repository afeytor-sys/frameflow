'use client'

import { useState } from 'react'
import { Plus, Copy, ExternalLink, FileText, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface Form {
  id: string
  photographer_id: string
  name: string
  fields: unknown[]
  created_at: string
}

interface Props {
  forms: Form[]
  appUrl: string
}

export default function FormsClient({ forms: initialForms, appUrl }: Props) {
  const [forms, setForms] = useState(initialForms)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function formUrl(formId: string) {
    return `${appUrl}/form/${formId}`
  }

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
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create form')
        return
      }
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

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

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
          style={{ background: 'var(--accent, #C9A96E)', color: '#fff' }}
        >
          <Plus className="w-4 h-4" />
          Create Form
        </button>
      </div>

      {/* Create form modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div className="w-full max-w-md rounded-2xl p-6"
            style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--card-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              New Form
            </h2>
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
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{
                    background: 'var(--bg-hover, #f5f5f3)',
                    border: '1.5px solid var(--card-border, #e5e7eb)',
                    color: 'var(--text-primary)',
                  }}
                />
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  Default fields (Name, Email, Message) are always included.
                </p>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setNewName('') }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ background: 'var(--accent, #C9A96E)', color: '#fff' }}
                >
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Empty state */}
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

      {/* Forms list */}
      <div className="space-y-3">
        {forms.map(form => (
          <div key={form.id}
            className="rounded-2xl p-5"
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
                    Created {formatDate(form.created_at)}
                  </p>
                  {/* Form URL preview */}
                  <p className="text-xs mt-1 truncate font-mono" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                    {formUrl(form.id)}
                  </p>
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Copy Link */}
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

                {/* Test Form */}
                <a
                  href={formUrl(form.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: 'rgba(6,182,212,0.08)',
                    color: '#06B6D4',
                    border: '1px solid rgba(6,182,212,0.20)',
                  }}
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
