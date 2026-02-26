'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatUSD, formatCurrency } from '@/lib/utils/currency'
import { formatDate, nowCR, todayCR, monthStartCR, CR_TZ } from '@/lib/utils/dates'
import { TZDate } from '@date-fns/tz'
import { format as fmtDate } from 'date-fns'
import { useCurrencyStore } from '@/lib/hooks/use-currency'
import { CurrencyToggle } from '@/components/shared/currency-toggle'
import { StatusChip } from '@/components/shared/status-chip'
import { Button } from '@/components/ui/button'
import { markCommissionPaid, getAccountingSummary, deleteManualTransaction } from '@/lib/actions/accounting'
import { toast } from 'sonner'
import { TrendingUp, DollarSign, Receipt, Users, Target, Minus, ArrowUpDown, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import dynamic from 'next/dynamic'

const ExpenseModal = dynamic<{ open: boolean; onOpenChange: (open: boolean) => void }>(
  () => import('./expense-modal').then(m => ({ default: m.ExpenseModal }))
)
const AdSpendModal = dynamic<{ open: boolean; onOpenChange: (open: boolean) => void }>(
  () => import('./adspend-modal').then(m => ({ default: m.AdSpendModal }))
)
const ManualTransactionModal = dynamic<{ open: boolean; onOpenChange: (open: boolean) => void }>(
  () => import('./manual-transaction-modal').then(m => ({ default: m.ManualTransactionModal }))
)
import type { Expense, Commission, ManualTransaction } from '@/types'

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
  manualIncome: number
  manualDeductions: number
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
  manualTransactions: ManualTransaction[]
  unpaidCommissions: (Commission & { team_member?: { full_name: string }; payment?: { set?: { prospect_name: string } } })[]
  exchangeRate: number
  initialPeriod: PeriodKey
}

function getPeriodDates(period: PeriodKey): { start: string; end: string } {
  const now = nowCR()
  const today = todayCR()
  switch (period) {
    case 'hoy':
      return { start: today, end: today }
    case '7d': {
      const d = new TZDate(now, CR_TZ)
      d.setDate(d.getDate() - 7)
      return { start: fmtDate(d, 'yyyy-MM-dd'), end: today }
    }
    case '30d': {
      const d = new TZDate(now, CR_TZ)
      d.setDate(d.getDate() - 30)
      return { start: fmtDate(d, 'yyyy-MM-dd'), end: today }
    }
    case 'mtd':
    default:
      return { start: monthStartCR(), end: today }
  }
}

const PERIOD_LABELS: Record<PeriodKey, string> = {
  hoy: 'Hoy',
  '7d': '7 días',
  '30d': '30 días',
  mtd: 'MTD',
}

export function AccountingDashboard({ summary: initialSummary, expenses, manualTransactions, unpaidCommissions, exchangeRate, initialPeriod }: AccountingDashboardProps) {
  const router = useRouter()
  const { currency } = useCurrencyStore()
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showAdSpendModal, setShowAdSpendModal] = useState(false)
  const [showManualTxModal, setShowManualTxModal] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payingAllMember, setPayingAllMember] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedMembers, setExpandedMembers] = useState<Record<string, boolean>>({})
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

  async function handlePayAllForMember(memberCommissions: typeof unpaidCommissions) {
    const memberId = memberCommissions[0]?.team_member?.full_name ?? ''
    setPayingAllMember(memberId)
    try {
      for (const c of memberCommissions) {
        await markCommissionPaid(c.id)
      }
      toast.success(`Todas las comisiones de ${memberId} marcadas como pagadas`)
      router.refresh()
    } catch {
      toast.error('Error al pagar comisiones')
    } finally {
      setPayingAllMember(null)
    }
  }

  function toggleMember(memberId: string) {
    setExpandedMembers((prev) => ({ ...prev, [memberId]: !prev[memberId] }))
  }

  const groupedCommissions = unpaidCommissions.reduce<
    { memberId: string; memberName: string; total: number; commissions: typeof unpaidCommissions }[]
  >((groups, c) => {
    const memberId = c.team_member_id ?? 'unknown'
    let group = groups.find((g) => g.memberId === memberId)
    if (!group) {
      group = { memberId, memberName: c.team_member?.full_name ?? 'Desconocido', total: 0, commissions: [] }
      groups.push(group)
    }
    group.total += Number(c.amount)
    group.commissions.push(c)
    return groups
  }, [])

  async function handleDeleteTransaction(id: string) {
    setDeletingId(id)
    try {
      await deleteManualTransaction(id)
      toast.success('Movimiento eliminado')
      router.refresh()
    } catch {
      toast.error('Error al eliminar movimiento')
    } finally {
      setDeletingId(null)
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
        <div className="flex items-center gap-2 flex-wrap">
          <CurrencyToggle />
          <Button size="sm" onClick={() => setShowManualTxModal(true)}>
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
            Registrar movimiento
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowAdSpendModal(true)}>Registrar ad spend</Button>
          <Button size="sm" variant="outline" onClick={() => setShowExpenseModal(true)}>Registrar gasto</Button>
        </div>
      </div>

      {isPending && (
        <div className="text-center text-sm text-muted-foreground py-2">Cargando...</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-success" />
            <span className="text-sm text-muted-foreground">Cash collected</span>
          </div>
          <p className="mt-1 text-xl font-bold text-success">{fmt(summary.cashNet)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bruto: {fmt(summary.cashCollected)} — Rebajos Tilopay: {fmt(summary.bankFees)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /><span className="text-sm text-muted-foreground">Revenue (valor deals)</span></div>
          <p className="mt-1 text-xl font-bold">{fmt(summary.revenue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2"><TrendingUp className={`h-4 w-4 ${summary.margin >= 0 ? 'text-success' : 'text-destructive'}`} /><span className="text-sm text-muted-foreground">Margen</span></div>
          <p className={`mt-1 text-xl font-bold ${summary.margin >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(summary.margin)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <h3 className="text-sm font-medium mb-3">Desglose del margen</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-success">Cash collected (neto)</span>
            <span className="font-medium text-success">+ {fmt(summary.cashNet)}</span>
          </div>
          {summary.manualIncome > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-success">Ingresos manuales</span>
              <span className="font-medium text-success">+ {fmt(summary.manualIncome)}</span>
            </div>
          )}
          <div className="border-t border-border pt-2 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Comisiones</span>
              <span className="font-medium text-destructive">- {fmt(summary.totalCommissions)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ad spend</span>
              <span className="font-medium text-destructive">- {fmt(summary.totalAdSpend)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gastos</span>
              <span className="font-medium text-destructive">- {fmt(summary.totalExpenses)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Salarios</span>
              <span className="font-medium text-destructive">- {fmt(summary.totalSalaries)}</span>
            </div>
            {summary.manualDeductions > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Egresos manuales</span>
                <span className="font-medium text-destructive">- {fmt(summary.manualDeductions)}</span>
              </div>
            )}
          </div>
          <div className="border-t border-border pt-2">
            <div className="flex justify-between text-sm font-semibold">
              <span>= Margen</span>
              <span className={summary.margin >= 0 ? 'text-success' : 'text-destructive'}>{fmt(summary.margin)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Comisiones</span></div>
          <p className="mt-1 text-xl font-bold">{fmt(summary.totalCommissions)}</p>
          {summary.unpaidCommissions > 0 && (
            <p className="text-xs text-warning mt-0.5">Sin pagar: {fmt(summary.unpaidCommissions)}</p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2"><Target className="h-4 w-4 text-info" /><span className="text-sm text-muted-foreground">Ad spend</span></div>
          <p className="mt-1 text-xl font-bold">{fmt(summary.totalAdSpend)}</p>
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
          <div className="flex items-center gap-2"><Minus className="h-4 w-4 text-destructive" /><span className="text-sm text-muted-foreground">Rebajos Tilopay</span></div>
          <p className="mt-1 text-xl font-bold">{fmt(summary.bankFees)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ya descontado del cash neto</p>
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
          {groupedCommissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin comisiones pendientes.</p>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-thin">
              {groupedCommissions.map((group) => (
                <div key={group.memberId}>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-sm w-full rounded-lg p-2 hover:bg-surface-2 transition-colors"
                    onClick={() => toggleMember(group.memberId)}
                  >
                    {expandedMembers[group.memberId] ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="flex-1 text-left font-medium">{group.memberName}</span>
                    <span className="text-xs text-muted-foreground">{group.commissions.length} comisión{group.commissions.length !== 1 ? 'es' : ''}</span>
                    <span className="font-semibold">{fmt(group.total)}</span>
                  </button>
                  {expandedMembers[group.memberId] && (
                    <div className="ml-6 border-l border-border pl-3 space-y-1.5 pb-2">
                      {group.commissions.map((c) => (
                        <div key={c.id} className="flex items-center gap-2 text-sm py-1">
                          <StatusChip label={c.role === 'setter' ? 'Setter' : 'Closer'} colorClass="bg-muted text-muted-foreground" />
                          <span className="flex-1 text-muted-foreground text-xs">{c.payment?.set?.prospect_name ?? 'N/A'}</span>
                          <span className="font-medium">{formatUSD(c.amount)}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs px-2"
                            disabled={payingId === c.id}
                            onClick={() => handlePayCommission(c.id)}
                          >
                            Pagar
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs mt-1"
                        disabled={payingAllMember === group.memberName}
                        onClick={() => handlePayAllForMember(group.commissions)}
                      >
                        Pagar todas ({fmt(group.total)})
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <h3 className="text-sm font-medium mb-3">Movimientos manuales</h3>
        {manualTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin movimientos manuales registrados.</p>
        ) : (
          <div className="space-y-2">
            {manualTransactions.slice(0, 10).map((t) => (
              <div key={t.id} className="flex items-center gap-3 text-sm">
                <StatusChip
                  label={t.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                  colorClass={t.type === 'ingreso' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}
                />
                <span className="flex-1">{t.description}</span>
                <span className={`font-medium ${t.type === 'ingreso' ? 'text-success' : 'text-destructive'}`}>
                  {t.type === 'ingreso' ? '+' : '-'}{fmt(t.amount_usd)}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(t.date)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  disabled={deletingId === t.id}
                  onClick={() => handleDeleteTransaction(t.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
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

      <ManualTransactionModal open={showManualTxModal} onOpenChange={setShowManualTxModal} />
      <ExpenseModal open={showExpenseModal} onOpenChange={setShowExpenseModal} />
      <AdSpendModal open={showAdSpendModal} onOpenChange={setShowAdSpendModal} />
    </>
  )
}
