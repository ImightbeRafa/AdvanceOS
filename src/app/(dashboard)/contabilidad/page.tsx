import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AccountingDashboard } from '@/components/contabilidad/accounting-dashboard'
import { getAccountingSummary, getExpenses, getUnpaidCommissions } from '@/lib/actions/accounting'

export const dynamic = 'force-dynamic'

export default async function ContabilidadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  const summary = await getAccountingSummary()
  const expenses = await getExpenses()
  const unpaidCommissions = await getUnpaidCommissions()

  const { data: exchangeRate } = await supabase
    .from('exchange_rates')
    .select('usd_to_crc')
    .order('date', { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contabilidad</h1>
        <p className="text-muted-foreground">
          Revenue, gastos, márgenes y métricas financieras.
        </p>
      </div>
      <AccountingDashboard
        summary={summary}
        expenses={expenses}
        unpaidCommissions={unpaidCommissions}
        exchangeRate={exchangeRate?.usd_to_crc ?? 530}
      />
    </div>
  )
}
