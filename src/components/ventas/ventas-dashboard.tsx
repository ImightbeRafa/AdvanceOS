'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Set, Profile, UserRole } from '@/types'
import { DataTable, type Column } from '@/components/shared/data-table'
import { StatusChip } from '@/components/shared/status-chip'
import { SET_STATUS_LABELS, SET_STATUS_COLORS, SERVICE_LABELS } from '@/lib/constants'
import { formatDateTime, formatShortDate, isDateToday } from '@/lib/utils/dates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Phone, Clock, Trophy, MoreHorizontal, Eye, CalendarRange, Bookmark, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { CreateSetModal } from './create-set-modal'
import { SetDetailDrawer } from './set-detail-drawer'
import { useSavedFilters } from '@/lib/hooks/use-saved-filters'

interface VentasDashboardProps {
  sets: Set[]
  closers: Pick<Profile, 'id' | 'full_name'>[]
  setters: Pick<Profile, 'id' | 'full_name'>[]
  userRole: UserRole
}

export function VentasDashboard({ sets, closers, setters, userRole }: VentasDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    if (searchParams.get('crear') === 'true') {
      setShowCreateModal(true)
      router.replace('/ventas', { scroll: false })
    }
  }, [searchParams, router])
  const [selectedSet, setSelectedSet] = useState<Set | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [closerFilter, setCloserFilter] = useState<string>('all')
  const [setterFilter, setSetterFilter] = useState<string>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const { presets, savePreset, deletePreset } = useSavedFilters('ventas')

  function handleSaveFilter() {
    const name = prompt('Nombre del filtro:')
    if (!name?.trim()) return
    savePreset(name.trim(), { statusFilter, closerFilter, setterFilter, serviceFilter, dateFrom, dateTo })
  }

  function handleLoadPreset(filters: Record<string, string>) {
    setStatusFilter(filters.statusFilter ?? 'all')
    setCloserFilter(filters.closerFilter ?? 'all')
    setSetterFilter(filters.setterFilter ?? 'all')
    setServiceFilter(filters.serviceFilter ?? 'all')
    setDateFrom(filters.dateFrom ?? '')
    setDateTo(filters.dateTo ?? '')
  }

  const pendingCallsList = useMemo(() =>
    sets.filter((s) =>
      ['agendado', 'precall_enviado'].includes(s.status) &&
      isDateToday(s.scheduled_at)
    ).slice(0, 5),
    [sets]
  )

  const followUpsToday = useMemo(() =>
    sets.filter((s) => {
      const deal = Array.isArray(s.deal) ? s.deal[0] : s.deal
      return s.status === 'seguimiento' && deal?.follow_up_date && isDateToday(deal.follow_up_date)
    }).length,
    [sets]
  )

  const lastSets = useMemo(() =>
    [...sets].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
    [sets]
  )

  const lastSales = useMemo(() =>
    sets.filter((s) => ['closed', 'closed_pendiente'].includes(s.status))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5),
    [sets]
  )

  const closedThisMonth = useMemo(() => {
    const now = new Date()
    return sets.filter((s) =>
      ['closed', 'closed_pendiente'].includes(s.status) &&
      new Date(s.updated_at).getMonth() === now.getMonth() &&
      new Date(s.updated_at).getFullYear() === now.getFullYear()
    ).length
  }, [sets])

  const filteredSets = useMemo(() => {
    let result = sets
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter)
    }
    if (closerFilter !== 'all') {
      result = result.filter((s) => s.closer_id === closerFilter)
    }
    if (setterFilter !== 'all') {
      result = result.filter((s) => s.setter_id === setterFilter)
    }
    if (serviceFilter !== 'all') {
      result = result.filter((s) => s.service_offered === serviceFilter)
    }
    if (dateFrom) {
      const from = new Date(dateFrom)
      from.setHours(0, 0, 0, 0)
      result = result.filter((s) => new Date(s.scheduled_at) >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      result = result.filter((s) => new Date(s.scheduled_at) <= to)
    }
    return result
  }, [sets, statusFilter, closerFilter, setterFilter, serviceFilter, dateFrom, dateTo])

  const columns: Column<Set>[] = [
    {
      key: 'prospect',
      label: 'Prospecto',
      sortable: true,
      render: (s) => (
        <div>
          <span className="font-medium">{s.prospect_name}</span>
          {s.is_duplicate && (
            <span className="ml-1.5 text-[10px] text-warning font-medium">DUP</span>
          )}
        </div>
      ),
      getValue: (s) => s.prospect_name,
    },
    {
      key: 'status',
      label: 'Estado',
      render: (s) => (
        <StatusChip
          label={SET_STATUS_LABELS[s.status]}
          colorClass={SET_STATUS_COLORS[s.status]}
        />
      ),
    },
    {
      key: 'service',
      label: 'Servicio',
      render: (s) => <span className="text-sm text-muted-foreground">{SERVICE_LABELS[s.service_offered]}</span>,
    },
    {
      key: 'closer',
      label: 'Closer',
      render: (s) => <span className="text-sm">{(s.closer as unknown as Profile)?.full_name ?? '—'}</span>,
    },
    {
      key: 'setter',
      label: 'Setter',
      render: (s) => <span className="text-sm">{(s.setter as unknown as Profile)?.full_name ?? '—'}</span>,
    },
    {
      key: 'scheduled',
      label: 'Fecha llamada',
      sortable: true,
      render: (s) => <span className="text-sm text-muted-foreground">{formatDateTime(s.scheduled_at)}</span>,
      getValue: (s) => new Date(s.scheduled_at).getTime(),
    },
    {
      key: 'ig',
      label: 'IG',
      render: (s) => (
        <a
          href={`https://instagram.com/${s.prospect_ig}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          @{s.prospect_ig}
        </a>
      ),
    },
  ]

  function MiniSetRow({ s, onClick }: { s: Set; onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{s.prospect_name}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(s.scheduled_at)}</p>
        </div>
        <StatusChip
          label={SET_STATUS_LABELS[s.status]}
          colorClass={SET_STATUS_COLORS[s.status]}
          size="sm"
        />
      </button>
    )
  }

  return (
    <>
      {/* 3-block quick view */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <Phone className="h-4 w-4" />
            <span className="text-sm font-medium">Llamadas pendientes hoy</span>
            <span className="ml-auto text-lg font-bold text-foreground">{pendingCallsList.length}</span>
          </div>
          {pendingCallsList.length > 0 ? (
            <div className="space-y-0.5">
              {pendingCallsList.map((s) => (
                <MiniSetRow key={s.id} s={s} onClick={() => setSelectedSet(s)} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">No hay llamadas pendientes hoy.</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Últimos sets creados</span>
          </div>
          {lastSets.length > 0 ? (
            <div className="space-y-0.5">
              {lastSets.map((s) => (
                <MiniSetRow key={s.id} s={s} onClick={() => setSelectedSet(s)} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">No hay sets creados aún.</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <Trophy className="h-4 w-4" />
            <span className="text-sm font-medium">Últimas ventas</span>
            <span className="ml-auto text-lg font-bold text-foreground">{closedThisMonth} <span className="text-xs font-normal text-muted-foreground">este mes</span></span>
          </div>
          {lastSales.length > 0 ? (
            <div className="space-y-0.5">
              {lastSales.map((s) => (
                <MiniSetRow key={s.id} s={s} onClick={() => setSelectedSet(s)} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">No hay ventas cerradas aún.</p>
          )}
        </div>
      </div>

      <DataTable
        data={filteredSets}
        columns={columns}
        searchPlaceholder="Buscar por nombre, IG, WhatsApp..."
        searchKeys={['prospect_name', 'prospect_ig', 'prospect_whatsapp']}
        onRowClick={setSelectedSet}
        emptyMessage="No hay sets para mostrar."
        rowActions={(s) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-surface-2">
              <DropdownMenuItem onClick={() => setSelectedSet(s)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver detalle
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="bg-surface-2">
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(SET_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={closerFilter} onValueChange={setCloserFilter}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="Closer" />
              </SelectTrigger>
              <SelectContent className="bg-surface-2">
                <SelectItem value="all">Todos los closers</SelectItem>
                {closers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={setterFilter} onValueChange={setSetterFilter}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="Setter" />
              </SelectTrigger>
              <SelectContent className="bg-surface-2">
                <SelectItem value="all">Todos los setters</SelectItem>
                {setters.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="Servicio" />
              </SelectTrigger>
              <SelectContent className="bg-surface-2">
                <SelectItem value="all">Todos los servicios</SelectItem>
                <SelectItem value="advance90">Advance90</SelectItem>
                <SelectItem value="meta_advance">Meta Advance</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <CalendarRange className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 w-36 text-xs"
                placeholder="Desde"
              />
              <span className="text-muted-foreground text-xs">—</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 w-36 text-xs"
                placeholder="Hasta"
              />
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
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

              <Button onClick={() => setShowCreateModal(true)} size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Crear set
              </Button>
            </div>
          </div>
        }
      />

      <CreateSetModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        closers={closers}
      />

      <SetDetailDrawer
        set={selectedSet}
        open={!!selectedSet}
        onOpenChange={(open) => !open && setSelectedSet(null)}
        closers={closers}
      />
    </>
  )
}
