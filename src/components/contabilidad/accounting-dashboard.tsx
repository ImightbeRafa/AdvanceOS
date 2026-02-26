'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatUSD, formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/dates'
import { useCurrencyStore } from '@/lib/hooks/use-currency'
import { CurrencyToggle } from '@/components/shared/currency-toggle'
import { StatusChip } from '@/components/shared/status-chip'
import { Button } from '@/components/ui/button'
import { markCommissionPaid, getAccountingSummary } from '@/lib/actions/accounting'
import { toast } from 'sonner'
import { TrendingUp, DollarSign, Receipt, Users, Target, Minus, Percent } from 'lucide-react'
import { ExpenseModal } from './expense-modal'
import { AdSpendModal } from './adspend-modal'
import type { Expense, Commission } from '@/types'

type PeriodKey = 'hoy' | '7d' | '30d' | 'mtd'

interface AccountingSummary {
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
  closedDealsCount: number
  costPerClient: number
  costPerSet: number
  costPerCall: number
  costPerClosed: number
}

interface AccountingDashboardProps {
  summary: AccountingSummary
  expenses: Expense[]
  unpaidCommissions: (Commission & { team_member?: { full_name: string }; payment?: { set?: { prospect_name: string } } })[]
  exchangeRate: number
  initialPeriod: PeriodKey
}

function getPeriodDates(period: PeriodKey): { start: string; end: string } {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  switch (period) {
    case 'hoy':
      return { start: today, end: today }
    case '7d': {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      return { start: d.toISOString().split('T')[0], end: today }
    }
    case '30d': {
      const d = new Date(now)
      d.setDate(d.getDate() - 30)
      return { start: d.toISOString().split('T')[0], end: today }
    }
    case 'mtd':
    default:
      return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], end: today }
  }
}

const PERIOD_LABELS: Record<PeriodKey, string> = {
  hoy: 'Hoy',
  '7d': '7 días',
  '30d': '30 días',
  mtd: 'MTD',
}

export function AccountingDashboard({ summary: initialSummary, expenses, unpaidCommissions, exchangeRate, initialPeriod }: AccountingDashboardProps) {
  const router = useRouter()
  const { currency } = useCurrencyStore()
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showAdSpendModal, setShowAdSpendModal] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [period, setPeriod] = useState<PeriodKey>(initialPeriod)
  const [summary, setSummary] = useState<AccountingSummary>(initialSummary)
  const [isPending, startTransition] = useTransition()

  function fmt(amount: number) {
    return formatCurrency(amount, currency, exchangeRate)
  }

  function handlePeriodChange(newPeriod: PeriodKey) {
    setPeriod(newPeriod)
    startTransition(async () => {
      const { start, end } = getPeriodDates(newPeriod)
      const newSummary = await getAccountingSummary(start, end)
      setSummary(newSummary)
    })
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

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((key) => (
            <Button
              key={key}
              size="sm"
              variant={period === key ? 'default' : 'outline'}
              onClick={() => handlePeriodChange(key)}
              disabled={isPending}
              className="text-xs"
            >
              {PERIOD_LABELS[key]}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <CurrencyToggle />
          <Button size="sm" variant="outline" onClick={() => setShowAdSpendModal(true)}>Registrar ad spend</Button>
          <Button size="sm" variant="outline" onClick={() => setShowExpenseModal(true)}>Registrar gasto</Button>
        </div>
      </div>

      {isPending && (
        <div className="text-center text-sm text-muted-foreground py-2">Cargando...</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-success" />
            <span className="text-sm text-muted-foreground">Cash collected (neto)</span>
          </div>
          <p className="mt-1 text-xl font-bold text-success">{fmt(summary.cashNet)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bruto: {fmt(summary.cashCollected)} — Rebajos: {fmt(summary.bankFees)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /><span className="text-sm text-muted-foreground">Revenue</span></div>
          <p className="mt-1 text-xl font-bold">{fmt(summary.revenue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2"><TrendingUp className={`h-4 w-4 ${summary.margin >= 0 ? 'text-success' : 'text-destructive'}`} /><span className="text-sm text-muted-foreground">Margen</span></div>
          <p className={`mt-1 text-xl font-bold ${summary.margin >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(summary.margin)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2"><Target className="h-4 w-4 text-info" /><span className="text-sm text-muted-foreground">Ad spend</span></div>
          <p className="mt-1 text-xl font-bold">{fmt(summary.totalAdSpend)}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2"><Minus className="h-4 w-4 text-destructive" /><span className="text-sm text-muted-foreground">Rebajos (Tilopay cuotas)</span></div>
          <p className="mt-1 text-xl font-bold">{fmt(summary.bankFees)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2"><Receipt className="h-4 w-4 text-warning" /><span className="text-sm text-muted-foreground">Gastos</span></div>
          <p className="mt-1 text-xl font-bold">{fmt(summary.totalExpenses)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Salarios</span></div>
          <p className="mt-1 text-xl font-bold">{fmt(summary.totalSalaries)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Comisiones</span></div>
          <p className="mt-1 text-xl font-bold">{fmt(summary.totalCommissions)}</p>
          {summary.unpaidCommissions > 0 && (
            <p className="text-xs text-warning mt-0.5">Sin pagar: {fmt(summary.unpaidCommissions)}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <h3 className="text-sm font-medium mb-2">CAC — Costos unitarios</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Costo por closed</span>
              <span className="font-medium">{fmt(summary.costPerClosed)}</span>
            </div>
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
            <div className="border-t border-border pt-2 mt-2 space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Deals cerrados</span><span>{summary.closedDealsCount}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total sets</span><span>{summary.totalSets}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total llamadas (deals)</span><span>{summary.totalDeals}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total clientes</span><span>{summary.totalClients}</span>
              </div>
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
          <p className="text-sm text-muted-foreground">Sin gastos registrados.</p>
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
