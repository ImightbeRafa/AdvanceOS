import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAccountingSummary } from '@/lib/actions/accounting'

export const dynamic = 'force-dynamic'

import { SetterDashboard } from '@/components/dashboards/setter-dashboard'
import { CloserDashboard } from '@/components/dashboards/closer-dashboard'
import { AdminDashboard } from '@/components/dashboards/admin-dashboard'
import { DeliveryDashboard } from '@/components/dashboards/delivery-dashboard'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: sets } = await supabase
    .from('sets')
    .select('*, setter:profiles!sets_setter_id_fkey(id, full_name), closer:profiles!sets_closer_id_fkey(id, full_name), deal:deals(*)')
    .order('scheduled_at', { ascending: true })
    .limit(100)

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, client:clients(business_name)')
    .order('due_date')
    .limit(50)

  const { data: unpaidCommissions } = await supabase
    .from('commissions')
    .select('amount')
    .eq('team_member_id', user.id)
    .eq('is_paid', false)

  const myCommissionsTotal = (unpaidCommissions ?? []).reduce((s, c) => s + Number(c.amount), 0)

  switch (profile.role) {
    case 'setter':
      return <SetterDashboard profile={profile} sets={sets ?? []} commissionsTotal={myCommissionsTotal} />
    case 'closer':
      return <CloserDashboard profile={profile} sets={sets ?? []} tasks={tasks ?? []} commissionsTotal={myCommissionsTotal} />
    case 'admin': {
      const accountingSummary = await getAccountingSummary()
      return <AdminDashboard profile={profile} sets={sets ?? []} tasks={tasks ?? []} accounting={accountingSummary} />
    }
    case 'delivery':
      return <DeliveryDashboard profile={profile} tasks={tasks ?? []} />
    default:
      redirect('/login')
  }
}
