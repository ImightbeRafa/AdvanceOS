'use client'

import type { Advance90Phase } from '@/types'
import { StatusChip } from '@/components/shared/status-chip'
import { formatShortDate, todayCR } from '@/lib/utils/dates'
import { cn } from '@/lib/utils'

interface Advance90TimelineProps {
  phases: Advance90Phase[]
  startDate: string
}

const PHASE_COLORS: Record<string, string> = {
  pendiente: 'bg-muted',
  en_progreso: 'bg-info',
  completado: 'bg-success',
}

function computePhaseStatus(phase: Advance90Phase): 'pendiente' | 'en_progreso' | 'completado' {
  const today = todayCR()
  if (today < phase.start_date) return 'pendiente'
  if (today > phase.end_date) return 'completado'
  return 'en_progreso'
}

export function Advance90Timeline({ phases, startDate }: Advance90TimelineProps) {
  if (phases.length === 0) return null

  const totalDays = 90
  const weeks = Array.from({ length: 13 }, (_, i) => i)

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="flex text-[10px] text-muted-foreground mb-1">
          {weeks.map((w) => (
            <div key={w} className="flex-1 text-center">S{w + 1}</div>
          ))}
        </div>
        <div className="flex h-px bg-border">
          {weeks.map((w) => (
            <div key={w} className="flex-1 border-r border-border last:border-r-0" />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {phases.map((phase) => {
          const leftPct = (phase.start_day / totalDays) * 100
          const widthPct = ((phase.end_day - phase.start_day) / totalDays) * 100
          const status = computePhaseStatus(phase)

          return (
            <div key={phase.id} className="group">
              <div className="relative h-8 rounded-md bg-surface-2 overflow-hidden">
                <div
                  className={cn(
                    'absolute inset-y-0 rounded-md flex items-center px-2 transition-all',
                    PHASE_COLORS[status] ?? 'bg-muted',
                    status === 'en_progreso' && 'opacity-80',
                    status === 'completado' && 'opacity-70',
                  )}
                  style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 3)}%` }}
                >
                  <span className="text-[11px] font-medium truncate text-foreground">
                    {phase.phase_name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-0.5 pl-1">
                <span className="text-[10px] text-muted-foreground">
                  {formatShortDate(phase.start_date)} — {formatShortDate(phase.end_date)}
                </span>
                <StatusChip
                  label={status === 'completado' ? 'Finalizado' : status === 'en_progreso' ? 'En curso' : 'Pendiente'}
                  colorClass={
                    status === 'completado'
                      ? 'bg-success/15 text-success'
                      : status === 'en_progreso'
                        ? 'bg-info/15 text-info'
                        : 'bg-muted text-muted-foreground'
                  }
                  size="sm"
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-2 border-t border-border">
        <div className="flex items-center gap-1"><div className="w-3 h-2 rounded-sm bg-muted" /><span>Pendiente</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-2 rounded-sm bg-info" /><span>En curso</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-2 rounded-sm bg-success" /><span>Finalizado</span></div>
      </div>
    </div>
  )
}
