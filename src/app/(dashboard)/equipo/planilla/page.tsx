import { getAuthProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUnpaidCommissions, getSalaryPayments } from '@/lib/actions/accounting'
import { PlanillaDashboard } from '@/components/equipo/planilla-dashboard'

export const dynamic = 'force-dynamic'

export default async function PlanillaPage() {
  const { user, profile } = await getAuthProfile()
  if (!user || !profile) redirect('/login')
  if (profile.role !== 'admin') redirect('/')

  const [unpaidCommissions, salaryPayments] = await Promise.all([
    getUnpaidCommissions(),
    getSalaryPayments(),
  ])

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
