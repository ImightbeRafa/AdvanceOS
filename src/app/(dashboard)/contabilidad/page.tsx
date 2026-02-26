import { createClient, getAuthProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AccountingDashboard } from '@/components/contabilidad/accounting-dashboard'
import { getAccountingSummary, getExpenses, getUnpaidCommissions } from '@/lib/actions/accounting'

export const dynamic = 'force-dynamic'

export default async function ContabilidadPage() {
  const { user, profile } = await getAuthProfile()
  if (!user || !profile) redirect('/login')
  if (profile.role !== 'admin') redirect('/')

  const supabase = await createClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  const [summary, expenses, unpaidCommissions, { data: exchangeRate }] = await Promise.all([
    getAccountingSummary(monthStart, today),
    getExpenses(),
    getUnpaidCommissions(),
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
        unpaidCommissions={unpaidCommissions}
        exchangeRate={exchangeRate?.usd_to_crc ?? 530}
        initialPeriod="mtd"
      />
    </div>
  )
}
