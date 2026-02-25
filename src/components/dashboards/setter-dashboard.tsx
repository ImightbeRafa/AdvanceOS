'use client'

import type { Profile, Set } from '@/types'
import { StatusChip } from '@/components/shared/status-chip'
import { SET_STATUS_LABELS, SET_STATUS_COLORS } from '@/lib/constants'
import { formatDateTime, isDateToday } from '@/lib/utils/dates'
import { formatUSD } from '@/lib/utils/currency'
import { Target, Phone, Trophy, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface SetterDashboardProps {
  profile: Profile
  sets: Set[]
  commissionsTotal: number
}

export function SetterDashboard({ profile, sets, commissionsTotal }: SetterDashboardProps) {
  const mySets = sets.filter((s) => s.setter_id === profile.id)
  const todaySets = mySets.filter((s) => isDateToday(s.scheduled_at) && ['agendado', 'precall_enviado'].includes(s.status))
  const pendingSets = mySets.filter((s) => !['closed', 'descalificado'].includes(s.status))
  const closedSets = mySets.filter((s) => ['closed', 'closed_pendiente'].includes(s.status))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hola, {profile.full_name.split(' ')[0]}</h1>
        <p className="text-muted-foreground">Tu resumen de sets y rendimiento.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /><span className="text-sm">Sets hoy</span></div>
          <p className="mt-1 text-2xl font-bold">{todaySets.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><Target className="h-4 w-4" /><span className="text-sm">Pendientes</span></div>
          <p className="mt-1 text-2xl font-bold">{pendingSets.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><Trophy className="h-4 w-4" /><span className="text-sm">Cerrados</span></div>
          <p className="mt-1 text-2xl font-bold">{closedSets.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><DollarSign className="h-4 w-4" /><span className="text-sm">Comisiones pendientes</span></div>
          <p className="mt-1 text-2xl font-bold">{formatUSD(commissionsTotal)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sets de hoy</h2>
        <Link href="/ventas">
          <Button size="sm" variant="outline">Ver todos</Button>
        </Link>
      </div>

      {todaySets.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-1 p-6 text-center">
          <p className="text-sm text-muted-foreground">No tenés sets agendados para hoy.</p>
          <Link href="/ventas">
            <Button size="sm" className="mt-3">Crear set</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {todaySets.map((s) => (
            <Link key={s.id} href="/ventas" className="block rounded-xl border border-border bg-surface-1 p-4 hover:bg-surface-2 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{s.prospect_name}</span>
                  <p className="text-sm text-muted-foreground">{formatDateTime(s.scheduled_at)}</p>
                </div>
                <StatusChip label={SET_STATUS_LABELS[s.status]} colorClass={SET_STATUS_COLORS[s.status]} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
