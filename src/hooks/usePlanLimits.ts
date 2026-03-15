'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PLAN_LIMITS, type PlanKey } from '@/lib/stripe'

interface PlanLimitsState {
  plan: PlanKey
  clientCount: number
  projectCount: number
  galleryCount: number
  loading: boolean
  canCreateClient: boolean
  canCreateProject: boolean
  canCreateGallery: boolean
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
  const [projectCount, setProjectCount] = useState(0)
  const [galleryCount, setGalleryCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [
        { data: photographer },
        { count: clients },
        { count: projects },
        { count: galleries },
      ] = await Promise.all([
        supabase.from('photographers').select('plan, trial_ends_at').eq('id', user.id).single(),
        supabase.from('clients').select('*', { count: 'exact', head: true })
          .eq('photographer_id', user.id)
          .in('status', ['lead', 'active']),
        supabase.from('projects').select('*', { count: 'exact', head: true })
          .eq('photographer_id', user.id),
        supabase.from('galleries').select('*', { count: 'exact', head: true })
          .eq('photographer_id', user.id),
      ])

      if (photographer) {
        const trialActive = photographer.trial_ends_at && new Date(photographer.trial_ends_at) > new Date()
        const effectivePlan = trialActive ? (photographer.plan as PlanKey) : ((photographer.plan as PlanKey) || 'free')
        setPlan(effectivePlan)
      }
      setClientCount(clients || 0)
      setProjectCount(projects || 0)
      setGalleryCount(galleries || 0)
      setLoading(false)
    }
    load()
  }, [])

  const limits = PLAN_LIMITS[plan]

  const canCreateClient = limits.maxClients === null || clientCount < limits.maxClients
  const canCreateProject = limits.maxGalleries === null || projectCount < (limits.maxGalleries ?? Infinity)
  const canCreateGallery = limits.maxGalleries === null || galleryCount < (limits.maxGalleries ?? Infinity)

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
    projectCount,
    galleryCount,
    loading,
    canCreateClient,
    canCreateProject,
    canCreateGallery,
    canCreateContract,
    showWatermark: false,
    canHideBranding: true,
    canAccessAnalytics: limits.analytics,
    canAddTeamMembers: limits.teamSeats > 1,
    canUseCustomDomain: limits.customDomain,
    limits,
  }
}
