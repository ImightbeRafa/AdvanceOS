'use client'

import { useState, useMemo } from 'react'
import { DataTable, type Column } from '@/components/shared/data-table'
import { StatusChip } from '@/components/shared/status-chip'
import { TicketDetailDrawer } from './ticket-detail-drawer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Inbox, AlertTriangle, UserX, CheckCircle2 } from 'lucide-react'
import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_COLORS,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_CATEGORY_COLORS,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_PRIORITY_COLORS,
} from '@/lib/constants'
import type { FeedbackTicket, FeedbackCategory, FeedbackPriority, FeedbackStatus, Profile } from '@/types'

interface FeedbackDashboardProps {
  tickets: FeedbackTicket[]
  teamMembers: Pick<Profile, 'id' | 'full_name' | 'role'>[]
}

export function FeedbackDashboard({ tickets, teamMembers }: FeedbackDashboardProps) {
  const [selectedTicket, setSelectedTicket] = useState<FeedbackTicket | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false
      if (filterCategory !== 'all' && t.category !== filterCategory) return false
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false
      return true
    })
  }, [tickets, filterStatus, filterCategory, filterPriority])

  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status === 'abierto' || t.status === 'en_revision').length
    const urgent = tickets.filter((t) => t.priority === 'urgente' && t.status !== 'cerrado' && t.status !== 'resuelto').length
    const unassigned = tickets.filter((t) => !t.assigned_to && t.status !== 'cerrado' && t.status !== 'resuelto').length
    const resolved = tickets.filter((t) => t.status === 'resuelto' || t.status === 'cerrado').length
    return { open, urgent, unassigned, resolved }
  }, [tickets])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tickets.length }
    for (const t of tickets) {
      counts[t.status] = (counts[t.status] ?? 0) + 1
    }
    return counts
  }, [tickets])

  function handleRowClick(ticket: FeedbackTicket) {
    setSelectedTicket(ticket)
    setDrawerOpen(true)
  }

  const columns: Column<FeedbackTicket>[] = [
    {
      key: 'subject',
      label: 'Asunto',
      sortable: true,
      getValue: (row) => row.subject,
      render: (row) => (
        <div className="max-w-[280px]">
          <p className="font-medium truncate">{row.subject}</p>
          <p className="text-xs text-muted-foreground truncate">{row.description}</p>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Categoría',
      render: (row) => (
        <StatusChip
          label={FEEDBACK_CATEGORY_LABELS[row.category]}
          colorClass={FEEDBACK_CATEGORY_COLORS[row.category]}
        />
      ),
    },
    {
      key: 'priority',
      label: 'Prioridad',
      render: (row) => (
        <StatusChip
          label={FEEDBACK_PRIORITY_LABELS[row.priority]}
          colorClass={FEEDBACK_PRIORITY_COLORS[row.priority]}
        />
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (row) => (
        <StatusChip
          label={FEEDBACK_STATUS_LABELS[row.status]}
          colorClass={FEEDBACK_STATUS_COLORS[row.status]}
        />
      ),
    },
    {
      key: 'user',
      label: 'Enviado por',
      render: (row) => (
        <span className="text-sm">{row.user?.full_name ?? '—'}</span>
      ),
    },
    {
      key: 'assigned',
      label: 'Asignado a',
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.assigned_member?.full_name ?? 'Sin asignar'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Fecha',
      sortable: true,
      getValue: (row) => new Date(row.created_at).getTime(),
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.created_at), 'dd MMM yyyy', { locale: es })}
        </span>
      ),
    },
  ]

  const filters = (
    <>
      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="w-[150px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-surface-3">
          <SelectItem value="all">Todos ({statusCounts.all})</SelectItem>
          {(Object.entries(FEEDBACK_STATUS_LABELS) as [FeedbackStatus, string][]).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label} ({statusCounts[value] ?? 0})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filterCategory} onValueChange={setFilterCategory}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-surface-3">
          <SelectItem value="all">Categoría</SelectItem>
          {(Object.entries(FEEDBACK_CATEGORY_LABELS) as [FeedbackCategory, string][]).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filterPriority} onValueChange={setFilterPriority}>
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-surface-3">
          <SelectItem value="all">Prioridad</SelectItem>
          {(Object.entries(FEEDBACK_PRIORITY_LABELS) as [FeedbackPriority, string][]).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Inbox}
          label="Abiertos"
          value={stats.open}
          variant={stats.open > 0 ? 'warning' : 'default'}
          onClick={() => setFilterStatus(filterStatus === 'abierto' ? 'all' : 'abierto')}
          active={filterStatus === 'abierto'}
        />
        <StatCard
          icon={AlertTriangle}
          label="Urgentes"
          value={stats.urgent}
          variant={stats.urgent > 0 ? 'destructive' : 'default'}
          onClick={() => setFilterPriority(filterPriority === 'urgente' ? 'all' : 'urgente')}
          active={filterPriority === 'urgente'}
        />
        <StatCard
          icon={UserX}
          label="Sin asignar"
          value={stats.unassigned}
          variant={stats.unassigned > 0 ? 'warning' : 'default'}
        />
        <StatCard
          icon={CheckCircle2}
          label="Resueltos"
          value={stats.resolved}
          variant="success"
        />
      </div>

      <DataTable
        data={filteredTickets}
        columns={columns}
        searchPlaceholder="Buscar tickets..."
        searchKeys={['subject' as keyof FeedbackTicket, 'description' as keyof FeedbackTicket]}
        onRowClick={handleRowClick}
        emptyMessage="No hay tickets de feedback."
        filters={filters}
      />

      <TicketDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        ticket={selectedTicket}
        teamMembers={teamMembers}
      />
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  variant = 'default',
  onClick,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  variant?: 'default' | 'success' | 'warning' | 'destructive'
  onClick?: () => void
  active?: boolean
}) {
  const variantClass = {
    default: 'text-muted-foreground',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  }[variant]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border bg-surface-1 p-4 text-left transition-colors w-full ${
        active ? 'border-primary ring-1 ring-primary/20' : 'border-border hover:bg-surface-2'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className={`flex items-center gap-2 ${variantClass}`}>
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </button>
  )
}
