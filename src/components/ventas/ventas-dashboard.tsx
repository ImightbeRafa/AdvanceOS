'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Set, Profile, Deal, UserRole } from '@/types'
import { DataTable, type Column } from '@/components/shared/data-table'
import { StatusChip } from '@/components/shared/status-chip'
import { SET_STATUS_LABELS, SET_STATUS_COLORS, SERVICE_LABELS } from '@/lib/constants'
import { formatDateTime, formatShortDate, isDateToday, isDatePast } from '@/lib/utils/dates'
import { formatUSD } from '@/lib/utils/currency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Plus, MoreHorizontal, Eye, CalendarRange, Bookmark, X, ExternalLink, MessageCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import dynamic from 'next/dynamic'

const CreateSetModal = dynamic<{ open: boolean; onOpenChange: (open: boolean) => void; closers: Pick<Profile, 'id' | 'full_name'>[] }>(
  () => import('./create-set-modal').then(m => ({ default: m.CreateSetModal }))
)
const SetDetailDrawer = dynamic<{ set: Set | null; open: boolean; onOpenChange: (open: boolean) => void; closers: Pick<Profile, 'id' | 'full_name'>[] }>(
  () => import('./set-detail-drawer').then(m => ({ default: m.SetDetailDrawer }))
)
const PaymentModal = dynamic<{ set: Set; clientId: string | null; open: boolean; onOpenChange: (open: boolean) => void }>(
  () => import('./payment-modal').then(m => ({ default: m.PaymentModal }))
)
import { useSavedFilters } from '@/lib/hooks/use-saved-filters'

interface VentasDashboardProps {
  sets: Set[]
  closers: Pick<Profile, 'id' | 'full_name'>[]
  setters: Pick<Profile, 'id' | 'full_name'>[]
  paymentsBySet: Record<string, { totalGross: number; totalNet: number }>
  userRole: UserRole
}

function getLatestDeal(s: Set): Deal | null {
  if (!s.deal) return null
  if (Array.isArray(s.deal)) return s.deal.length > 0 ? s.deal[s.deal.length - 1] : null
  return s.deal
}

export function VentasDashboard({ sets, closers, setters, paymentsBySet, userRole }: VentasDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [paymentSet, setPaymentSet] = useState<Set | null>(null)

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

  // --- KPI calculations (current month, using scheduled_at for sets-based metrics) ---
  const now = useMemo(() => new Date(), [])
  const monthStart = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), 1)
    return d.toISOString().split('T')[0]
  }, [now])

  const setsAgendadosMTD = useMemo(() =>
    sets.filter((s) => s.scheduled_at.split('T')[0] >= monthStart),
    [sets, monthStart]
  )

  const setsWithDealMTD = useMemo(() =>
    setsAgendadosMTD.filter((s) => getLatestDeal(s) !== null),
    [setsAgendadosMTD]
  )

  const latestDealsBySetMTD = useMemo(() => {
    const result: { set: Set; deal: Deal }[] = []
    for (const s of sets) {
      const deal = getLatestDeal(s)
      if (!deal) continue
      const dealDate = deal.created_at.split('T')[0]
      if (dealDate >= monthStart) {
        result.push({ set: s, deal })
      }
    }
    return result
  }, [sets, monthStart])

  const closedDealsMTD = useMemo(() =>
    latestDealsBySetMTD.filter((d) => d.deal.outcome === 'closed'),
    [latestDealsBySetMTD]
  )

  const showRate = setsAgendadosMTD.length > 0
    ? (setsWithDealMTD.length / setsAgendadosMTD.length * 100) : 0

  const closeRate = latestDealsBySetMTD.length > 0
    ? (closedDealsMTD.length / latestDealsBySetMTD.length * 100) : 0

  const cashNetMTD = useMemo(() => {
    let total = 0
    for (const val of Object.values(paymentsBySet)) {
      total += val.totalNet
    }
    return total
  }, [paymentsBySet])

  const pendingPaymentSets = useMemo(() =>
    sets.filter((s) => s.status === 'closed_pendiente'),
    [sets]
  )

  const totalSaldoPendiente = useMemo(() =>
    pendingPaymentSets.reduce((sum, s) => {
      const deal = getLatestDeal(s)
      if (!deal?.revenue_total) return sum
      const paid = paymentsBySet[s.id]?.totalGross ?? 0
      return sum + Math.max(0, Number(deal.revenue_total) - paid)
    }, 0),
    [pendingPaymentSets, paymentsBySet]
  )

  const ticketPromedio = closedDealsMTD.length > 0
    ? closedDealsMTD.reduce((sum, d) => sum + Number(d.deal.revenue_total ?? 0), 0) / closedDealsMTD.length
    : 0

  // --- Filtered sets for Setting tab ---
  const filteredSets = useMemo(() => {
    let result = sets
    if (statusFilter !== 'all') result = result.filter((s) => s.status === statusFilter)
    if (closerFilter !== 'all') result = result.filter((s) => s.closer_id === closerFilter)
    if (setterFilter !== 'all') result = result.filter((s) => s.setter_id === setterFilter)
    if (serviceFilter !== 'all') result = result.filter((s) => s.service_offered === serviceFilter)
    if (dateFrom) {
      const from = new Date(dateFrom); from.setHours(0, 0, 0, 0)
      result = result.filter((s) => new Date(s.scheduled_at) >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo); to.setHours(23, 59, 59, 999)
      result = result.filter((s) => new Date(s.scheduled_at) <= to)
    }
    return result
  }, [sets, statusFilter, closerFilter, setterFilter, serviceFilter, dateFrom, dateTo])

  // --- Deals for Closing tab ---
  const allDeals = useMemo(() => {
    const result: { id: string; set: Set; deal: Deal; cashNet: number; cashGross: number }[] = []
    for (const s of sets) {
      const deal = getLatestDeal(s)
      if (!deal) continue
      const payments = paymentsBySet[s.id]
      result.push({
        id: deal.id,
        set: s,
        deal,
        cashNet: payments?.totalNet ?? 0,
        cashGross: payments?.totalGross ?? 0,
      })
    }
    return result.sort((a, b) => new Date(b.deal.created_at).getTime() - new Date(a.deal.created_at).getTime())
  }, [sets, paymentsBySet])

  // --- Pendientes data ---
  const pendingCallsToday = useMemo(() =>
    sets.filter((s) => ['agendado', 'precall_enviado'].includes(s.status) && isDateToday(s.scheduled_at)),
    [sets]
  )

  const pendingCallsNext7 = useMemo(() => {
    const today = new Date()
    const next7 = new Date(today)
    next7.setDate(next7.getDate() + 7)
    return sets.filter((s) => {
      if (!['agendado', 'precall_enviado'].includes(s.status)) return false
      const d = new Date(s.scheduled_at)
      return d > today && d <= next7
    })
  }, [sets])

  const followUpDeals = useMemo(() => {
    const result: { set: Set; deal: Deal }[] = []
    for (const s of sets) {
      const deal = getLatestDeal(s)
      if (!deal || deal.outcome !== 'follow_up' || !deal.follow_up_date) continue
      result.push({ set: s, deal })
    }
    return result.sort((a, b) => new Date(a.deal.follow_up_date!).getTime() - new Date(b.deal.follow_up_date!).getTime())
  }, [sets])

  // --- Estadísticas ---
  const closerStats = useMemo(() => {
    const stats: Record<string, { name: string; llamadas: number; closed: number; cashNet: number }> = {}
    for (const { set, deal } of allDeals) {
      const closerId = set.closer_id
      const closerName = (set.closer as unknown as Profile)?.full_name ?? 'Desconocido'
      if (!stats[closerId]) stats[closerId] = { name: closerName, llamadas: 0, closed: 0, cashNet: 0 }
      stats[closerId].llamadas++
      if (deal.outcome === 'closed') {
        stats[closerId].closed++
        stats[closerId].cashNet += paymentsBySet[set.id]?.totalNet ?? 0
      }
    }
    return Object.values(stats).sort((a, b) => b.closed - a.closed)
  }, [allDeals, paymentsBySet])

  const setterStats = useMemo(() => {
    const stats: Record<string, { name: string; setsCreated: number; setsWithCall: number; closedIndirect: number }> = {}
    for (const s of sets) {
      const setterId = s.setter_id
      const setterName = (s.setter as unknown as Profile)?.full_name ?? 'Desconocido'
      if (!stats[setterId]) stats[setterId] = { name: setterName, setsCreated: 0, setsWithCall: 0, closedIndirect: 0 }
      stats[setterId].setsCreated++
      const deal = getLatestDeal(s)
      if (deal) {
        stats[setterId].setsWithCall++
        if (deal.outcome === 'closed') stats[setterId].closedIndirect++
      }
    }
    return Object.values(stats).sort((a, b) => b.setsCreated - a.setsCreated)
  }, [sets])

  const noShowCount = useMemo(() => sets.filter((s) => s.status === 'no_show').length, [sets])
  const globalShowRate = sets.length > 0
    ? (sets.filter((s) => getLatestDeal(s) !== null).length / sets.length * 100) : 0
  const globalNoShowRate = sets.length > 0 ? (noShowCount / sets.length * 100) : 0

  // --- Columns ---
  const settingColumns: Column<Set>[] = [
    { key: 'prospect', label: 'Prospecto', sortable: true, render: (s) => (
      <div><span className="font-medium">{s.prospect_name}</span>{s.is_duplicate && <span className="ml-1.5 text-[10px] text-warning font-medium">DUP</span>}</div>
    ), getValue: (s) => s.prospect_name },
    { key: 'status', label: 'Estado', render: (s) => <StatusChip label={SET_STATUS_LABELS[s.status]} colorClass={SET_STATUS_COLORS[s.status]} /> },
    { key: 'service', label: 'Servicio', render: (s) => <span className="text-sm text-muted-foreground">{SERVICE_LABELS[s.service_offered]}</span> },
    { key: 'closer', label: 'Closer', render: (s) => <span className="text-sm">{(s.closer as unknown as Profile)?.full_name ?? '—'}</span> },
    { key: 'setter', label: 'Setter', render: (s) => <span className="text-sm">{(s.setter as unknown as Profile)?.full_name ?? '—'}</span> },
    { key: 'scheduled', label: 'Fecha llamada', sortable: true, render: (s) => <span className="text-sm text-muted-foreground">{formatDateTime(s.scheduled_at)}</span>, getValue: (s) => new Date(s.scheduled_at).getTime() },
    { key: 'ig', label: 'IG', render: (s) => (
      <a href={`https://instagram.com/${s.prospect_ig}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline" onClick={(e) => e.stopPropagation()}>@{s.prospect_ig}</a>
    ) },
    { key: 'saldo', label: 'Saldo', render: (s) => {
      if (s.status !== 'closed_pendiente') return <span className="text-sm text-muted-foreground">—</span>
      const deal = getLatestDeal(s)
      if (!deal?.revenue_total) return <span className="text-sm text-muted-foreground">—</span>
      const paid = paymentsBySet[s.id]?.totalGross ?? 0
      const remaining = Math.max(0, Number(deal.revenue_total) - paid)
      return <span className="text-sm text-warning font-medium">{formatUSD(remaining)}</span>
    } },
  ]

  const DEAL_OUTCOME_LABELS: Record<string, string> = { closed: 'Closed', follow_up: 'Follow-up', descalificado: 'Descalificado' }
  const DEAL_OUTCOME_COLORS: Record<string, string> = { closed: 'bg-success/15 text-success', follow_up: 'bg-warning/15 text-warning', descalificado: 'bg-muted text-muted-foreground' }

  type DealRow = { id: string; set: Set; deal: Deal; cashNet: number; cashGross: number }
  const closingColumns: Column<DealRow>[] = [
    { key: 'prospect', label: 'Prospecto', sortable: true, render: (r) => <span className="font-medium text-sm">{r.set.prospect_name}</span>, getValue: (r) => r.set.prospect_name },
    { key: 'outcome', label: 'Outcome', render: (r) => <StatusChip label={DEAL_OUTCOME_LABELS[r.deal.outcome] ?? r.deal.outcome} colorClass={DEAL_OUTCOME_COLORS[r.deal.outcome] ?? ''} /> },
    { key: 'revenue', label: 'Revenue', render: (r) => <span className="text-sm">{r.deal.revenue_total ? formatUSD(r.deal.revenue_total) : '—'}</span> },
    { key: 'cash', label: 'Cash neto', render: (r) => <span className="text-sm">{formatUSD(r.cashNet)}</span> },
    { key: 'date', label: 'Fecha', sortable: true, render: (r) => <span className="text-sm text-muted-foreground">{formatShortDate(r.deal.created_at)}</span>, getValue: (r) => new Date(r.deal.created_at).getTime() },
    { key: 'closer', label: 'Closer', render: (r) => <span className="text-sm">{(r.set.closer as unknown as Profile)?.full_name ?? '—'}</span> },
    { key: 'phantom', label: 'Phantom', render: (r) => r.deal.phantom_link ? (
      <a href={r.deal.phantom_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}><ExternalLink className="h-3.5 w-3.5" /></a>
    ) : <span className="text-muted-foreground">—</span> },
  ]

  const filterBar = (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Estado" /></SelectTrigger>
        <SelectContent className="bg-surface-2">
          <SelectItem value="all">Todos los estados</SelectItem>
          {Object.entries(SET_STATUS_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={closerFilter} onValueChange={setCloserFilter}>
        <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Closer" /></SelectTrigger>
        <SelectContent className="bg-surface-2">
          <SelectItem value="all">Todos los closers</SelectItem>
          {closers.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={setterFilter} onValueChange={setSetterFilter}>
        <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Setter" /></SelectTrigger>
        <SelectContent className="bg-surface-2">
          <SelectItem value="all">Todos los setters</SelectItem>
          {setters.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={serviceFilter} onValueChange={setServiceFilter}>
        <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Servicio" /></SelectTrigger>
        <SelectContent className="bg-surface-2">
          <SelectItem value="all">Todos los servicios</SelectItem>
          <SelectItem value="advance90">Advance90</SelectItem>
          <SelectItem value="meta_advance">Meta Advance</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1.5">
        <CalendarRange className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-36 text-xs" />
        <span className="text-muted-foreground text-xs">—</span>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-36 text-xs" />
      </div>
      <div className="flex items-center gap-1 ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 text-xs"><Bookmark className="h-3 w-3" />Filtros</Button>
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
            <DropdownMenuItem onClick={handleSaveFilter} className="text-xs"><Plus className="h-3 w-3 mr-1" />Guardar filtro actual</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={() => setShowCreateModal(true)} size="sm" className="gap-1"><Plus className="h-4 w-4" />Crear set</Button>
      </div>
    </div>
  )

  const [pendientesSubtab, setPendientesSubtab] = useState<'llamadas' | 'pagos' | 'followups'>('llamadas')

  return (
    <>
      {/* KPI Header */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        <KpiCard label="Sets (agendados)" value={String(setsAgendadosMTD.length)} />
        <KpiCard label="Llamadas tomadas" value={String(setsWithDealMTD.length)} />
        <KpiCard label="Show rate" value={`${showRate.toFixed(0)}%`} />
        <KpiCard label="Close rate" value={`${closeRate.toFixed(0)}%`} />
        <KpiCard label="Cash collected" value={formatUSD(cashNetMTD)} variant="success" />
        <KpiCard label="Pagos pendientes" value={formatUSD(totalSaldoPendiente)} variant="warning" />
        <KpiCard label="Ticket promedio" value={formatUSD(ticketPromedio)} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="setting">
        <TabsList variant="line">
          <TabsTrigger value="setting">Setting</TabsTrigger>
          <TabsTrigger value="closing">Closing</TabsTrigger>
          <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
          <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="setting">
          <DataTable
            data={filteredSets}
            columns={settingColumns}
            searchPlaceholder="Buscar por nombre, IG, WhatsApp..."
            searchKeys={['prospect_name', 'prospect_ig', 'prospect_whatsapp']}
            onRowClick={setSelectedSet}
            emptyMessage="No hay sets para mostrar."
            rowActions={(s) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-surface-2">
                  <DropdownMenuItem onClick={() => setSelectedSet(s)}><Eye className="mr-2 h-4 w-4" />Ver detalle</DropdownMenuItem>
                  {s.prospect_whatsapp && (
                    <DropdownMenuItem asChild>
                      <a href={`https://wa.me/${s.prospect_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 h-4 w-4" />WhatsApp
                      </a>
                    </DropdownMenuItem>
                  )}
                  {s.status === 'closed_pendiente' && (
                    <DropdownMenuItem onClick={() => setPaymentSet(s)}>
                      <Plus className="mr-2 h-4 w-4" />Registrar pago
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            filters={filterBar}
          />
        </TabsContent>

        <TabsContent value="closing">
          <DataTable
            data={allDeals}
            columns={closingColumns}
            searchPlaceholder="Buscar por prospecto..."
            searchKeys={[]}
            onRowClick={(r) => setSelectedSet(r.set)}
            emptyMessage="No hay deals registrados."
          />
        </TabsContent>

        <TabsContent value="pendientes">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant={pendientesSubtab === 'llamadas' ? 'default' : 'outline'} onClick={() => setPendientesSubtab('llamadas')}>Llamadas</Button>
              <Button size="sm" variant={pendientesSubtab === 'pagos' ? 'default' : 'outline'} onClick={() => setPendientesSubtab('pagos')}>Pagos</Button>
              <Button size="sm" variant={pendientesSubtab === 'followups' ? 'default' : 'outline'} onClick={() => setPendientesSubtab('followups')}>Follow-ups</Button>
            </div>

            {pendientesSubtab === 'llamadas' && (
              <div className="space-y-4">
                <Section title="Hoy" items={pendingCallsToday} emptyText="Sin llamadas para hoy." renderItem={(s) => (
                  <button key={s.id} onClick={() => setSelectedSet(s)} className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-surface-2 transition-colors">
                    <div><p className="text-sm font-medium">{s.prospect_name}</p><p className="text-xs text-muted-foreground">{formatDateTime(s.scheduled_at)}</p></div>
                    <StatusChip label={SET_STATUS_LABELS[s.status]} colorClass={SET_STATUS_COLORS[s.status]} size="sm" />
                  </button>
                )} />
                <Section title="Próximos 7 días" items={pendingCallsNext7} emptyText="Sin llamadas próximas." renderItem={(s) => (
                  <button key={s.id} onClick={() => setSelectedSet(s)} className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-surface-2 transition-colors">
                    <div><p className="text-sm font-medium">{s.prospect_name}</p><p className="text-xs text-muted-foreground">{formatDateTime(s.scheduled_at)}</p></div>
                    <StatusChip label={SET_STATUS_LABELS[s.status]} colorClass={SET_STATUS_COLORS[s.status]} size="sm" />
                  </button>
                )} />
              </div>
            )}

            {pendientesSubtab === 'pagos' && (
              <Section title="Sets con pagos pendientes" items={pendingPaymentSets} emptyText="Sin pagos pendientes." renderItem={(s) => {
                const deal = getLatestDeal(s)
                const paid = paymentsBySet[s.id]?.totalGross ?? 0
                const remaining = deal?.revenue_total ? Math.max(0, Number(deal.revenue_total) - paid) : 0
                return (
                  <div key={s.id} className="flex items-center justify-between rounded-lg p-3 hover:bg-surface-2 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{s.prospect_name}</p>
                      <p className="text-xs text-muted-foreground">Saldo: {formatUSD(remaining)}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setPaymentSet(s)}>Registrar pago</Button>
                  </div>
                )
              }} />
            )}

            {pendientesSubtab === 'followups' && (
              <Section title="Follow-ups pendientes" items={followUpDeals} emptyText="Sin follow-ups pendientes." renderItem={({ set: s, deal }) => {
                const isPast = deal.follow_up_date ? isDatePast(deal.follow_up_date) : false
                const isToday_ = deal.follow_up_date ? isDateToday(deal.follow_up_date) : false
                return (
                  <button key={deal.id} onClick={() => setSelectedSet(s)} className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-surface-2 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{s.prospect_name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{deal.follow_up_notes}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${isPast ? 'text-destructive' : isToday_ ? 'text-warning' : 'text-muted-foreground'}`}>
                        {deal.follow_up_date ? formatShortDate(deal.follow_up_date) : '—'}
                      </span>
                      <span className="text-xs">{(s.closer as unknown as Profile)?.full_name}</span>
                    </div>
                  </button>
                )
              }} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="estadisticas">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface-1 p-4">
              <h3 className="text-sm font-semibold mb-3">Top Closers</h3>
              {closerStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos.</p>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border text-muted-foreground text-xs">
                      <th className="text-left py-2 font-medium">Closer</th>
                      <th className="text-right py-2 font-medium">Llamadas</th>
                      <th className="text-right py-2 font-medium">Closed</th>
                      <th className="text-right py-2 font-medium">Close %</th>
                      <th className="text-right py-2 font-medium">Cash neto</th>
                    </tr></thead>
                    <tbody>{closerStats.map((c) => (
                      <tr key={c.name} className="border-b border-border/50">
                        <td className="py-2 font-medium">{c.name}</td>
                        <td className="py-2 text-right">{c.llamadas}</td>
                        <td className="py-2 text-right">{c.closed}</td>
                        <td className="py-2 text-right">{c.llamadas > 0 ? (c.closed / c.llamadas * 100).toFixed(0) : 0}%</td>
                        <td className="py-2 text-right">{formatUSD(c.cashNet)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-4">
              <h3 className="text-sm font-semibold mb-3">Top Setters</h3>
              {setterStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos.</p>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border text-muted-foreground text-xs">
                      <th className="text-left py-2 font-medium">Setter</th>
                      <th className="text-right py-2 font-medium">Sets</th>
                      <th className="text-right py-2 font-medium">Con llamada</th>
                      <th className="text-right py-2 font-medium">Close % ind.</th>
                      <th className="text-right py-2 font-medium">Show %</th>
                    </tr></thead>
                    <tbody>{setterStats.map((s) => (
                      <tr key={s.name} className="border-b border-border/50">
                        <td className="py-2 font-medium">{s.name}</td>
                        <td className="py-2 text-right">{s.setsCreated}</td>
                        <td className="py-2 text-right">{s.setsWithCall}</td>
                        <td className="py-2 text-right">{s.setsWithCall > 0 ? (s.closedIndirect / s.setsWithCall * 100).toFixed(0) : 0}%</td>
                        <td className="py-2 text-right">{s.setsCreated > 0 ? (s.setsWithCall / s.setsCreated * 100).toFixed(0) : 0}%</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-4 lg:col-span-2">
              <h3 className="text-sm font-semibold mb-3">Rates globales</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Show rate global</p>
                  <p className="text-xl font-bold">{globalShowRate.toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">No show rate global</p>
                  <p className="text-xl font-bold">{globalNoShowRate.toFixed(0)}%</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <CreateSetModal open={showCreateModal} onOpenChange={setShowCreateModal} closers={closers} />
      <SetDetailDrawer set={selectedSet} open={!!selectedSet} onOpenChange={(open: boolean) => { if (!open) setSelectedSet(null) }} closers={closers} />
      {paymentSet && (
        <PaymentModal set={paymentSet} clientId={null} open={!!paymentSet} onOpenChange={(open: boolean) => { if (!open) setPaymentSet(null) }} />
      )}
    </>
  )
}

function KpiCard({ label, value, variant = 'default' }: { label: string; value: string; variant?: 'default' | 'success' | 'warning' }) {
  const textClass = variant === 'success' ? 'text-success' : variant === 'warning' ? 'text-warning' : ''
  return (
    <div className="rounded-xl border border-border bg-surface-1 p-3">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${textClass}`}>{value}</p>
    </div>
  )
}

function Section<T>({ title, items, emptyText, renderItem }: { title: string; items: T[]; emptyText: string; renderItem: (item: T) => React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <h3 className="text-sm font-semibold mb-3">{title} <span className="text-muted-foreground font-normal">({items.length})</span></h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-1">{items.map(renderItem)}</div>
      )}
    </div>
  )
}
