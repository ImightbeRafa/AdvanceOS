import { createClient } from '@/lib/supabase/server'
import { getAuthProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAccountingSummary } from '@/lib/actions/accounting'

export const dynamic = 'force-dynamic'

import { SetterDashboard } from '@/components/dashboards/setter-dashboard'
import { CloserDashboard } from '@/components/dashboards/closer-dashboard'
import { AdminDashboard } from '@/components/dashboards/admin-dashboard'
import { DeliveryDashboard } from '@/components/dashboards/delivery-dashboard'

export default async function HomePage() {
  const { user, profile } = await getAuthProfile()
  if (!user || !profile) redirect('/login')

  const supabase = await createClient()

  const [{ data: sets }, { data: unpaidCommissions }] = await Promise.all([
    supabase
      .from('sets')
      .select('*, setter:profiles!sets_setter_id_fkey(id, full_name), closer:profiles!sets_closer_id_fkey(id, full_name), deal:deals(*)')
      .order('scheduled_at', { ascending: true })
      .limit(200),
    supabase
      .from('commissions')
      .select('amount')
      .eq('team_member_id', user.id)
      .eq('is_paid', false),
  ])

  const myCommissionsTotal = (unpaidCommissions ?? []).reduce((s, c) => s + Number(c.amount), 0)

  switch (profile.role) {
    case 'setter':
      return <SetterDashboard profile={profile} sets={sets ?? []} commissionsTotal={myCommissionsTotal} />
    case 'closer':
      return <CloserDashboard profile={profile} sets={sets ?? []} commissionsTotal={myCommissionsTotal} />
    case 'admin': {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      const [accountingSummary, { data: payments }] = await Promise.all([
        getAccountingSummary(monthStart, monthEnd),
        supabase
          .from('payments')
          .select('set_id, amount_gross'),
      ])

      const paymentsBySet = (payments ?? []).reduce<Record<string, number>>((acc, p) => {
        acc[p.set_id] = (acc[p.set_id] ?? 0) + Number(p.amount_gross)
        return acc
      }, {})

      return <AdminDashboard profile={profile} sets={sets ?? []} accounting={accountingSummary} paymentsBySet={paymentsBySet} />
    }
    case 'delivery': {
      const { data: clients } = await supabase
        .from('clients')
        .select('*, assigned_member:profiles!clients_assigned_to_fkey(id, full_name)')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false })

      const clientIds = (clients ?? []).map((c) => c.id)
      let phases: { client_id: string; phase_name: string; start_date: string; end_date: string; order: number }[] = []
      if (clientIds.length > 0) {
        const { data: phaseData } = await supabase
          .from('advance90_phases')
          .select('client_id, phase_name, start_date, end_date, order')
          .in('client_id', clientIds)
          .order('order')
        phases = phaseData ?? []
      }

      return <DeliveryDashboard profile={profile} clients={clients ?? []} phases={phases} />
    }
    default:
      redirect('/login')
  }
}
