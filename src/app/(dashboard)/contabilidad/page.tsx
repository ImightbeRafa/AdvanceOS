import { createClient, getAuthProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AccountingDashboard } from '@/components/contabilidad/accounting-dashboard'
import { getAccountingSummary, getExpenses, getAdSpends, getUnpaidCommissions, getManualTransactions } from '@/lib/actions/accounting'
import { todayCR, monthStartCR } from '@/lib/utils/dates'

export const dynamic = 'force-dynamic'

export default async function ContabilidadPage() {
  const { user, profile } = await getAuthProfile()
  if (!user || !profile) redirect('/login')
  if (profile.role !== 'admin') redirect('/')

  const supabase = await createClient()
  const monthStart = monthStartCR()
  const today = todayCR()

  const [summary, expenses, adSpends, unpaidCommissions, manualTransactions, { data: exchangeRate }] = await Promise.all([
    getAccountingSummary(monthStart, today),
    getExpenses(),
    getAdSpends(),
    getUnpaidCommissions(),
    getManualTransactions(),
    supabase.from('exchange_rates').select('usd_to_crc').order('date', { ascending: false }).limit(1).single(),
  ])

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
        adSpends={adSpends}
        manualTransactions={manualTransactions}
        unpaidCommissions={unpaidCommissions}
        exchangeRate={exchangeRate?.usd_to_crc ?? 530}
        initialPeriod="mtd"
      />
    </div>
  )
}
