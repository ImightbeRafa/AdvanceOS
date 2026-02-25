import { formatDateTime } from '@/lib/utils/dates'
import type { ActivityLogEntry } from '@/types'

interface ActivityTimelineProps {
  entries: ActivityLogEntry[]
}

const ACTION_LABELS: Record<string, string> = {
  created: 'Creado',
  updated: 'Actualizado',
  status_changed: 'Estado cambiado',
  payment_registered: 'Pago registrado',
  commission_paid: 'Comisión pagada',
  task_completed: 'Tarea completada',
  assigned: 'Asignado',
}

export function ActivityTimeline({ entries }: ActivityTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Sin actividad registrada.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="flex gap-3">
          <div className="relative flex flex-col items-center">
            <div className="h-2 w-2 rounded-full bg-muted-foreground mt-2" />
            <div className="flex-1 w-px bg-border" />
          </div>
          <div className="pb-4">
            <p className="text-sm">
              <span className="font-medium">
                {entry.user?.full_name ?? 'Sistema'}
              </span>{' '}
              <span className="text-muted-foreground">
                {ACTION_LABELS[entry.action] ?? entry.action}
              </span>
            </p>
            {entry.details && Object.keys(entry.details).length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {entry.details.old_status && entry.details.new_status
                  ? `${entry.details.old_status} → ${entry.details.new_status}`
                  : JSON.stringify(entry.details)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDateTime(entry.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
