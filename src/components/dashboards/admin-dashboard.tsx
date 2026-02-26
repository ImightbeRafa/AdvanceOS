'use client'

import type { Profile, Set, Deal } from '@/types'
import { formatUSD } from '@/lib/utils/currency'
import { isDateToday } from '@/lib/utils/dates'
import {
  Phone,
  Clock,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  BarChart3,
  Percent,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { StatusChip } from '@/components/shared/status-chip'
import { SET_STATUS_LABELS, SET_STATUS_COLORS } from '@/lib/constants'
import { formatDateTime } from '@/lib/utils/dates'

interface AccountingSummary {
  revenue: number
  cashNet: number
  margin: number
  totalDeals: number
  closedDealsCount: number
}

interface AdminDashboardProps {
  profile: Profile
  sets: Set[]
  accounting: AccountingSummary
  paymentsBySet: Record<string, number>
}

export function AdminDashboard({ profile, sets, accounting, paymentsBySet }: AdminDashboardProps) {
  const pendingCalls = sets.filter(
    (s) => ['agendado', 'precall_enviado'].includes(s.status) && isDateToday(s.scheduled_at)
  )

  const followUpsToday = sets.filter((s) => {
    if (s.status !== 'seguimiento') return false
    const deal = Array.isArray(s.deal) ? s.deal[0] : s.deal
    return deal?.follow_up_date && isDateToday(deal.follow_up_date)
  })

  const pendingPaymentSets = sets.filter((s) => s.status === 'closed_pendiente')
  const totalSaldoPendiente = pendingPaymentSets.reduce((sum, s) => {
    const deal = Array.isArray(s.deal) ? s.deal[0] : s.deal
    if (!deal?.revenue_total) return sum
    const paid = paymentsBySet[s.id] ?? 0
    return sum + Math.max(0, Number(deal.revenue_total) - paid)
  }, 0)

  const closeRate = accounting.totalDeals > 0
    ? (accounting.closedDealsCount / accounting.totalDeals * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel de control</h1>
        <p className="text-muted-foreground">Lo importante hoy y cómo va el mes.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/ventas" className="group">
          <MetricCard icon={Phone} label="Llamadas pendientes hoy" value={String(pendingCalls.length)} />
        </Link>
        <Link href="/ventas" className="group">
          <MetricCard icon={Clock} label="Follow-ups para hoy" value={String(followUpsToday.length)} />
        </Link>
        <Link href="/ventas" className="group">
          <MetricCard icon={AlertTriangle} label="Pagos pendientes" value={`${pendingPaymentSets.length} · ${formatUSD(totalSaldoPendiente)}`} variant="warning" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/contabilidad" className="group">
          <MetricCard icon={DollarSign} label="Cash collected (MTD)" value={formatUSD(accounting.cashNet)} variant="success" />
        </Link>
        <Link href="/contabilidad" className="group">
          <MetricCard icon={TrendingUp} label="Revenue (MTD)" value={formatUSD(accounting.revenue)} variant="success" />
        </Link>
        <Link href="/ventas" className="group">
          <MetricCard icon={Percent} label="Close rate (MTD)" value={`${closeRate.toFixed(0)}%`} />
        </Link>
        <Link href="/contabilidad" className="group">
          <MetricCard icon={BarChart3} label="Margen (MTD)" value={formatUSD(accounting.margin)} variant={accounting.margin >= 0 ? 'success' : 'destructive'} />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Llamadas de hoy</h3>
            <Link href="/ventas"><Button size="sm" variant="outline">Ver ventas</Button></Link>
          </div>
          {pendingCalls.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin llamadas para hoy.</p>
          ) : (
            <div className="space-y-2">
              {pendingCalls.slice(0, 5).map((s) => (
                <Link key={s.id} href="/ventas" className="flex items-center justify-between text-sm hover:bg-surface-2 rounded-lg p-2 -mx-2 transition-colors">
                  <div>
                    <span className="font-medium">{s.prospect_name}</span>
                    <p className="text-xs text-muted-foreground">{formatDateTime(s.scheduled_at)}</p>
                  </div>
                  <StatusChip label={SET_STATUS_LABELS[s.status]} colorClass={SET_STATUS_COLORS[s.status]} />
                </Link>
              ))}
              {pendingCalls.length > 5 && (
                <p className="text-xs text-muted-foreground">+{pendingCalls.length - 5} más</p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Sets con pagos pendientes</h3>
            <Link href="/ventas"><Button size="sm" variant="outline">Ver ventas</Button></Link>
          </div>
          {pendingPaymentSets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todo al día.</p>
          ) : (
            <div className="space-y-2">
              {pendingPaymentSets.slice(0, 5).map((s) => {
                const deal = Array.isArray(s.deal) ? s.deal[0] : s.deal
                const paid = paymentsBySet[s.id] ?? 0
                const remaining = deal?.revenue_total ? Math.max(0, Number(deal.revenue_total) - paid) : 0
                return (
                  <Link key={s.id} href="/ventas" className="flex items-center justify-between text-sm hover:bg-surface-2 rounded-lg p-2 -mx-2 transition-colors">
                    <span className="font-medium">{s.prospect_name}</span>
                    <span className="text-warning font-medium">{formatUSD(remaining)}</span>
                  </Link>
                )
              })}
              {pendingPaymentSets.length > 5 && (
                <p className="text-xs text-muted-foreground">+{pendingPaymentSets.length - 5} más</p>
              )}
            </div>
          )}
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
    <div className="rounded-xl border border-border bg-surface-1 p-4 group-hover:bg-surface-2 transition-colors">
      <div className={`flex items-center gap-2 ${variantClass}`}>
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}
