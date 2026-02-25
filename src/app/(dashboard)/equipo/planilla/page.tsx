import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUnpaidCommissions, getSalaryPayments } from '@/lib/actions/accounting'
import { PlanillaDashboard } from '@/components/equipo/planilla-dashboard'

export const dynamic = 'force-dynamic'

export default async function PlanillaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  const unpaidCommissions = await getUnpaidCommissions()
  const salaryPayments = await getSalaryPayments()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Planilla</h1>
        <p className="text-muted-foreground">
          Gestión de salarios y comisiones del equipo.
        </p>
      </div>
      <PlanillaDashboard
        unpaidCommissions={unpaidCommissions}
        salaryPayments={salaryPayments}
      />
    </div>
  )
}
