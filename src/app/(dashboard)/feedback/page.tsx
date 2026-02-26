import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTickets } from '@/lib/actions/feedback'
import { FeedbackDashboard } from '@/components/feedback/feedback-dashboard'

export const dynamic = 'force-dynamic'

export default async function FeedbackPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  const tickets = await getTickets()

  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('active', true)
    .order('full_name')

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
