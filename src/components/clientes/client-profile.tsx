'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Client, Profile, OnboardingChecklistItem, Advance90Phase, Payment, ClientAsset, ActivityLogEntry, UserRole, ClientForm as ClientFormType } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusChip } from '@/components/shared/status-chip'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_COLORS, SERVICE_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/constants'
import { formatDate, formatDateTime } from '@/lib/utils/dates'
import { formatUSD } from '@/lib/utils/currency'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toggleOnboardingItem, updateClientStatus, addClientNote, createClientAsset } from '@/lib/actions/clients'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, ExternalLink, MessageCircle, PlusCircle, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Advance90Timeline } from './advance90-timeline'
import { BusinessForm } from './business-form'

interface ClientProfileProps {
  client: Client & { deal?: unknown; set?: unknown; assigned_member?: Pick<Profile, 'id' | 'full_name'> | null }
  onboarding: OnboardingChecklistItem[]
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

  const deal = client.deal as { revenue_total?: number } | undefined
  const revenueTotal = Number(deal?.revenue_total ?? 0)
  const saldo = Math.max(0, revenueTotal - totalCollected)

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
                {client.web && (
                  <a href={client.web} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> Web
                  </a>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface-1 p-4">
              <p className="text-sm text-muted-foreground">Responsable</p>
              <p className="mt-1 font-medium">{client.assigned_member?.full_name ?? 'Sin asignar'}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-1 p-4">
              <p className="text-sm text-muted-foreground">Cash collected</p>
              <p className="mt-1 text-xl font-bold">{formatUSD(totalCollected)}</p>
              {revenueTotal > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">Revenue: {formatUSD(revenueTotal)}</p>
              )}
            </div>
            <div className="rounded-xl border border-border bg-surface-1 p-4">
              <p className="text-sm text-muted-foreground">Saldo pendiente</p>
              <p className={`mt-1 text-xl font-bold ${saldo > 0 ? 'text-warning' : 'text-success'}`}>
                {saldo > 0 ? formatUSD(saldo) : 'Pagado'}
              </p>
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

        <TabsContent value="assets" className="mt-4 space-y-4">
          <AssetsSection clientId={client.id} assets={assets} />
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
      // error handled silently
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
            <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-surface-2">
              {Object.entries(noteTypes).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
          <p className="text-sm text-muted-foreground">No hay notas de ventas o medición aún.</p>
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

function AssetsSection({ clientId, assets }: { clientId: string; assets: ClientAsset[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [assetUrl, setAssetUrl] = useState('')
  const [assetName, setAssetName] = useState('')
  const [assetType, setAssetType] = useState('link')
  const [assetNotes, setAssetNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const autoAssets = assets.filter((a) => a.notes?.includes('Auto-generado'))
  const manualAssets = assets.filter((a) => !a.notes?.includes('Auto-generado'))

  async function handleAddAsset() {
    if (!assetUrl.trim() || !assetName.trim()) return
    setSaving(true)
    try {
      await createClientAsset(clientId, { type: assetType, name: assetName.trim(), url: assetUrl.trim(), notes: assetNotes.trim() || undefined })
      setAssetUrl('')
      setAssetName('')
      setAssetNotes('')
      setShowForm(false)
      router.refresh()
      toast.success('Asset agregado')
    } catch {
      toast.error('Error al agregar asset')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {autoAssets.length > 0 && (
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <h3 className="text-sm font-medium mb-2">Generados por el sistema</h3>
          <div className="space-y-2">
            {autoAssets.map((asset) => (
              <div key={asset.id} className="rounded-lg bg-surface-2 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <StatusChip label={asset.name} colorClass="bg-info/15 text-info" size="sm" />
                  <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(asset.created_at)}</span>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{asset.url}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Links / archivos</h3>
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Agregar asset
          </Button>
        </div>

        {showForm && (
          <div className="rounded-lg border border-border bg-surface-2 p-3 mb-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Nombre</Label>
                <Input value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="Guión R1" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={assetType} onValueChange={setAssetType}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-surface-3">
                    <SelectItem value="guion">Guión</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="diseno">Diseño</SelectItem>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">URL</Label>
              <Input value={assetUrl} onChange={(e) => setAssetUrl(e.target.value)} placeholder="https://..." className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nota (opcional)</Label>
              <Input value={assetNotes} onChange={(e) => setAssetNotes(e.target.value)} placeholder="Descripción breve" className="h-8 text-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleAddAsset} disabled={saving || !assetUrl.trim() || !assetName.trim()}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        )}

        {manualAssets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin assets manuales. Agregá un link arriba.</p>
        ) : (
          <div className="space-y-2">
            {manualAssets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2">
                <StatusChip label={asset.type} colorClass="bg-muted text-muted-foreground" />
                <span className="text-sm flex-1">{asset.name}</span>
                {asset.notes && <span className="text-xs text-muted-foreground max-w-[120px] truncate">{asset.notes}</span>}
                <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                  Ver
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
