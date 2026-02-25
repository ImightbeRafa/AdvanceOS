'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatUSD, formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/dates'
import { useCurrencyStore } from '@/lib/hooks/use-currency'
import { CurrencyToggle } from '@/components/shared/currency-toggle'
import { StatusChip } from '@/components/shared/status-chip'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { markCommissionPaid } from '@/lib/actions/accounting'
import { toast } from 'sonner'
import { TrendingUp, DollarSign, Receipt, Users, Target, Minus } from 'lucide-react'
import { ExpenseModal } from './expense-modal'
import { AdSpendModal } from './adspend-modal'
import type { Expense, Commission } from '@/types'

interface AccountingDashboardProps {
  summary: {
    revenue: number
    cashCollected: number
    cashNet: number
    bankFees: number
    totalExpenses: number
    totalCommissions: number
    unpaidCommissions: number
    totalSalaries: number
    totalAdSpend: number
    margin: number
    totalSets: number
    totalClients: number
    totalDeals: number
    costPerClient: number
    costPerSet: number
    costPerCall: number
  }
  expenses: Expense[]
  unpaidCommissions: (Commission & { team_member?: { full_name: string }; payment?: { set?: { prospect_name: string } } })[]
  exchangeRate: number
}

export function AccountingDashboard({ summary, expenses, unpaidCommissions, exchangeRate }: AccountingDashboardProps) {
  const router = useRouter()
  const { currency } = useCurrencyStore()
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showAdSpendModal, setShowAdSpendModal] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)

  function fmt(amount: number) {
    return formatCurrency(amount, currency, exchangeRate)
  }

  async function handlePayCommission(id: string) {
    setPayingId(id)
    try {
      await markCommissionPaid(id)
      toast.success('Comisión marcada como pagada')
      router.refresh()
    } catch {
      toast.error('Error al marcar comisión')
    } finally {
      setPayingId(null)
    }
  }

  const metrics = [
    { label: 'Revenue', value: fmt(summary.revenue), icon: DollarSign, color: 'text-primary' },
    { label: 'Cash collected', value: fmt(summary.cashCollected), icon: TrendingUp, color: 'text-success' },
    { label: 'Bank fees', value: fmt(summary.bankFees), icon: Minus, color: 'text-destructive' },
    { label: 'Gastos', value: fmt(summary.totalExpenses), icon: Receipt, color: 'text-warning' },
    { label: 'Salarios', value: fmt(summary.totalSalaries), icon: Users, color: 'text-muted-foreground' },
    { label: 'Comisiones', value: fmt(summary.totalCommissions), icon: Users, color: 'text-muted-foreground' },
    { label: 'Margen', value: fmt(summary.margin), icon: TrendingUp, color: summary.margin >= 0 ? 'text-success' : 'text-destructive' },
    { label: 'Ad spend', value: fmt(summary.totalAdSpend), icon: Target, color: 'text-info' },
  ]

  return (
    <>
      <div className="flex items-center justify-between">
        <CurrencyToggle />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowAdSpendModal(true)}>
            Registrar ad spend
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowExpenseModal(true)}>
            Registrar gasto
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-surface-1 p-4">
            <div className="flex items-center gap-2">
              <m.icon className={`h-4 w-4 ${m.color}`} />
              <span className="text-sm text-muted-foreground">{m.label}</span>
            </div>
            <p className="mt-1 text-xl font-bold">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <h3 className="text-sm font-medium mb-2">CAC — Costos unitarios</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Costo por cliente</span>
              <span className="font-medium">{fmt(summary.costPerClient)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Costo por set</span>
              <span className="font-medium">{fmt(summary.costPerSet)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Costo por llamada</span>
              <span className="font-medium">{fmt(summary.costPerCall)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total sets</span>
              <span>{summary.totalSets}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total llamadas (deals)</span>
              <span>{summary.totalDeals}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total clientes</span>
              <span>{summary.totalClients}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <h3 className="text-sm font-medium mb-2">
            Comisiones pendientes ({unpaidCommissions.length})
          </h3>
          {unpaidCommissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin comisiones pendientes.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
              {unpaidCommissions.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{c.team_member?.full_name ?? '—'}</span>
                  <StatusChip label={c.role} colorClass="bg-muted text-muted-foreground" />
                  <span className="font-medium">{formatUSD(c.amount)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={payingId === c.id}
                    onClick={() => handlePayCommission(c.id)}
                  >
                    Pagar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <h3 className="text-sm font-medium mb-3">Últimos gastos</h3>
        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin gastos registrados. Registrá un gasto para empezar.</p>
        ) : (
          <div className="space-y-2">
            {expenses.slice(0, 10).map((e) => (
              <div key={e.id} className="flex items-center gap-3 text-sm">
                <StatusChip label={e.category} colorClass="bg-muted text-muted-foreground" />
                <span className="flex-1">{e.description}</span>
                <span className="font-medium">{fmt(e.amount_usd)}</span>
                <span className="text-xs text-muted-foreground">{formatDate(e.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ExpenseModal open={showExpenseModal} onOpenChange={setShowExpenseModal} />
      <AdSpendModal open={showAdSpendModal} onOpenChange={setShowAdSpendModal} />
    </>
  )
}
