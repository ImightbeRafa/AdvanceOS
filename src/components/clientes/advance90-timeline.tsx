'use client'

import type { Advance90Phase, Task } from '@/types'
import { StatusChip } from '@/components/shared/status-chip'
import { formatShortDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils'

interface Advance90TimelineProps {
  phases: (Advance90Phase & { tasks?: Task[] })[]
  startDate: string
}

const PHASE_COLORS: Record<string, string> = {
  pendiente: 'bg-muted',
  en_progreso: 'bg-info',
  completado: 'bg-success',
}

export function Advance90Timeline({ phases, startDate }: Advance90TimelineProps) {
  if (phases.length === 0) return null

  const totalDays = 90
  const weeks = Array.from({ length: 13 }, (_, i) => i)

  return (
    <div className="space-y-4">
      {/* Week ruler */}
      <div className="relative">
        <div className="flex text-[10px] text-muted-foreground mb-1">
          {weeks.map((w) => (
            <div key={w} className="flex-1 text-center">
              S{w + 1}
            </div>
          ))}
        </div>
        <div className="flex h-px bg-border">
          {weeks.map((w) => (
            <div key={w} className="flex-1 border-r border-border last:border-r-0" />
          ))}
        </div>
      </div>

      {/* Phase bars */}
      <div className="space-y-2">
        {phases.map((phase) => {
          const leftPct = (phase.start_day / totalDays) * 100
          const widthPct = ((phase.end_day - phase.start_day) / totalDays) * 100

          const tasksInPhase = phase.tasks ?? []
          const completedTasks = tasksInPhase.filter((t) => t.status === 'listo').length
          const totalTasks = tasksInPhase.length

          return (
            <div key={phase.id} className="group">
              <div className="relative h-8 rounded-md bg-surface-2 overflow-hidden">
                <div
                  className={cn(
                    'absolute inset-y-0 rounded-md flex items-center px-2 transition-all',
                    PHASE_COLORS[phase.status] ?? 'bg-muted',
                    phase.status === 'en_progreso' && 'opacity-80',
                    phase.status === 'completado' && 'opacity-70',
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
                {totalTasks > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {completedTasks}/{totalTasks} tareas
                  </span>
                )}
                <StatusChip
                  label={phase.status === 'completado' ? 'Listo' : phase.status === 'en_progreso' ? 'En progreso' : 'Pendiente'}
                  colorClass={
                    phase.status === 'completado'
                      ? 'bg-success/15 text-success'
                      : phase.status === 'en_progreso'
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

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-2 border-t border-border">
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-muted" />
          <span>Pendiente</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-info" />
          <span>En progreso</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-success" />
          <span>Completado</span>
        </div>
      </div>
    </div>
  )
}
