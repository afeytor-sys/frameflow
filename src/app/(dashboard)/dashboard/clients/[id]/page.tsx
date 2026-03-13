import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, Plus, Mail, Phone, MapPin, Calendar } from 'lucide-react'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('photographer_id', user!.id)
    .single()

  if (!client) notFound()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  const statusColors: Record<string, string> = {
    lead: 'bg-[#6B6B6B]/10 text-[#6B6B6B]',
    active: 'bg-[#3DBA6F]/10 text-[#3DBA6F]',
    delivered: 'bg-[#C8A882]/10 text-[#C8A882]',
    archived: 'bg-[#E8E8E4] text-[#6B6B6B]',
  }

  const statusLabels: Record<string, string> = {
    lead: 'Interessent', active: 'Aktiv', delivered: 'Geliefert', archived: 'Archiviert',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/clients" className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E8E8E4] text-[#6B6B6B] hover:bg-[#F0F0EC] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-semibold text-[#1A1A1A]">{client.full_name}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[client.status]}`}>
              {statusLabels[client.status]}
            </span>
          </div>
          {client.project_type && <p className="text-[#6B6B6B] text-sm capitalize">{client.project_type}</p>}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Client info */}
        <div className="bg-white rounded-xl border border-[#E8E8E4] p-5 space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#1A1A1A]">Kontakt</h2>
          <div className="space-y-3">
            {client.email && (
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#6B6B6B] flex-shrink-0" />
                <a href={`mailto:${client.email}`} className="text-sm text-[#1A1A1A] hover:text-[#C8A882] transition-colors">{client.email}</a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#6B6B6B] flex-shrink-0" />
                <a href={`tel:${client.phone}`} className="text-sm text-[#1A1A1A]">{client.phone}</a>
              </div>
            )}
            {client.shoot_date && (
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-[#6B6B6B] flex-shrink-0" />
                <span className="text-sm text-[#1A1A1A]">{formatDate(client.shoot_date, 'de')}</span>
              </div>
            )}
            {client.location && (
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-[#6B6B6B] flex-shrink-0" />
                <span className="text-sm text-[#1A1A1A]">{client.location}</span>
              </div>
            )}
          </div>
          {client.notes && (
            <div className="pt-3 border-t border-[#F0F0EC]">
              <p className="text-xs text-[#6B6B6B] mb-1">Notizen</p>
              <p className="text-sm text-[#1A1A1A]">{client.notes}</p>
            </div>
          )}
        </div>

        {/* Projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[#1A1A1A]">Projekte</h2>
            <Link href={`/dashboard/projects/new?client=${id}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] transition-colors">
              <Plus className="w-3.5 h-3.5" />
              Neues Projekt
            </Link>
          </div>

          {projects && projects.length > 0 ? (
            <div className="space-y-3">
              {projects.map((project) => (
                <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="block bg-white rounded-xl border border-[#E8E8E4] p-4 hover:border-[#C8A882]/30 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#1A1A1A] text-sm">{project.title}</p>
                      {project.shoot_date && <p className="text-xs text-[#6B6B6B] mt-0.5">{formatDate(project.shoot_date, 'de')}</p>}
                    </div>
                    <span className="text-xs font-mono text-[#6B6B6B] bg-[#F0F0EC] px-2 py-0.5 rounded">{project.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E8E8E4] flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-[#6B6B6B] mb-3">Noch keine Projekte</p>
              <Link href={`/dashboard/projects/new?client=${id}`} className="text-xs text-[#C8A882] hover:text-[#B8987A] font-medium">
                Erstes Projekt erstellen
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
