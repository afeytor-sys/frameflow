'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Undo, Redo,
} from 'lucide-react'

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
            title="Überschrift 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Überschrift 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </ToolbarButton>

          <div className="w-px h-5 mx-1" style={{ background: 'var(--border-color)' }} />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Aufzählung"
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
            title="Rückgängig"
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
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
