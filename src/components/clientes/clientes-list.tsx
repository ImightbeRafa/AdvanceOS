'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Client, Profile, UserRole } from '@/types'
import { DataTable, type Column } from '@/components/shared/data-table'
import { StatusChip } from '@/components/shared/status-chip'
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_COLORS, SERVICE_LABELS } from '@/lib/constants'
import { formatDate, formatShortDate } from '@/lib/utils/dates'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { AlertCircle, Bookmark, Plus, X } from 'lucide-react'
import { useSavedFilters } from '@/lib/hooks/use-saved-filters'

interface ClientesListProps {
  clients: (Client & { assigned_member?: Pick<Profile, 'id' | 'full_name'> | null })[]
  paymentsByClient: Record<string, number>
  revenueByDeal: Record<string, number>
  nextTaskByClient: Record<string, { title: string; due_date: string | null }>
  userRole: UserRole
}

export function ClientesList({ clients, paymentsByClient, revenueByDeal, nextTaskByClient, userRole }: ClientesListProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const { presets, savePreset, deletePreset } = useSavedFilters('clientes')

  function handleSaveFilter() {
    const name = prompt('Nombre del filtro:')
    if (!name?.trim()) return
    savePreset(name.trim(), { statusFilter, serviceFilter })
  }

  function handleLoadPreset(filters: Record<string, string>) {
    setStatusFilter(filters.statusFilter ?? 'all')
    setServiceFilter(filters.serviceFilter ?? 'all')
  }

  const filtered = clients.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (serviceFilter !== 'all' && c.service !== serviceFilter) return false
    return true
  })

  function hasPendingPayments(c: Client) {
    const revenue = revenueByDeal[c.deal_id] ?? 0
    const paid = paymentsByClient[c.id] ?? 0
    return revenue > 0 && paid < revenue
  }

  const columns: Column<typeof clients[number]>[] = [
    {
      key: 'name',
      label: 'Negocio',
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{c.business_name}</span>
          {hasPendingPayments(c) && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-warning" title="Pagos pendientes">
              <AlertCircle className="h-3 w-3" />
              Saldo
            </span>
          )}
        </div>
      ),
      getValue: (c) => c.business_name,
    },
    {
      key: 'service',
      label: 'Servicio',
      render: (c) => (
        <span className="text-sm text-muted-foreground">
          {SERVICE_LABELS[c.service as keyof typeof SERVICE_LABELS]}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (c) => (
        <StatusChip
          label={CLIENT_STATUS_LABELS[c.status]}
          colorClass={CLIENT_STATUS_COLORS[c.status]}
        />
      ),
    },
    {
      key: 'assigned',
      label: 'Responsable',
      render: (c) => (
        <span className="text-sm">
          {c.assigned_member?.full_name ?? 'Sin asignar'}
        </span>
      ),
    },
    {
      key: 'next_task',
      label: 'Próxima tarea',
      render: (c) => {
        const task = nextTaskByClient[c.id]
        if (!task) return <span className="text-xs text-muted-foreground">—</span>
        return (
          <div className="max-w-[180px]">
            <p className="truncate text-sm">{task.title}</p>
            {task.due_date && (
              <p className="text-xs text-muted-foreground">{formatShortDate(task.due_date)}</p>
            )}
          </div>
        )
      },
    },
    {
      key: 'created',
      label: 'Fecha',
      sortable: true,
      render: (c) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(c.created_at)}
        </span>
      ),
      getValue: (c) => new Date(c.created_at).getTime(),
    },
  ]

  return (
    <DataTable
      data={filtered}
      columns={columns}
      searchPlaceholder="Buscar cliente..."
      searchKeys={['business_name', 'contact_name', 'ig', 'whatsapp']}
      onRowClick={(c) => router.push(`/clientes/${c.id}`)}
      filters={
        <>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-surface-2">
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(CLIENT_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Servicio" />
            </SelectTrigger>
            <SelectContent className="bg-surface-2">
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(SERVICE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-xs ml-auto">
                <Bookmark className="h-3 w-3" />
                Filtros guardados
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-surface-2 w-56">
              {presets.length === 0 ? (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  Sin filtros guardados
                </DropdownMenuItem>
              ) : (
                presets.map((p) => (
                  <DropdownMenuItem key={p.id} className="flex items-center justify-between text-xs">
                    <span className="cursor-pointer flex-1" onClick={() => handleLoadPreset(p.filters)}>{p.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); deletePreset(p.id) }} className="text-muted-foreground hover:text-destructive ml-2">
                      <X className="h-3 w-3" />
                    </button>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSaveFilter} className="text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Guardar filtro actual
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  )
}
