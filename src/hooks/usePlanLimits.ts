'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PLAN_LIMITS, type PlanKey } from '@/lib/stripe'

interface PlanLimitsState {
  plan: PlanKey
  clientCount: number
  loading: boolean
  canCreateClient: boolean
  canCreateContract: (projectId: string) => Promise<boolean>
  showWatermark: boolean
  canHideBranding: boolean
  canAccessAnalytics: boolean
  canAddTeamMembers: boolean
  canUseCustomDomain: boolean
  limits: typeof PLAN_LIMITS[PlanKey]
}

export function usePlanLimits(): PlanLimitsState {
  const [plan, setPlan] = useState<PlanKey>('free')
  const [clientCount, setClientCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [{ data: photographer }, { count }] = await Promise.all([
        supabase.from('photographers').select('plan').eq('id', user.id).single(),
        supabase.from('clients').select('*', { count: 'exact', head: true })
          .eq('photographer_id', user.id)
          .in('status', ['lead', 'active']),
      ])

      if (photographer) setPlan((photographer.plan as PlanKey) || 'free')
      setClientCount(count || 0)
      setLoading(false)
    }
    load()
  }, [])

  const limits = PLAN_LIMITS[plan]

  const canCreateClient = limits.maxClients === null || clientCount < limits.maxClients

  const canCreateContract = async (projectId: string): Promise<boolean> => {
    if (limits.maxContractsPerClient === null) return true
    const supabase = createClient()
    const { count } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
    return (count || 0) < (limits.maxContractsPerClient || 1)
  }

  return {
    plan,
    clientCount,
    loading,
    canCreateClient,
    canCreateContract,
    showWatermark: limits.watermark,
    canHideBranding: limits.customBranding,
    canAccessAnalytics: limits.analytics,
    canAddTeamMembers: limits.teamSeats > 1,
    canUseCustomDomain: limits.customDomain,
    limits,
  }
}
