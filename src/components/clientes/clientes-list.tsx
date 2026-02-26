'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Client, Profile, UserRole } from '@/types'
import { DataTable, type Column } from '@/components/shared/data-table'
import { StatusChip } from '@/components/shared/status-chip'
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_COLORS, SERVICE_LABELS } from '@/lib/constants'
import { formatDate, formatShortDate, todayCR } from '@/lib/utils/dates'
import { formatUSD } from '@/lib/utils/currency'
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

interface PhaseInfo {
  phase_name: string
  start_date: string
  end_date: string
  order: number
}

interface ClientesListProps {
  clients: (Client & { assigned_member?: Pick<Profile, 'id' | 'full_name'> | null })[]
  paymentsByClient: Record<string, number>
  revenueByDeal: Record<string, number>
  phasesByClient: Record<string, PhaseInfo[]>
  userRole: UserRole
}

function getCurrentPhase(phases: PhaseInfo[]): string | null {
  if (phases.length === 0) return null
  const today = todayCR()
  const active = phases.find((p) => p.start_date <= today && p.end_date >= today)
  if (active) return active.phase_name
  const future = phases.find((p) => p.start_date > today)
  if (future) return future.phase_name
  return phases[phases.length - 1].phase_name
}

export function ClientesList({ clients, paymentsByClient, revenueByDeal, phasesByClient, userRole }: ClientesListProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [faseFilter, setFaseFilter] = useState<string>('all')
  const [pagosPendientesFilter, setPagosPendientesFilter] = useState<string>('all')
  const { presets, savePreset, deletePreset } = useSavedFilters('clientes')

  function handleSaveFilter() {
    const name = prompt('Nombre del filtro:')
    if (!name?.trim()) return
    savePreset(name.trim(), { statusFilter, serviceFilter, faseFilter, pagosPendientesFilter })
  }

  function handleLoadPreset(filters: Record<string, string>) {
    setStatusFilter(filters.statusFilter ?? 'all')
    setServiceFilter(filters.serviceFilter ?? 'all')
    setFaseFilter(filters.faseFilter ?? 'all')
    setPagosPendientesFilter(filters.pagosPendientesFilter ?? 'all')
  }

  function hasPendingPayments(c: Client) {
    const revenue = revenueByDeal[c.deal_id] ?? 0
    const paid = paymentsByClient[c.id] ?? 0
    return revenue > 0 && paid < revenue
  }

  function getSaldo(c: Client): number {
    const revenue = revenueByDeal[c.deal_id] ?? 0
    const paid = paymentsByClient[c.id] ?? 0
    return Math.max(0, revenue - paid)
  }

  const allFaseNames = useMemo(() => {
    const names = new Set<string>()
    for (const phases of Object.values(phasesByClient)) {
      for (const p of phases) names.add(p.phase_name)
    }
    return Array.from(names)
  }, [phasesByClient])

  const filtered = clients.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (serviceFilter !== 'all' && c.service !== serviceFilter) return false
    if (faseFilter !== 'all') {
      const currentPhase = getCurrentPhase(phasesByClient[c.id] ?? [])
      if (currentPhase !== faseFilter) return false
    }
    if (pagosPendientesFilter === 'si' && !hasPendingPayments(c)) return false
    if (pagosPendientesFilter === 'no' && hasPendingPayments(c)) return false
    return true
  })

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
            </span>
          )}
        </div>
      ),
      getValue: (c) => c.business_name,
    },
    {
      key: 'service',
      label: 'Servicio',
      render: (c) => <span className="text-sm text-muted-foreground">{SERVICE_LABELS[c.service as keyof typeof SERVICE_LABELS]}</span>,
    },
    {
      key: 'status',
      label: 'Estado',
      render: (c) => <StatusChip label={CLIENT_STATUS_LABELS[c.status]} colorClass={CLIENT_STATUS_COLORS[c.status]} />,
    },
    {
      key: 'assigned',
      label: 'Responsable',
      render: (c) => <span className="text-sm">{c.assigned_member?.full_name ?? 'Sin asignar'}</span>,
    },
    {
      key: 'fase',
      label: 'Fase actual',
      render: (c) => {
        if (c.service !== 'advance90') return <span className="text-xs text-muted-foreground">—</span>
        const phase = getCurrentPhase(phasesByClient[c.id] ?? [])
        return phase
          ? <span className="text-sm">{phase}</span>
          : <span className="text-xs text-muted-foreground">Sin fases</span>
      },
    },
    {
      key: 'dates',
      label: 'Inicio / Fin',
      render: (c) => {
        const phases = phasesByClient[c.id]
        if (!phases || phases.length === 0) return <span className="text-xs text-muted-foreground">—</span>
        return (
          <span className="text-xs text-muted-foreground">
            {formatShortDate(phases[0].start_date)} — {formatShortDate(phases[phases.length - 1].end_date)}
          </span>
        )
      },
    },
    {
      key: 'saldo',
      label: 'Saldo',
      render: (c) => {
        const saldo = getSaldo(c)
        if (saldo <= 0) return <span className="text-xs text-muted-foreground">—</span>
        return <span className="text-sm text-warning font-medium">{formatUSD(saldo)}</span>
      },
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
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent className="bg-surface-2">
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(CLIENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Servicio" /></SelectTrigger>
            <SelectContent className="bg-surface-2">
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(SERVICE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          {allFaseNames.length > 0 && (
            <Select value={faseFilter} onValueChange={setFaseFilter}>
              <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Fase" /></SelectTrigger>
              <SelectContent className="bg-surface-2">
                <SelectItem value="all">Todas las fases</SelectItem>
                {allFaseNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={pagosPendientesFilter} onValueChange={setPagosPendientesFilter}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Pagos" /></SelectTrigger>
            <SelectContent className="bg-surface-2">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="si">Con saldo</SelectItem>
              <SelectItem value="no">Sin saldo</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-xs ml-auto"><Bookmark className="h-3 w-3" />Filtros</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-surface-2 w-56">
              {presets.length === 0 ? (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">Sin filtros guardados</DropdownMenuItem>
              ) : presets.map((p) => (
                <DropdownMenuItem key={p.id} className="flex items-center justify-between text-xs">
                  <span className="cursor-pointer flex-1" onClick={() => handleLoadPreset(p.filters)}>{p.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); deletePreset(p.id) }} className="text-muted-foreground hover:text-destructive ml-2"><X className="h-3 w-3" /></button>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSaveFilter} className="text-xs"><Plus className="h-3 w-3 mr-1" />Guardar filtro</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  )
}
