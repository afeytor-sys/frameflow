import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getServerLocale } from '@/lib/dashboardTranslations'
import AutomationsClient from './AutomationsClient'

export const metadata = { title: 'Automations' }

export default async function AutomationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locale = await getServerLocale()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Fetch upcoming projects (next 30 days) that haven't had reminders sent yet
  const in30days = new Date(today)
  in30days.setDate(in30days.getDate() + 30)

  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const [
    { data: upcomingProjects },
    { data: sentProjects },
    { data: automationSettings },
    { data: scheduledEmails },
  ] = await Promise.all([
    // Projects with upcoming shoot dates that still need reminders
    supabase
      .from('projects')
      .select(`
        id, title, shoot_date, client_url, reminders_disabled,
        reminder_7d_sent, reminder_1d_sent,
        client:clients(full_name, email)
      `)
      .eq('photographer_id', user.id)
      .gte('shoot_date', fmt(today))
      .lte('shoot_date', fmt(in30days))
      .not('shoot_date', 'is', null)
      .order('shoot_date', { ascending: true }),

    // Projects that already had reminders sent (last 60 days)
    supabase
      .from('projects')
      .select(`
        id, title, shoot_date,
        reminder_7d_sent, reminder_1d_sent,
        client:clients(full_name, email)
      `)
      .eq('photographer_id', user.id)
      .or('reminder_7d_sent.eq.true,reminder_1d_sent.eq.true')
      .not('shoot_date', 'is', null)
      .order('shoot_date', { ascending: false })
      .limit(50),

    // Automation settings
    supabase
      .from('automation_settings')
      .select('reminder_7d, reminder_1d, notify_email_shoot_reminder_photographer')
      .eq('photographer_id', user.id)
      .single(),

    // Manually scheduled emails (pending + recent sent/cancelled)
    supabase
      .from('scheduled_emails')
      .select('id, to_email, to_name, subject, type, scheduled_at, sent_at, cancelled_at, status, error_message, project_id, created_at')
      .eq('photographer_id', user.id)
      .order('scheduled_at', { ascending: true })
      .limit(100),
  ])

  return (
    <AutomationsClient
      upcomingProjects={upcomingProjects ?? []}
      sentProjects={sentProjects ?? []}
      automationSettings={automationSettings}
      scheduledEmails={scheduledEmails ?? []}
      todayStr={fmt(today)}
      initialLocale={locale}
    />
  )
}
