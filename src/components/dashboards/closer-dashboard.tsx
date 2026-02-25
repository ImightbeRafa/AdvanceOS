'use client'

import type { Profile, Set, Task } from '@/types'
import { StatusChip } from '@/components/shared/status-chip'
import { SET_STATUS_LABELS, SET_STATUS_COLORS, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/lib/constants'
import { formatDateTime, isDateToday, isDatePast } from '@/lib/utils/dates'
import { formatUSD } from '@/lib/utils/currency'
import { Phone, Clock, Trophy, DollarSign, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface CloserDashboardProps {
  profile: Profile
  sets: Set[]
  tasks: (Task & { client?: { business_name: string } })[]
  commissionsTotal: number
}

export function CloserDashboard({ profile, sets, tasks, commissionsTotal }: CloserDashboardProps) {
  const mySets = sets.filter((s) => s.closer_id === profile.id)
  const pendingCalls = mySets.filter((s) => ['agendado', 'precall_enviado'].includes(s.status) && isDateToday(s.scheduled_at))

  const followUps = mySets.filter((s) => {
    if (s.status !== 'seguimiento') return false
    const deal = Array.isArray(s.deal) ? s.deal[0] : s.deal
    return deal?.follow_up_date && isDateToday(deal.follow_up_date)
  })

  const pendingPayments = mySets.filter((s) => s.status === 'closed_pendiente')
  const overdueTasks = tasks.filter((t) => t.due_date && isDatePast(t.due_date) && t.status !== 'listo')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hola, {profile.full_name.split(' ')[0]}</h1>
        <p className="text-muted-foreground">Tus llamadas, follow ups y delivery.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /><span className="text-sm">Llamadas hoy</span></div>
          <p className="mt-1 text-2xl font-bold">{pendingCalls.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /><span className="text-sm">Follow ups hoy</span></div>
          <p className="mt-1 text-2xl font-bold">{followUps.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-warning"><AlertTriangle className="h-4 w-4" /><span className="text-sm">Pagos pendientes</span></div>
          <p className="mt-1 text-2xl font-bold">{pendingPayments.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><DollarSign className="h-4 w-4" /><span className="text-sm">Comisiones</span></div>
          <p className="mt-1 text-2xl font-bold">{formatUSD(commissionsTotal)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Llamadas de hoy</h2>
            <Link href="/ventas"><Button size="sm" variant="outline">Ver ventas</Button></Link>
          </div>
          {pendingCalls.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface-1 p-4 text-center text-sm text-muted-foreground">Sin llamadas para hoy.</div>
          ) : (
            <div className="space-y-2">
              {pendingCalls.map((s) => (
                <div key={s.id} className="rounded-xl border border-border bg-surface-1 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{s.prospect_name}</span>
                    <StatusChip label={SET_STATUS_LABELS[s.status]} colorClass={SET_STATUS_COLORS[s.status]} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{formatDateTime(s.scheduled_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Tareas vencidas</h2>
            <Link href="/clientes"><Button size="sm" variant="outline">Ver clientes</Button></Link>
          </div>
          {overdueTasks.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface-1 p-4 text-center text-sm text-muted-foreground">Sin tareas vencidas.</div>
          ) : (
            <div className="space-y-2">
              {overdueTasks.slice(0, 5).map((t) => (
                <div key={t.id} className="rounded-xl border border-border bg-surface-1 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t.title}</span>
                    <StatusChip label={TASK_STATUS_LABELS[t.status]} colorClass={TASK_STATUS_COLORS[t.status]} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t.client?.business_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
