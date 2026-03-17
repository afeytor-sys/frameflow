'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  EMAIL_TEMPLATES,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type EmailCategory,
} from '@/lib/emailTemplates'
import {
  Mail, Plus, X, ChevronRight, Sparkles, BookMarked,
  Trash2, PenLine, Eye, Check,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface UserTemplate {
  id: string
  name: string
  description: string | null
  category: EmailCategory
  subject: string
  body: string
  created_at: string
}

interface Props {
  userTemplates: UserTemplate[]
}

const TEMPLATE_ACCENTS = [
  { bg: 'rgba(249,115,22,0.10)',  color: '#F97316', border: 'rgba(249,115,22,0.20)' },
  { bg: 'rgba(16,185,129,0.10)',  color: '#10B981', border: 'rgba(16,185,129,0.20)' },
  { bg: 'rgba(139,92,246,0.10)',  color: '#8B5CF6', border: 'rgba(139,92,246,0.20)' },
  { bg: 'rgba(99,102,241,0.10)',  color: '#6366F1', border: 'rgba(99,102,241,0.20)' },
  { bg: 'rgba(236,72,153,0.10)',  color: '#EC4899', border: 'rgba(236,72,153,0.20)' },
  { bg: 'rgba(245,158,11,0.10)',  color: '#F59E0B', border: 'rgba(245,158,11,0.20)' },
]

const CATEGORIES: { key: EmailCategory | 'all'; label: string }[] = [
  { key: 'all',        label: 'Alle' },
  { key: 'rechnung',   label: 'Rechnung' },
  { key: 'galerie',    label: 'Galerie' },
  { key: 'fragebogen', label: 'Fragebogen' },
  { key: 'general',    label: 'Allgemein' },
]

const PLACEHOLDER_HINTS = [
  { key: '{{client_name}}',    label: 'Kundenname' },
  { key: '{{studio_name}}',    label: 'Studio-Name' },
  { key: '{{project_title}}',  label: 'Projekttitel' },
  { key: '{{portal_url}}',     label: 'Portal-Link' },
]

export default function EmailVorlagenClient({ userTemplates: initialUserTemplates }: Props) {
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>(initialUserTemplates)
  const [categoryFilter, setCategoryFilter] = useState<EmailCategory | 'all'>('all')

  // New template modal
  const [showNewModal, setShowNewModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCategory, setNewCategory] = useState<EmailCategory>('general')
  const [newSubject, setNewSubject] = useState('')
  const [newBody, setNewBody] = useState('')
  const [saving, setSaving] = useState(false)

  // Preview modal
  const [previewTpl, setPreviewTpl] = useState<{
    name: string; description: string | null; category: EmailCategory; subject: string; body: string
  } | null>(null)

  // Edit modal
  const [editTpl, setEditTpl] = useState<UserTemplate | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editCategory, setEditCategory] = useState<EmailCategory>('general')
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const openEdit = (tpl: UserTemplate) => {
    setEditTpl(tpl)
    setEditName(tpl.name)
    setEditDesc(tpl.description || '')
    setEditCategory(tpl.category)
    setEditSubject(tpl.subject)
    setEditBody(tpl.body)
  }

  const openNewFromBuiltin = (tpl: typeof EMAIL_TEMPLATES[0]) => {
    setNewName(tpl.name)
    setNewDesc(tpl.description)
    setNewCategory(tpl.category)
    setNewSubject(tpl.subject)
    setNewBody(tpl.body)
    setShowNewModal(true)
  }

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('Bitte einen Namen eingeben'); return }
    if (!newSubject.trim()) { toast.error('Bitte einen Betreff eingeben'); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaving(false); return }
      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          photographer_id: user.id,
          name: newName.trim(),
          description: newDesc.trim() || null,
          category: newCategory,
          subject: newSubject.trim(),
          body: newBody,
        })
        .select()
        .single()
      if (error) {
        if (error.code === '42P01') {
          toast.error('Table not yet available. Please run migration.')
        } else {
          toast.error(`Fehler: ${error.message}`)
        }
        setSaving(false)
        return
      }
      setUserTemplates(prev => [data as UserTemplate, ...prev])
      setShowNewModal(false)
      setNewName(''); setNewDesc(''); setNewSubject(''); setNewBody(''); setNewCategory('general')
      toast.success('Vorlage gespeichert!')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!editTpl) return
    if (!editName.trim()) { toast.error('Bitte einen Namen eingeben'); return }
    if (!editSubject.trim()) { toast.error('Bitte einen Betreff eingeben'); return }
    setEditSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('email_templates')
        .update({
          name: editName.trim(),
          description: editDesc.trim() || null,
          category: editCategory,
          subject: editSubject.trim(),
          body: editBody,
        })
        .eq('id', editTpl.id)
      if (error) { toast.error(`Fehler: ${error.message}`); return }
      setUserTemplates(prev => prev.map(t => t.id === editTpl.id
        ? { ...t, name: editName.trim(), description: editDesc.trim() || null, category: editCategory, subject: editSubject.trim(), body: editBody }
        : t
      ))
      setEditTpl(null)
      toast.success('Vorlage aktualisiert!')
    } finally {
      setEditSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Really delete this template?')) return
    const supabase = createClient()
    await supabase.from('email_templates').delete().eq('id', id)
    setUserTemplates(prev => prev.filter(t => t.id !== id))
    toast.success('Template deleted')
  }

  const filteredBuiltin = categoryFilter === 'all'
    ? EMAIL_TEMPLATES
    : EMAIL_TEMPLATES.filter(t => t.category === categoryFilter)

  const filteredUser = categoryFilter === 'all'
    ? userTemplates
    : userTemplates.filter(t => t.category === categoryFilter)

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in">

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .email-card {
          transition: transform 250ms ease, box-shadow 250ms ease, border-color 250ms ease !important;
        }
        .email-card:hover {
          transform: translateY(-2px) !important;
        }
      `}</style>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-black"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}
          >
            E-Mail Vorlagen
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {userTemplates.length + EMAIL_TEMPLATES.length} templates · Create and manage email templates for clients
          </p>
        </div>
        <button
          onClick={() => { setNewName(''); setNewDesc(''); setNewSubject(''); setNewBody(''); setNewCategory('general'); setShowNewModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all hover:opacity-88 active:scale-[0.98] flex-shrink-0"
          style={{ background: '#F97316', boxShadow: '0 1px 8px rgba(249,115,22,0.30)' }}
        >
          <Plus className="w-4 h-4" />
          Neue Vorlage
        </button>
      </div>

      {/* ── Category filter ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {CATEGORIES.map(cat => {
          const isActive = categoryFilter === cat.key
          const cc = cat.key !== 'all' ? CATEGORY_COLORS[cat.key as EmailCategory] : null
          return (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key as EmailCategory | 'all')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all"
              style={{
                background: isActive ? (cc ? cc.bg : 'var(--bg-active)') : 'var(--bg-surface)',
                color: isActive ? (cc ? cc.color : 'var(--text-on-active)') : 'var(--text-muted)',
                border: `1px solid ${isActive ? (cc ? cc.border : 'transparent') : 'var(--border-color)'}`,
              }}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* ── Meine Vorlagen ── */}
      {filteredUser.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BookMarked className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Meine Vorlagen
            </h2>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-black"
              style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
            >
              {filteredUser.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredUser.map((tpl, i) => {
              const accent = TEMPLATE_ACCENTS[i % TEMPLATE_ACCENTS.length]
              const cc = CATEGORY_COLORS[tpl.category]
              return (
                <div
                  key={tpl.id}
                  className="email-card rounded-xl overflow-hidden flex flex-col gap-0 group"
                  style={{
                    background: `linear-gradient(135deg, ${accent.color}12 0%, ${accent.color}04 100%)`,
                    border: `1px solid ${accent.color}28`,
                    boxShadow: `0 2px 12px ${accent.color}10`,
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: `${i * 60}ms`,
                    opacity: 0,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = `0 8px 24px ${accent.color}22`
                    e.currentTarget.style.borderColor = accent.color + '45'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = `0 2px 12px ${accent.color}10`
                    e.currentTarget.style.borderColor = accent.color + '28'
                  }}
                >
                  <div className="h-[3px] w-full" style={{ background: accent.color, opacity: 0.7 }} />
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div className="flex items-start justify-between">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                        style={{ background: accent.bg, border: `1px solid ${accent.border}` }}
                      >
                        <Mail className="w-5 h-5" style={{ color: accent.color }} />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => openEdit(tpl)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-muted)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                          title="Bearbeiten"
                        >
                          <PenLine className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tpl.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#E84C1A'; e.currentTarget.style.background = 'rgba(232,76,26,0.10)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{tpl.name}</p>
                      </div>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mb-1"
                        style={{ background: cc.bg, color: cc.color, border: `1px solid ${cc.border}` }}
                      >
                        {CATEGORY_LABELS[tpl.category]}
                      </span>
                      {tpl.description && (
                        <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>{tpl.description}</p>
                      )}
                      <p className="text-xs mt-1.5 truncate font-medium" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                        Betreff: {tpl.subject}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewTpl(tpl)}
                        className="flex-1 text-xs font-medium py-1.5 px-2 rounded-lg transition-colors"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                      >
                        Vorschau
                      </button>
                      <button
                        onClick={() => openEdit(tpl)}
                        className="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-1.5 px-2 rounded-lg transition-all hover:opacity-90"
                        style={{ background: accent.bg, color: accent.color, border: `1px solid ${accent.border}` }}
                      >
                        Bearbeiten
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Standard-Vorlagen ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Standard-Vorlagen
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Create new card */}
          <button
            onClick={() => { setNewName(''); setNewDesc(''); setNewSubject(''); setNewBody(''); setNewCategory('general'); setShowNewModal(true) }}
            className="rounded-xl p-4 flex flex-col gap-3 transition-all hover:scale-[1.01] text-left group"
            style={{ background: 'var(--bg-surface)', border: '2px dashed var(--border-color)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#F97316')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
            >
              <Plus className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Neue Vorlage</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>Eigene E-Mail-Vorlage erstellen und speichern</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#F97316' }}>
              <PenLine className="w-3.5 h-3.5" />
              Vorlage erstellen
            </div>
          </button>

          {filteredBuiltin.map((tpl, i) => {
            const cc = CATEGORY_COLORS[tpl.category]
            const accent = TEMPLATE_ACCENTS[i % TEMPLATE_ACCENTS.length]
            return (
              <div
                key={tpl.id}
                className="email-card rounded-xl overflow-hidden flex flex-col gap-0 group"
                style={{
                  background: `linear-gradient(135deg, ${cc.color}12 0%, ${cc.color}04 100%)`,
                  border: `1px solid ${cc.color}28`,
                  boxShadow: `0 2px 12px ${cc.color}10`,
                  animation: 'fadeSlideUp 0.4s ease forwards',
                  animationDelay: `${(i + 1) * 60}ms`,
                  opacity: 0,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = `0 8px 24px ${cc.color}22`
                  e.currentTarget.style.borderColor = cc.color + '45'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = `0 2px 12px ${cc.color}10`
                  e.currentTarget.style.borderColor = cc.color + '28'
                }}
              >
                <div className="h-[3px] w-full" style={{ background: cc.color, opacity: 0.7 }} />
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                    style={{ background: cc.bg, border: `1px solid ${cc.border}` }}
                  >
                    <Mail className="w-5 h-5" style={{ color: cc.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{tpl.name}</p>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 mb-1"
                      style={{ background: cc.bg, color: cc.color, border: `1px solid ${cc.border}` }}
                    >
                      {CATEGORY_LABELS[tpl.category]}
                    </span>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{tpl.description}</p>
                    <p className="text-xs mt-1.5 truncate font-medium" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                      Betreff: {tpl.subject.replace(/\{\{[^}]+\}\}/g, '…')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewTpl(tpl)}
                      className="flex-1 text-xs font-medium py-1.5 px-2 rounded-lg transition-colors"
                      style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                    >
                      Vorschau
                    </button>
                    <button
                      onClick={() => openNewFromBuiltin(tpl)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-1.5 px-2 rounded-lg transition-all hover:opacity-90"
                      style={{ background: cc.bg, color: cc.color, border: `1px solid ${cc.border}` }}
                    >
                      Anpassen
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Placeholder info ── */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.10)' }}>
            <span className="text-xs">💡</span>
          </div>
          <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Available placeholders
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PLACEHOLDER_HINTS.map(ph => (
            <div
              key={ph.key}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
            >
              <code className="text-[11px] font-bold" style={{ color: '#F97316' }}>{ph.key}</code>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{ph.label}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
          Diese Platzhalter werden beim Senden automatisch durch die echten Werte ersetzt.
        </p>
      </div>

      {/* ── New Template Modal ── */}
      {showNewModal && (
        <TemplateModal
          title="Neue E-Mail Vorlage"
          subtitle="Erstelle deine eigene E-Mail-Vorlage"
          name={newName} setName={setNewName}
          desc={newDesc} setDesc={setNewDesc}
          category={newCategory} setCategory={setNewCategory}
          subject={newSubject} setSubject={setNewSubject}
          body={newBody} setBody={setNewBody}
          saving={saving}
          onSave={handleCreate}
          onClose={() => setShowNewModal(false)}
        />
      )}

      {/* ── Edit Template Modal ── */}
      {editTpl && (
        <TemplateModal
          title="Vorlage bearbeiten"
          subtitle={editTpl.name}
          name={editName} setName={setEditName}
          desc={editDesc} setDesc={setEditDesc}
          category={editCategory} setCategory={setEditCategory}
          subject={editSubject} setSubject={setEditSubject}
          body={editBody} setBody={setEditBody}
          saving={editSaving}
          onSave={handleEdit}
          onClose={() => setEditTpl(null)}
        />
      )}

      {/* ── Preview Modal ── */}
      {previewTpl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setPreviewTpl(null)}
        >
          <div
            className="w-full max-w-xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow-hover)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h2 className="font-black text-[17px]" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{previewTpl.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      background: CATEGORY_COLORS[previewTpl.category].bg,
                      color: CATEGORY_COLORS[previewTpl.category].color,
                      border: `1px solid ${CATEGORY_COLORS[previewTpl.category].border}`,
                    }}
                  >
                    {CATEGORY_LABELS[previewTpl.category]}
                  </span>
                  {previewTpl.description && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{previewTpl.description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPreviewTpl(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Subject */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Betreff</p>
                <div
                  className="px-3 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                >
                  {previewTpl.subject}
                </div>
              </div>
              {/* Body */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Nachricht</p>
                <div
                  className="px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontFamily: 'inherit' }}
                >
                  {previewTpl.body}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button onClick={() => setPreviewTpl(null)} className="text-sm font-medium transition-colors" style={{ color: 'var(--text-muted)' }}>
                Close
              </button>
              <button
                onClick={() => {
                  openNewFromBuiltin(previewTpl as typeof EMAIL_TEMPLATES[0])
                  setPreviewTpl(null)
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: '#F97316' }}
              >
                <Check className="w-4 h-4" />
                Als eigene Vorlage speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shared modal for create/edit ──────────────────────────────────────────────
function TemplateModal({
  title, subtitle,
  name, setName,
  desc, setDesc,
  category, setCategory,
  subject, setSubject,
  body, setBody,
  saving,
  onSave,
  onClose,
}: {
  title: string
  subtitle: string
  name: string; setName: (v: string) => void
  desc: string; setDesc: (v: string) => void
  category: EmailCategory; setCategory: (v: EmailCategory) => void
  subject: string; setSubject: (v: string) => void
  body: string; setBody: (v: string) => void
  saving: boolean
  onSave: () => void
  onClose: () => void
}) {
  const PLACEHOLDER_HINTS = [
    '{{client_name}}', '{{studio_name}}', '{{project_title}}', '{{portal_url}}',
  ]

  const insertPlaceholder = (
    field: 'subject' | 'body',
    ph: string,
    setter: (v: string) => void,
    current: string
  ) => {
    setter(current + ph)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ height: 'min(92vh, 860px)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow-hover)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h2 className="font-black text-[17px]" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{title}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {/* Name + Desc */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="z.B. Galerie-Lieferung"
                className="input-base w-full"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Beschreibung (optional)</label>
              <input
                type="text"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Kurze Beschreibung"
                className="input-base w-full"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11.5px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted)' }}>Kategorie</label>
            <div className="flex flex-wrap gap-2">
              {(['rechnung', 'galerie', 'fragebogen', 'general'] as EmailCategory[]).map(cat => {
                const cc = CATEGORY_COLORS[cat]
                const isSelected = category === cat
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: isSelected ? cc.bg : 'var(--bg-hover)',
                      color: isSelected ? cc.color : 'var(--text-muted)',
                      border: `1px solid ${isSelected ? cc.border : 'var(--border-color)'}`,
                    }}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Subject */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>Betreff *</label>
              <div className="flex items-center gap-1">
                {PLACEHOLDER_HINTS.slice(0, 3).map(ph => (
                  <button
                    key={ph}
                    onClick={() => insertPlaceholder('subject', ph, setSubject, subject)}
                    className="text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors"
                    style={{ background: 'rgba(249,115,22,0.10)', color: '#F97316', border: '1px solid rgba(249,115,22,0.20)' }}
                    title={`Insert ${ph}`}
                  >
                    {ph.replace(/\{\{|\}\}/g, '')}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="z.B. Deine Fotos sind fertig, {{client_name}}!"
              className="input-base w-full"
            />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>Nachricht</label>
              <div className="flex items-center gap-1">
                {PLACEHOLDER_HINTS.map(ph => (
                  <button
                    key={ph}
                    onClick={() => insertPlaceholder('body', ph, setBody, body)}
                    className="text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors"
                    style={{ background: 'rgba(249,115,22,0.10)', color: '#F97316', border: '1px solid rgba(249,115,22,0.20)' }}
                    title={`Insert ${ph}`}
                  >
                    {ph.replace(/\{\{|\}\}/g, '')}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={`Hello {{client_name}},\n\nyour photos are ready!\n\n{{portal_url}}\n\nBest regards,\n{{studio_name}}`}
              rows={10}
              className="input-base w-full resize-none"
              style={{ fontFamily: 'inherit', lineHeight: '1.6' }}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Click a placeholder button to insert it. Line breaks are preserved.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
          <button
            onClick={onSave}
            disabled={saving || !name.trim() || !subject.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
            style={{ background: '#F97316' }}
          >
            {saving
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><BookMarked className="w-4 h-4" />Vorlage speichern</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
