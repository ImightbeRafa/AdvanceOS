'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatUSD } from '@/lib/utils/currency'
import { markCommissionPaid, markSalaryPaid, generateSalaryPayments } from '@/lib/actions/accounting'
import { Button } from '@/components/ui/button'
import { StatusChip } from '@/components/shared/status-chip'
import { Check, DollarSign, Users, Loader2, Calendar, Download } from 'lucide-react'
import { toast } from 'sonner'

interface CommissionRow {
  id: string
  amount: number
  role: string
  is_paid: boolean
  created_at: string
  team_member?: { id: string; full_name: string } | null
  payment?: { amount_gross: number; set: { prospect_name: string } | null } | null
}

interface SalaryPaymentRow {
  id: string
  amount: number
  period_label: string
  status: string
  paid_date: string | null
  created_at: string
  team_member?: { id: string; full_name: string } | null
}

interface PlanillaDashboardProps {
  unpaidCommissions: CommissionRow[]
  salaryPayments: SalaryPaymentRow[]
}

export function PlanillaDashboard({ unpaidCommissions, salaryPayments }: PlanillaDashboardProps) {
  const [tab, setTab] = useState<'comisiones' | 'salarios'>('comisiones')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const totalUnpaidCommissions = unpaidCommissions.reduce((s, c) => s + Number(c.amount), 0)
  const pendingSalaries = salaryPayments.filter((s) => s.status === 'pendiente')
  const totalPendingSalaries = pendingSalaries.reduce((s, p) => s + Number(p.amount), 0)

  function handleMarkCommissionPaid(id: string) {
    startTransition(async () => {
      try {
        await markCommissionPaid(id)
        toast.success('Comisión marcada como pagada')
        router.refresh()
      } catch {
        toast.error('Error al actualizar comisión')
      }
    })
  }

  function handleMarkSalaryPaid(id: string) {
    startTransition(async () => {
      try {
        await markSalaryPaid(id)
        toast.success('Salario marcado como pagado')
        router.refresh()
      } catch {
        toast.error('Error al actualizar salario')
      }
    })
  }

  function handleGenerateSalaries() {
    const now = new Date()
    const day = now.getDate()
    const half = day <= 15 ? '1ra' : '2da'
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const label = `${half} quincena ${monthNames[now.getMonth()]} ${now.getFullYear()}`

    startTransition(async () => {
      try {
        await generateSalaryPayments(label)
        toast.success('Pagos de salario generados')
        router.refresh()
      } catch {
        toast.error('Error al generar salarios')
      }
    })
  }

  function getNextPayrollDate() {
    const now = new Date()
    const day = now.getDate()
    const month = now.getMonth()
    const year = now.getFullYear()

    if (day <= 15) {
      return new Date(year, month, 15)
    }
    const lastDay = new Date(year, month + 1, 0).getDate()
    return new Date(year, month, lastDay)
  }

  function exportCSV(type: 'comisiones' | 'salarios') {
    let csv = ''
    if (type === 'comisiones') {
      csv = 'Nombre,Rol,Monto (USD),Cliente,Estado\n'
      unpaidCommissions.forEach((c) => {
        csv += `"${c.team_member?.full_name ?? ''}","${c.role}","${Number(c.amount).toFixed(2)}","${c.payment?.set?.prospect_name ?? ''}","Pendiente"\n`
      })
    } else {
      csv = 'Nombre,Periodo,Monto (USD),Estado\n'
      salaryPayments.forEach((s) => {
        csv += `"${s.team_member?.full_name ?? ''}","${s.period_label}","${Number(s.amount).toFixed(2)}","${s.status}"\n`
      })
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${type}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const nextPayDate = getNextPayrollDate()
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const daysUntilPayroll = Math.ceil((nextPayDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <div className="space-y-6">
      {/* Summary cards + calendar */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-warning">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Comisiones sin pagar</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{formatUSD(totalUnpaidCommissions)}</p>
          <p className="text-xs text-muted-foreground mt-1">{unpaidCommissions.length} comisiones pendientes</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-info">
            <Users className="h-4 w-4" />
            <span className="text-sm">Salarios pendientes</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{formatUSD(totalPendingSalaries)}</p>
          <p className="text-xs text-muted-foreground mt-1">{pendingSalaries.length} pagos pendientes</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-primary">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Próximo pago quincenal</span>
          </div>
          <p className="mt-1 text-lg font-bold">{nextPayDate.getDate()} {monthNames[nextPayDate.getMonth()]}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {daysUntilPayroll <= 0 ? 'Hoy' : `En ${daysUntilPayroll} día${daysUntilPayroll === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-2 border-b border-border pb-2">
        <Button
          variant={tab === 'comisiones' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('comisiones')}
        >
          Comisiones del lunes
        </Button>
        <Button
          variant={tab === 'salarios' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('salarios')}
        >
          Salarios quincenales
        </Button>
      </div>

      {tab === 'comisiones' && (
        <div className="rounded-xl border border-border bg-surface-1">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-medium">Comisiones pendientes de pago</h3>
            {unpaidCommissions.length > 0 && (
              <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => exportCSV('comisiones')}>
                <Download className="h-3 w-3" />
                Exportar CSV
              </Button>
            )}
          </div>
          {unpaidCommissions.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No hay comisiones pendientes.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {unpaidCommissions.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-4 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{c.team_member?.full_name ?? 'Desconocido'}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.role === 'setter' ? 'Setter' : 'Closer'} — {c.payment?.set?.prospect_name ?? 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatUSD(Number(c.amount))}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={isPending}
                      onClick={() => handleMarkCommissionPaid(c.id)}
                    >
                      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Pagar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'salarios' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            {salaryPayments.length > 0 && (
              <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => exportCSV('salarios')}>
                <Download className="h-3 w-3" />
                Exportar CSV
              </Button>
            )}
            <Button size="sm" onClick={handleGenerateSalaries} disabled={isPending} className="gap-1">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
              Generar pagos de quincena
            </Button>
          </div>
          <div className="rounded-xl border border-border bg-surface-1">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-medium">Historial de pagos salariales</h3>
            </div>
            {salaryPayments.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No hay pagos salariales registrados.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {salaryPayments.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-4 text-sm">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{s.team_member?.full_name ?? 'Desconocido'}</span>
                      <span className="text-xs text-muted-foreground">{s.period_label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{formatUSD(Number(s.amount))}</span>
                      <StatusChip
                        label={s.status === 'pagado' ? 'Pagado' : 'Pendiente'}
                        colorClass={s.status === 'pagado' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}
                      />
                      {s.status === 'pendiente' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          disabled={isPending}
                          onClick={() => handleMarkSalaryPaid(s.id)}
                        >
                          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Pagar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
