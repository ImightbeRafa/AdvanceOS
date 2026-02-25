'use client'

import type { Profile, Set, Task } from '@/types'
import { StatusChip } from '@/components/shared/status-chip'
import { SET_STATUS_LABELS, SET_STATUS_COLORS } from '@/lib/constants'
import { isDatePast } from '@/lib/utils/dates'
import { formatUSD } from '@/lib/utils/currency'
import {
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  Wallet,
  Receipt,
  Target,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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
  costPerClient: number
  costPerSet: number
}

interface AdminDashboardProps {
  profile: Profile
  sets: Set[]
  tasks: (Task & { client?: { business_name: string } })[]
  accounting: AccountingSummary
}

export function AdminDashboard({ profile, sets, tasks, accounting }: AdminDashboardProps) {
  const now = new Date()
  const thisMonth = sets.filter((s) => {
    const d = new Date(s.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const closedThisMonth = thisMonth.filter((s) => ['closed', 'closed_pendiente'].includes(s.status))
  const pendingPayments = sets.filter((s) => s.status === 'closed_pendiente')
  const overdueTasks = tasks.filter((t) => t.due_date && isDatePast(t.due_date) && t.status !== 'listo')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel de control</h1>
        <p className="text-muted-foreground">Resumen general del negocio.</p>
      </div>

      {/* Row 1: Pipeline metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Users} label="Sets este mes" value={String(thisMonth.length)} />
        <MetricCard icon={TrendingUp} label="Cierres este mes" value={String(closedThisMonth.length)} variant="success" />
        <MetricCard icon={AlertTriangle} label="Pagos pendientes" value={String(pendingPayments.length)} variant="warning" />
        <MetricCard icon={AlertTriangle} label="Tareas vencidas" value={String(overdueTasks.length)} variant="destructive" />
      </div>

      {/* Row 2: Financial metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={DollarSign} label="Cash cobrado (mes)" value={formatUSD(accounting.cashCollected)} variant="success" />
        <MetricCard icon={BarChart3} label="Margen" value={formatUSD(accounting.margin)} variant={accounting.margin >= 0 ? 'success' : 'destructive'} />
        <MetricCard icon={Wallet} label="Comisiones sin pagar" value={formatUSD(accounting.unpaidCommissions)} variant="warning" />
        <MetricCard icon={Receipt} label="Salarios totales" value={formatUSD(accounting.totalSalaries)} />
      </div>

      {/* Row 3: CAC metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Target} label="Costo por set" value={formatUSD(accounting.costPerSet)} />
        <MetricCard icon={Target} label="Costo por cliente" value={formatUSD(accounting.costPerClient)} />
        <MetricCard icon={DollarSign} label="Ad spend total" value={formatUSD(accounting.totalAdSpend)} />
        <MetricCard icon={DollarSign} label="Revenue total" value={formatUSD(accounting.revenue)} variant="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pending payments table */}
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Sets con pagos pendientes</h3>
            <Link href="/ventas"><Button size="sm" variant="outline">Ver ventas</Button></Link>
          </div>
          {pendingPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todo al día.</p>
          ) : (
            <div className="space-y-2">
              {pendingPayments.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span>{s.prospect_name}</span>
                  <StatusChip label={SET_STATUS_LABELS[s.status]} colorClass={SET_STATUS_COLORS[s.status]} />
                </div>
              ))}
              {pendingPayments.length > 5 && (
                <p className="text-xs text-muted-foreground">+{pendingPayments.length - 5} más</p>
              )}
            </div>
          )}
        </div>

        {/* Quick access */}
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Accesos rápidos</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/contabilidad"><Button variant="outline" className="w-full justify-start gap-2"><DollarSign className="h-4 w-4" /> Contabilidad</Button></Link>
            <Link href="/equipo"><Button variant="outline" className="w-full justify-start gap-2"><Users className="h-4 w-4" /> Equipo</Button></Link>
            <Link href="/ventas"><Button variant="outline" className="w-full justify-start gap-2"><TrendingUp className="h-4 w-4" /> Ventas</Button></Link>
            <Link href="/clientes"><Button variant="outline" className="w-full justify-start gap-2"><Users className="h-4 w-4" /> Clientes</Button></Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  variant = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  variant?: 'default' | 'success' | 'warning' | 'destructive'
}) {
  const variantClass = {
    default: 'text-muted-foreground',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  }[variant]

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <div className={`flex items-center gap-2 ${variantClass}`}>
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}
