'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, GripVertical, Trash2, Clock, MapPin, Timer, Edit2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface TimelineEvent {
  id: string
  time: string
  title: string
  location?: string
  duration_minutes?: number
  phase: 'preparation' | 'shoot' | 'wrap' | 'other'
  notes?: string
  photographer_note?: string
}

const PHASE_OPTIONS = [
  { value: 'preparation', label: 'Vorbereitung' },
  { value: 'shoot', label: 'Shooting' },
  { value: 'wrap', label: 'Abschluss' },
  { value: 'other', label: 'Sonstiges' },
] as const

const PHASE_COLORS: Record<string, string> = {
  preparation: 'bg-[#C8A882]/10 text-[#C8A882] border-[#C8A882]/20',
  shoot: 'bg-[#1A1A1A]/10 text-[#1A1A1A] border-[#1A1A1A]/20',
  wrap: 'bg-[#3DBA6F]/10 text-[#3DBA6F] border-[#3DBA6F]/20',
  other: 'bg-[#6B6B6B]/10 text-[#6B6B6B] border-[#6B6B6B]/20',
}

const PHASE_DOT: Record<string, string> = {
  preparation: 'bg-[#C8A882]',
  shoot: 'bg-[#1A1A1A]',
  wrap: 'bg-[#3DBA6F]',
  other: 'bg-[#6B6B6B]',
}

function newEvent(): TimelineEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    time: '09:00',
    title: '',
    phase: 'shoot',
  }
}

// Sortable event row
function SortableEvent({
  event,
  onEdit,
  onDelete,
}: {
  event: TimelineEvent
  onEdit: (event: TimelineEvent) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: event.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex gap-3 group">
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 w-6 flex items-center justify-center cursor-grab text-[#C0C0C0] hover:text-[#6B6B6B] transition-colors mt-1"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Event card */}
      <div className="flex-1 bg-white rounded-xl border border-[#E8E8E4] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-sm font-medium text-[#1A1A1A]">{event.time}</span>
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', PHASE_COLORS[event.phase])}>
                {PHASE_OPTIONS.find(p => p.value === event.phase)?.label}
              </span>
              {event.duration_minutes && (
                <span className="flex items-center gap-1 text-xs text-[#6B6B6B]">
                  <Timer className="w-3 h-3" />
                  {event.duration_minutes} Min.
                </span>
              )}
            </div>
            <p className="font-medium text-[#1A1A1A] text-sm">{event.title || '(Kein Titel)'}</p>
            {event.location && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-[#6B6B6B]" />
                <p className="text-xs text-[#6B6B6B]">{event.location}</p>
              </div>
            )}
            {event.notes && <p className="text-xs text-[#6B6B6B] mt-1">{event.notes}</p>}
            {event.photographer_note && (
              <p className="text-xs text-[#C8A882] mt-1 italic">📷 {event.photographer_note}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(event)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6B6B6B] hover:bg-[#F0F0EC] hover:text-[#1A1A1A] transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(event.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6B6B6B] hover:bg-[#E84C1A]/10 hover:text-[#E84C1A] transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Event edit form
function EventForm({
  event,
  onSave,
  onCancel,
}: {
  event: TimelineEvent
  onSave: (event: TimelineEvent) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<TimelineEvent>({ ...event })

  const set = (key: keyof TimelineEvent, value: string | number) =>
    setForm(prev => ({ ...prev, [key]: value }))

  return (
    <div className="bg-[#FAFAF8] rounded-xl border border-[#E8E8E4] p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Uhrzeit *</label>
          <input
            type="time"
            value={form.time}
            onChange={e => set('time', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm focus:border-[#C8A882] outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Phase *</label>
          <select
            value={form.phase}
            onChange={e => set('phase', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm focus:border-[#C8A882] outline-none bg-white"
          >
            {PHASE_OPTIONS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Titel *</label>
        <input
          type="text"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="z.B. Brautpaar-Shooting"
          className="w-full px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm focus:border-[#C8A882] outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Ort</label>
          <input
            type="text"
            value={form.location || ''}
            onChange={e => set('location', e.target.value)}
            placeholder="z.B. Schlosspark"
            className="w-full px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm focus:border-[#C8A882] outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Dauer (Min.)</label>
          <input
            type="number"
            value={form.duration_minutes || ''}
            onChange={e => set('duration_minutes', parseInt(e.target.value) || 0)}
            placeholder="60"
            min={0}
            className="w-full px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm focus:border-[#C8A882] outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Notiz für Kunden</label>
        <input
          type="text"
          value={form.notes || ''}
          onChange={e => set('notes', e.target.value)}
          placeholder="Sichtbar für den Kunden"
          className="w-full px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm focus:border-[#C8A882] outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B6B6B] mb-1">📷 Fotografen-Notiz (privat)</label>
        <input
          type="text"
          value={form.photographer_note || ''}
          onChange={e => set('photographer_note', e.target.value)}
          placeholder="Nur für dich sichtbar"
          className="w-full px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm focus:border-[#C8A882] outline-none"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => {
            if (!form.title.trim()) { toast.error('Titel ist erforderlich'); return }
            onSave(form)
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          Speichern
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Abbrechen
        </button>
      </div>
    </div>
  )
}

interface Props {
  projectId: string
  timelineId: string | null
  initialEvents: TimelineEvent[]
}

export default function TimelineBuilder({ projectId, timelineId: initialTimelineId, initialEvents }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>(
    [...initialEvents].sort((a, b) => a.time.localeCompare(b.time))
  )
  const [timelineId, setTimelineId] = useState<string | null>(initialTimelineId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const saveToDb = async (updatedEvents: TimelineEvent[]) => {
    setSaving(true)
    try {
      if (timelineId) {
        await supabase
          .from('timelines')
          .update({ events: updatedEvents, updated_at: new Date().toISOString() })
          .eq('id', timelineId)
      } else {
        const { data } = await supabase
          .from('timelines')
          .insert({ project_id: projectId, events: updatedEvents })
          .select()
          .single()
        if (data) setTimelineId(data.id)
      }
    } catch {
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = events.findIndex(e => e.id === active.id)
    const newIndex = events.findIndex(e => e.id === over.id)
    const reordered = arrayMove(events, oldIndex, newIndex)
    setEvents(reordered)
    await saveToDb(reordered)
  }

  const saveEvent = async (updated: TimelineEvent) => {
    const exists = events.find(e => e.id === updated.id)
    const newEvents = exists
      ? events.map(e => e.id === updated.id ? updated : e)
      : [...events, updated]
    const sorted = [...newEvents].sort((a, b) => a.time.localeCompare(b.time))
    setEvents(sorted)
    setEditingId(null)
    setAddingNew(false)
    await saveToDb(sorted)
    toast.success(exists ? 'Ereignis aktualisiert' : 'Ereignis hinzugefügt')
  }

  const deleteEvent = async (id: string) => {
    if (!confirm('Ereignis wirklich löschen?')) return
    const updated = events.filter(e => e.id !== id)
    setEvents(updated)
    await saveToDb(updated)
    toast.success('Ereignis gelöscht')
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base font-semibold text-[#1A1A1A]">Zeitplan</h3>
          <span className="text-xs text-[#6B6B6B]">{events.length} Ereignisse</span>
          {saving && <span className="text-xs text-[#C8A882]">Speichern...</span>}
        </div>
        <button
          onClick={() => { setAddingNew(true); setEditingId(null) }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Ereignis hinzufügen
        </button>
      </div>

      {/* New event form */}
      {addingNew && (
        <EventForm
          event={newEvent()}
          onSave={saveEvent}
          onCancel={() => setAddingNew(false)}
        />
      )}

      {/* Events list */}
      {events.length === 0 && !addingNew ? (
        <div className="text-center py-12 border-2 border-dashed border-[#E8E8E4] rounded-xl">
          <Clock className="w-8 h-8 text-[#E8E8E4] mx-auto mb-3" />
          <p className="text-sm text-[#6B6B6B] mb-3">Noch keine Ereignisse im Zeitplan.</p>
          <button
            onClick={() => setAddingNew(true)}
            className="text-sm text-[#C8A882] hover:underline"
          >
            Erstes Ereignis hinzufügen
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={events.map(e => e.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {events.map(event => (
                editingId === event.id ? (
                  <EventForm
                    key={event.id}
                    event={event}
                    onSave={saveEvent}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <SortableEvent
                    key={event.id}
                    event={event}
                    onEdit={e => { setEditingId(e.id); setAddingNew(false) }}
                    onDelete={deleteEvent}
                  />
                )
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
