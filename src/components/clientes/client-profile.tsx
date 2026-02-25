'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Client, Profile, OnboardingChecklistItem, Task, Advance90Phase, Payment, ClientAsset, ActivityLogEntry, UserRole, ClientForm as ClientFormType } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusChip } from '@/components/shared/status-chip'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_COLORS, SERVICE_LABELS, TASK_STATUS_LABELS, TASK_STATUS_COLORS, PAYMENT_METHOD_LABELS } from '@/lib/constants'
import { formatDate, formatDateTime } from '@/lib/utils/dates'
import { formatUSD } from '@/lib/utils/currency'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toggleOnboardingItem, updateClientStatus, updateTaskStatus, addClientNote } from '@/lib/actions/clients'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, ExternalLink, MessageCircle, PlusCircle } from 'lucide-react'
import { Advance90Timeline } from './advance90-timeline'
import { BusinessForm } from './business-form'

interface ClientProfileProps {
  client: Client & { deal?: unknown; set?: unknown; assigned_member?: Pick<Profile, 'id' | 'full_name'> | null }
  onboarding: OnboardingChecklistItem[]
  tasks: (Task & { assigned_member?: Pick<Profile, 'id' | 'full_name'> | null })[]
  phases: Advance90Phase[]
  payments: (Payment & { commissions?: unknown[] })[]
  assets: ClientAsset[]
  activityLog: ActivityLogEntry[]
  teamMembers: Pick<Profile, 'id' | 'full_name' | 'role'>[]
  userRole: UserRole
  clientForm?: ClientFormType | null
}

export function ClientProfile({
  client,
  onboarding,
  tasks,
  phases,
  payments,
  assets,
  activityLog,
  teamMembers,
  userRole,
  clientForm,
}: ClientProfileProps) {
  const router = useRouter()

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount_gross), 0)
  const totalNet = payments.reduce((sum, p) => sum + Number(p.amount_net), 0)

  async function handleOnboardingToggle(itemId: string, checked: boolean) {
    try {
      await toggleOnboardingItem(itemId, checked)
      router.refresh()
    } catch {
      toast.error('Error al actualizar')
    }
  }

  async function handleStatusChange(status: string) {
    try {
      await updateClientStatus(client.id, status)
      toast.success('Estado actualizado')
      router.refresh()
    } catch {
      toast.error('Error al actualizar estado')
    }
  }

  async function handleTaskStatusChange(taskId: string, status: string) {
    try {
      await updateTaskStatus(taskId, status)
      router.refresh()
    } catch {
      toast.error('Error al actualizar tarea')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/clientes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{client.business_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusChip label={CLIENT_STATUS_LABELS[client.status]} colorClass={CLIENT_STATUS_COLORS[client.status]} />
            <span className="text-sm text-muted-foreground">{SERVICE_LABELS[client.service as keyof typeof SERVICE_LABELS]}</span>
          </div>
        </div>
        <Select defaultValue={client.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-surface-2">
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="pausado">Pausado</SelectItem>
            <SelectItem value="completado">Completado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="formulario">Formulario</TabsTrigger>
          <TabsTrigger value="tareas">Tareas</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="medicion">Ventas & Medición</TabsTrigger>
          {(userRole === 'admin' || userRole === 'closer') && (
            <TabsTrigger value="pagos">Pagos</TabsTrigger>
          )}
          <TabsTrigger value="actividad">Actividad</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface-1 p-4">
              <p className="text-sm text-muted-foreground">Contacto</p>
              <p className="mt-1 font-medium">{client.contact_name}</p>
              <div className="mt-2 flex gap-2">
                <a href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" /> WA
                </a>
                <a href={`https://instagram.com/${client.ig}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> IG
                </a>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface-1 p-4">
              <p className="text-sm text-muted-foreground">Responsable</p>
              <p className="mt-1 font-medium">{client.assigned_member?.full_name ?? 'Sin asignar'}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-1 p-4">
              <p className="text-sm text-muted-foreground">Cash collected</p>
              <p className="mt-1 text-xl font-bold">{formatUSD(totalCollected)}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-1 p-4">
              <p className="text-sm text-muted-foreground">Tareas pendientes</p>
              <p className="mt-1 text-xl font-bold">{tasks.filter((t) => t.status !== 'listo').length}</p>
            </div>
          </div>

          {phases.length > 0 && (
            <div className="rounded-xl border border-border bg-surface-1 p-4">
              <h3 className="text-sm font-medium mb-3">Cronograma Advance90</h3>
              <Advance90Timeline phases={phases} startDate={client.created_at} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="onboarding" className="mt-4">
          <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-3">
            <h3 className="text-sm font-medium">Checklist de onboarding</h3>
            {onboarding.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin items de onboarding.</p>
            ) : (
              onboarding.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={(checked) => handleOnboardingToggle(item.id, !!checked)}
                  />
                  <span className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {item.label}
                  </span>
                  {item.completed_at && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatDate(item.completed_at)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="formulario" className="mt-4">
          <BusinessForm clientId={client.id} existingForm={clientForm} />
        </TabsContent>

        <TabsContent value="tareas" className="mt-4">
          <div className="rounded-xl border border-border bg-surface-1 overflow-hidden">
            {tasks.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Sin tareas.</p>
            ) : (
              <div className="divide-y divide-border">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3">
                    <Select defaultValue={task.status} onValueChange={(v) => handleTaskStatusChange(task.id, v)}>
                      <SelectTrigger className="w-32 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-3">
                        {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm flex-1">{task.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {task.assigned_member?.full_name ?? '—'}
                    </span>
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground">{formatDate(task.due_date)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="assets" className="mt-4">
          <div className="rounded-xl border border-border bg-surface-1 p-4">
            {assets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin assets. Los archivos se agregarán aquí.</p>
            ) : (
              <div className="space-y-2">
                {assets.map((asset) => (
                  <div key={asset.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2">
                    <StatusChip label={asset.type} colorClass="bg-muted text-muted-foreground" />
                    <span className="text-sm flex-1">{asset.name}</span>
                    <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      Ver
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="medicion" className="mt-4 space-y-4">
          <MedicionTab clientId={client.id} activityLog={activityLog} />
        </TabsContent>

        {(userRole === 'admin' || userRole === 'closer') && (
          <TabsContent value="pagos" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface-1 p-4">
                <p className="text-sm text-muted-foreground">Total bruto</p>
                <p className="mt-1 text-xl font-bold">{formatUSD(totalCollected)}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-1 p-4">
                <p className="text-sm text-muted-foreground">Total neto</p>
                <p className="mt-1 text-xl font-bold">{formatUSD(totalNet)}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-1 p-4">
                <p className="text-sm text-muted-foreground">Pagos registrados</p>
                <p className="mt-1 text-xl font-bold">{payments.length}</p>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface-1 overflow-hidden">
              {payments.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Sin pagos registrados.</p>
              ) : (
                <div className="divide-y divide-border">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 text-sm">
                      <span className="font-medium">{formatUSD(p.amount_gross)}</span>
                      <StatusChip label={PAYMENT_METHOD_LABELS[p.payment_method]} colorClass="bg-muted text-muted-foreground" />
                      {p.fee_amount > 0 && (
                        <span className="text-xs text-destructive">-{formatUSD(p.fee_amount)} fee</span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">{formatDate(p.payment_date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        )}

        <TabsContent value="actividad" className="mt-4">
          <div className="rounded-xl border border-border bg-surface-1 p-4">
            <ActivityTimeline entries={activityLog} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MedicionTab({ clientId, activityLog }: { clientId: string; activityLog: ActivityLogEntry[] }) {
  const router = useRouter()
  const [noteType, setNoteType] = useState<string>('audit_note')
  const [noteContent, setNoteContent] = useState('')
  const [saving, setSaving] = useState(false)

  const noteTypes = {
    audit_note: 'Nota de auditoría',
    measurement: 'Medición / KPI',
    learning: 'Aprendizaje',
    sales_note: 'Nota de ventas',
  }

  const notes = activityLog.filter((e) =>
    ['audit_note', 'measurement', 'learning', 'sales_note'].includes(e.action)
  )

  async function handleAddNote() {
    if (!noteContent.trim()) return
    setSaving(true)
    try {
      await addClientNote(clientId, noteType, noteContent.trim())
      setNoteContent('')
      router.refresh()
    } catch {
      // error handled silently, toast could be added
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-3">
        <h3 className="text-sm font-medium">Agregar nota</h3>
        <div className="flex gap-2">
          <Select value={noteType} onValueChange={setNoteType}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface-2">
              {Object.entries(noteTypes).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder="Escribí la nota, resultado de auditoría o aprendizaje..."
          rows={3}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleAddNote} disabled={saving || !noteContent.trim()}>
            <PlusCircle className="h-4 w-4 mr-1" />
            {saving ? 'Guardando...' : 'Agregar nota'}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-3">
        <h3 className="text-sm font-medium">Historial de notas y mediciones</h3>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay notas de ventas o medición aún. Agregá la primera arriba.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="rounded-lg bg-surface-2 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <StatusChip
                    label={noteTypes[note.action as keyof typeof noteTypes] ?? note.action}
                    colorClass="bg-muted text-muted-foreground"
                  />
                  <span className="text-xs text-muted-foreground ml-auto">
                    {note.user?.full_name ?? 'Sistema'} — {formatDateTime(note.created_at)}
                  </span>
                </div>
                <p className="text-sm">{(note.details as Record<string, string>)?.content ?? ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
