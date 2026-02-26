'use client'

import type { Profile, Set } from '@/types'
import { StatusChip } from '@/components/shared/status-chip'
import { SET_STATUS_LABELS, SET_STATUS_COLORS } from '@/lib/constants'
import { formatDateTime, isDateToday } from '@/lib/utils/dates'
import { formatUSD } from '@/lib/utils/currency'
import { Phone, Clock, AlertTriangle, DollarSign, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface CloserDashboardProps {
  profile: Profile
  sets: Set[]
  commissionsTotal: number
}

export function CloserDashboard({ profile, sets, commissionsTotal }: CloserDashboardProps) {
  const mySets = sets.filter((s) => s.closer_id === profile.id)
  const pendingCalls = mySets.filter((s) => ['agendado', 'precall_enviado'].includes(s.status) && isDateToday(s.scheduled_at))

  const followUps = mySets.filter((s) => {
    if (s.status !== 'seguimiento') return false
    const deal = Array.isArray(s.deal) ? s.deal[0] : s.deal
    return deal?.follow_up_date && isDateToday(deal.follow_up_date)
  })

  const pendingPayments = mySets.filter((s) => s.status === 'closed_pendiente')

  const now = new Date()
  const myDealsThisMonth = mySets.filter((s) => {
    const deal = Array.isArray(s.deal) ? s.deal[0] : s.deal
    if (!deal) return false
    const d = new Date(deal.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const closedThisMonth = myDealsThisMonth.filter((s) => {
    const deal = Array.isArray(s.deal) ? s.deal[0] : s.deal
    return deal?.outcome === 'closed'
  })
  const closeRate = myDealsThisMonth.length > 0
    ? (closedThisMonth.length / myDealsThisMonth.length * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hola, {profile.full_name.split(' ')[0]}</h1>
        <p className="text-muted-foreground">Tus llamadas, follow ups y pagos.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
          <div className="flex items-center gap-2 text-muted-foreground"><Percent className="h-4 w-4" /><span className="text-sm">Close rate (mes)</span></div>
          <p className="mt-1 text-2xl font-bold">{closeRate.toFixed(0)}%</p>
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
                <Link key={s.id} href="/ventas" className="block rounded-xl border border-border bg-surface-1 p-3 hover:bg-surface-2 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{s.prospect_name}</span>
                    <StatusChip label={SET_STATUS_LABELS[s.status]} colorClass={SET_STATUS_COLORS[s.status]} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{formatDateTime(s.scheduled_at)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Follow-ups de hoy</h2>
            <Link href="/ventas"><Button size="sm" variant="outline">Ver ventas</Button></Link>
          </div>
          {followUps.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface-1 p-4 text-center text-sm text-muted-foreground">Sin follow ups para hoy.</div>
          ) : (
            <div className="space-y-2">
              {followUps.map((s) => {
                const deal = Array.isArray(s.deal) ? s.deal[0] : s.deal
                return (
                  <Link key={s.id} href="/ventas" className="block rounded-xl border border-border bg-surface-1 p-3 hover:bg-surface-2 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{s.prospect_name}</span>
                      <StatusChip label={SET_STATUS_LABELS[s.status]} colorClass={SET_STATUS_COLORS[s.status]} />
                    </div>
                    {deal?.follow_up_notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{deal.follow_up_notes}</p>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
