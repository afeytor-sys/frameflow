'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { Mark } from '@tiptap/core'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Undo, Redo, Braces,
} from 'lucide-react'

// ── TipTap extension: recognises <span class="contract-variable"> ─────────
const ContractVariable = Mark.create({
  name: 'contractVariable',

  addAttributes() {
    return {
      variable: {
        default: null,
        parseHTML: (element) => {
          const text = element.textContent || ''
          const match = text.match(/\{\{([^}]+)\}\}/)
          return match ? match[1].trim() : null
        },
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (node) => {
          const el = node as HTMLElement
          return el.classList.contains('contract-variable') ? {} : false
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      {
        ...HTMLAttributes,
        class: 'contract-variable',
        style:
          'background:rgba(139,92,246,0.12);color:#8B5CF6;border-radius:4px;padding:1px 5px;font-weight:600;font-size:0.92em;cursor:default;',
        'data-variable': HTMLAttributes.variable || '',
      },
      0,
    ]
  },
})

// ── Predefined variables the photographer can insert ──────────────────────
const PRESET_VARIABLES = [
  { key: 'endereço',        label: 'Adresse (Kunde)' },
  { key: 'CPF',             label: 'CPF / Ausweis-Nr.' },
  { key: 'data_nascimento', label: 'Geburtsdatum' },
  { key: 'telefone',        label: 'Telefon (Kunde)' },
  { key: 'cidade',          label: 'Stadt (Kunde)' },
  { key: 'campo_livre',     label: 'Freies Feld' },
]

// ── Variable insert dropdown button ───────────────────────────────────────
function VariableInsertButton({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [open, setOpen] = useState(false)
  const [customName, setCustomName] = useState('')

  const insert = (key: string) => {
    if (!editor) return
    editor.chain().focus().insertContent(`<span class="contract-variable">{{${key}}}</span>`).run()
    setOpen(false)
    setCustomName('')
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Insert client field"
        className="flex items-center gap-1 px-2 h-8 rounded text-[11px] font-bold transition-colors"
        style={{ color: '#8B5CF6', background: open ? 'rgba(139,92,246,0.12)' : 'transparent', border: '1px solid rgba(139,92,246,0.25)' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'rgba(139,92,246,0.08)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        <Braces className="w-3.5 h-3.5" />
        Kundenfeld
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div
            className="dropdown-glass absolute left-0 top-full mt-1 z-50 rounded-xl overflow-hidden"
            style={{ minWidth: '220px' }}
          >
            <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <p className="text-[10.5px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Insert client field
              </p>
            </div>
            <div className="py-1">
              {PRESET_VARIABLES.map(v => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insert(v.key)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span className="text-[12.5px] font-medium">{v.label}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.10)', color: '#8B5CF6' }}>
                    {`{{${v.key}}}`}
                  </span>
                </button>
              ))}
            </div>
            {/* Custom field */}
            <div className="px-3 py-2.5" style={{ borderTop: '1px solid var(--border-color)' }}>
              <p className="text-[10.5px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Eigenes Feld
              </p>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value.replace(/\s+/g, '_'))}
                  placeholder="feldname"
                  className="flex-1 px-2 py-1 rounded-lg text-[12px] outline-none"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  onKeyDown={e => { if (e.key === 'Enter' && customName.trim()) insert(customName.trim()) }}
                />
                <button
                  type="button"
                  onClick={() => { if (customName.trim()) insert(customName.trim()) }}
                  disabled={!customName.trim()}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white disabled:opacity-40"
                  style={{ background: '#8B5CF6' }}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface Props {
  content: string
  onChange: (html: string) => void
  editable?: boolean
  placeholder?: string
}

export default function ContractEditor({
  content,
  onChange,
  editable = true,
  placeholder = 'Vertragsinhalt hier eingeben...',
}: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
      ContractVariable,
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content prose prose-sm max-w-none focus:outline-none min-h-[400px] px-6 py-5',
      },
    },
  })

  if (!mounted || !editor) return (
    <div
      className="rounded-xl overflow-hidden min-h-[400px] flex items-center justify-center"
      style={{ border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
    >
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  )

  const ToolbarButton = ({
    onClick,
    active,
    disabled,
    children,
    title,
  }: {
    onClick: () => void
    active?: boolean
    disabled?: boolean
    children: React.ReactNode
    title?: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded text-sm transition-colors',
        disabled && 'opacity-30 cursor-not-allowed'
      )}
      style={
        active
          ? { background: 'var(--text-primary)', color: 'var(--bg-page)' }
          : { color: 'var(--text-muted)' }
      }
      onMouseEnter={(e) => {
        if (!active && !disabled) {
          e.currentTarget.style.background = 'var(--bg-hover)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = active ? 'var(--text-primary)' : 'transparent'
          e.currentTarget.style.color = active ? 'var(--bg-page)' : 'var(--text-muted)'
        }
      }}
    >
      {children}
    </button>
  )

  return (
    <div
      className="rounded-xl overflow-hidden tiptap-editor"
      style={{ border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
    >
      {editable && (
        <div
          className="flex items-center gap-0.5 px-3 py-2 flex-wrap"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Fett"
          >
            <Bold className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Kursiv"
          >
            <Italic className="w-3.5 h-3.5" />
          </ToolbarButton>

          <div className="w-px h-5 mx-1" style={{ background: 'var(--border-color)' }} />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </ToolbarButton>

          <div className="w-px h-5 mx-1" style={{ background: 'var(--border-color)' }} />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet list"
          >
            <List className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Nummerierte Liste"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolbarButton>

          <div className="w-px h-5 mx-1" style={{ background: 'var(--border-color)' }} />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Wiederholen"
          >
            <Redo className="w-3.5 h-3.5" />
          </ToolbarButton>

          <div className="w-px h-5 mx-1" style={{ background: 'var(--border-color)' }} />

          {/* Variable insert dropdown */}
          <VariableInsertButton editor={editor} />
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
