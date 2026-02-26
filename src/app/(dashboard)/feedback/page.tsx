import { createClient, getAuthProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTickets } from '@/lib/actions/feedback'
import { FeedbackDashboard } from '@/components/feedback/feedback-dashboard'

export const dynamic = 'force-dynamic'

export default async function FeedbackPage() {
  const { user, profile } = await getAuthProfile()
  if (!user || !profile) redirect('/login')
  if (profile.role !== 'admin') redirect('/')

  const supabase = await createClient()

  const [tickets, { data: teamMembers }] = await Promise.all([
    getTickets(),
    supabase.from('profiles').select('id, full_name, role').eq('active', true).order('full_name'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feedback</h1>
        <p className="text-muted-foreground">
          Gestión de tickets y feedback del equipo.
        </p>
      </div>
      <FeedbackDashboard
        tickets={tickets}
        teamMembers={teamMembers ?? []}
      />
    </div>
  )
}
