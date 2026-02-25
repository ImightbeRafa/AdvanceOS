'use client'

import type { Profile, Task } from '@/types'
import { StatusChip } from '@/components/shared/status-chip'
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/lib/constants'
import { formatDate, isDatePast } from '@/lib/utils/dates'
import { CheckCircle, AlertTriangle, Clock, ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface DeliveryDashboardProps {
  profile: Profile
  tasks: (Task & { client?: { business_name: string } })[]
}

export function DeliveryDashboard({ profile, tasks }: DeliveryDashboardProps) {
  const myTasks = tasks.filter((t) => t.assigned_to === profile.id)
  const pendingTasks = myTasks.filter((t) => t.status === 'pendiente')
  const inProgressTasks = myTasks.filter((t) => t.status === 'en_progreso')
  const overdueTasks = myTasks.filter((t) => t.due_date && isDatePast(t.due_date) && t.status !== 'listo')
  const completedTasks = myTasks.filter((t) => t.status === 'listo')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hola, {profile.full_name.split(' ')[0]}</h1>
        <p className="text-muted-foreground">Tus tareas y entregables.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><ListTodo className="h-4 w-4" /><span className="text-sm">Pendientes</span></div>
          <p className="mt-1 text-2xl font-bold">{pendingTasks.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-info"><Clock className="h-4 w-4" /><span className="text-sm">En progreso</span></div>
          <p className="mt-1 text-2xl font-bold">{inProgressTasks.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" /><span className="text-sm">Vencidas</span></div>
          <p className="mt-1 text-2xl font-bold">{overdueTasks.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-success"><CheckCircle className="h-4 w-4" /><span className="text-sm">Completadas</span></div>
          <p className="mt-1 text-2xl font-bold">{completedTasks.length}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Mis tareas</h2>
          <Link href="/clientes"><Button size="sm" variant="outline">Ver clientes</Button></Link>
        </div>
        {myTasks.filter((t) => t.status !== 'listo').length === 0 ? (
          <div className="rounded-xl border border-border bg-surface-1 p-6 text-center text-sm text-muted-foreground">
            ¡Todo al día! No tenés tareas pendientes.
          </div>
        ) : (
          <div className="space-y-2">
            {myTasks.filter((t) => t.status !== 'listo').map((t) => (
              <div key={t.id} className="rounded-xl border border-border bg-surface-1 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{t.title}</span>
                    {t.client && <p className="text-xs text-muted-foreground">{t.client.business_name}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {t.due_date && <span className="text-xs text-muted-foreground">{formatDate(t.due_date)}</span>}
                    <StatusChip label={TASK_STATUS_LABELS[t.status]} colorClass={TASK_STATUS_COLORS[t.status]} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
