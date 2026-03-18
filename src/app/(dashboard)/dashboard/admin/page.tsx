'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Shield, Crown, UserX, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

const ADMIN_ID = '3f3a14b9-3bb2-40fa-b0eb-5fea92f67429'

interface UserRow {
  id: string
  full_name: string | null
  email: string | null
  plan: string
  trial_ends_at: string | null
  created_at: string
}

const planColors: Record<string, { bg: string; color: string }> = {
  free:    { bg: 'rgba(100,116,139,0.12)', color: '#64748B' },
  starter: { bg: 'rgba(196,164,124,0.12)', color: '#C4A47C' },
  pro:     { bg: 'rgba(59,130,246,0.12)',  color: '#3B82F6' },
  studio:  { bg: 'rgba(139,92,246,0.12)',  color: '#8B5CF6' },
}

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserRow[]>([])
  const [months, setMonths] = useState<Record<string, number>>({})
  const [working, setWorking] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'created' | 'plan' | 'name'>('created')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.id !== ADMIN_ID) {
        router.replace('/dashboard')
        return
      }
      await loadUsers()
    }
    init()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('photographers')
      .select('id, full_name, email, plan, trial_ends_at, created_at')
      .order('created_at', { ascending: false })

    if (error) { toast.error('Error loading users'); setLoading(false); return }
    setUsers((data || []) as UserRow[])
    setLoading(false)
  }

  const grantPro = async (photographerId: string) => {
    setWorking(photographerId)
    const m = months[photographerId] || 6
    const res = await fetch('/api/admin/grant-pro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photographer_id: photographerId, months: m, action: 'grant' }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Error'); setWorking(null); return }
    toast.success(`✅ PRO granted for ${m} months!`)
    setWorking(null)
    await loadUsers()
  }

  const revokePro = async (photographerId: string) => {
    if (!confirm('Revoke PRO and set back to Free?')) return
    setWorking(photographerId)
    const res = await fetch('/api/admin/grant-pro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photographer_id: photographerId, action: 'revoke' }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Error'); setWorking(null); return }
    toast.success('Plan revoked → Free')
    setWorking(null)
    await loadUsers()
  }

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const sorted = [...users].sort((a, b) => {
    let cmp = 0
    if (sortBy === 'name') cmp = (a.full_name || '').localeCompare(b.full_name || '')
    else if (sortBy === 'plan') cmp = (a.plan || '').localeCompare(b.plan || '')
    else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return sortDir === 'asc' ? cmp : -cmp
  })

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return null
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />
  }

  const stats = {
    total: users.length,
    free: users.filter(u => u.plan === 'free').length,
    pro: users.filter(u => u.plan === 'pro').length,
    studio: users.filter(u => u.plan === 'studio').length,
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-in">
        <div className="h-8 w-40 rounded-lg shimmer" />
        <div className="h-64 rounded-2xl shimmer" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)' }}>
            <Shield className="w-5 h-5" style={{ color: '#6366F1' }} />
          </div>
          <div>
            <h1 className="font-black text-[1.6rem]" style={{ letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
              Admin Panel
            </h1>
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Manage user plans
            </p>
          </div>
        </div>
        <button
          onClick={loadUsers}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold transition-all"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: stats.total, color: '#6366F1', bg: 'rgba(99,102,241,0.10)' },
          { label: 'Free',        value: stats.free,  color: '#64748B', bg: 'rgba(100,116,139,0.10)' },
          { label: 'PRO',         value: stats.pro,   color: '#3B82F6', bg: 'rgba(59,130,246,0.10)' },
          { label: 'Studio',      value: stats.studio,color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            <p className="text-[28px] font-black" style={{ color: s.color, letterSpacing: '-0.04em' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
        {/* Table header */}
        <div className="grid gap-3 px-5 py-3 text-[11px] font-bold uppercase tracking-widest"
          style={{ gridTemplateColumns: '1fr 180px 120px 160px 200px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
          <button className="text-left hover:opacity-70 transition-opacity" onClick={() => toggleSort('name')}>
            User <SortIcon col="name" />
          </button>
          <button className="text-left hover:opacity-70 transition-opacity" onClick={() => toggleSort('plan')}>
            Plan <SortIcon col="plan" />
          </button>
          <span>Trial ends</span>
          <button className="text-left hover:opacity-70 transition-opacity" onClick={() => toggleSort('created')}>
            Joined <SortIcon col="created" />
          </button>
          <span>Actions</span>
        </div>

        {sorted.map((user, i) => {
          const pc = planColors[user.plan] || planColors.free
          const isWorking = working === user.id
          const trialDate = user.trial_ends_at ? new Date(user.trial_ends_at) : null
          const trialExpired = trialDate && trialDate < new Date()
          const isPro = user.plan === 'pro' || user.plan === 'studio'

          return (
            <div
              key={user.id}
              className="grid gap-3 px-5 py-3.5 items-center transition-colors"
              style={{
                gridTemplateColumns: '1fr 180px 120px 160px 200px',
                borderBottom: i < sorted.length - 1 ? '1px solid var(--border-color)' : 'none',
                background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'var(--bg-hover)')}
            >
              {/* User info */}
              <div className="min-w-0">
                <p className="font-bold text-[13px] truncate" style={{ color: 'var(--text-primary)' }}>
                  {user.full_name || '—'}
                </p>
                <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
              </div>

              {/* Plan badge */}
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                  style={{ background: pc.bg, color: pc.color }}>
                  {isPro && <Crown className="w-3 h-3" />}
                  {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                </span>
              </div>

              {/* Trial ends */}
              <div>
                {trialDate ? (
                  <span className="text-[11px] font-medium" style={{ color: trialExpired ? '#EF4444' : '#10B981' }}>
                    {trialExpired ? '⚠ Expired' : trialDate.toLocaleDateString('de-DE')}
                  </span>
                ) : (
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>—</span>
                )}
              </div>

              {/* Joined */}
              <div>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {new Date(user.created_at).toLocaleDateString('de-DE')}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {!isPro ? (
                  <>
                    <select
                      value={months[user.id] || 6}
                      onChange={e => setMonths(prev => ({ ...prev, [user.id]: parseInt(e.target.value) }))}
                      className="text-[11px] font-bold px-2 py-1 rounded-lg"
                      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      {[1, 2, 3, 6, 12].map(m => (
                        <option key={m} value={m}>{m}m</option>
                      ))}
                    </select>
                    <button
                      onClick={() => grantPro(user.id)}
                      disabled={isWorking}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: '#3B82F6' }}
                    >
                      {isWorking
                        ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <><Crown className="w-3 h-3" /> Grant PRO</>
                      }
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => revokePro(user.id)}
                    disabled={isWorking}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'rgba(196,59,44,0.12)', color: '#C43B2C' }}
                  >
                    {isWorking
                      ? <span className="w-3 h-3 border-2 border-red-300/30 border-t-red-400 rounded-full animate-spin" />
                      : <><UserX className="w-3 h-3" /> Revoke</>
                    }
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
