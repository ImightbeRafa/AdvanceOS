'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { closeDealSchema, followUpSchema, disqualifySchema } from '@/lib/schemas'
import type { CloseDealFormData, FollowUpFormData, DisqualifyFormData } from '@/lib/schemas'
import { createDealClosed, createDealFollowUp, createDealDisqualified } from '@/lib/actions/sets'
import type { Set } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface DealModalProps {
  set: Set
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DealModal({ set, open, onOpenChange }: DealModalProps) {
  const router = useRouter()
  const [tab, setTab] = useState<string>('closed')
  const [loading, setLoading] = useState(false)

  const closeForm = useForm<CloseDealFormData>({
    resolver: zodResolver(closeDealSchema),
  })
  const followUpForm = useForm<FollowUpFormData>({
    resolver: zodResolver(followUpSchema),
  })
  const disqualifyForm = useForm<DisqualifyFormData>({
    resolver: zodResolver(disqualifySchema),
  })

  const paymentMethod = closeForm.watch('payment_method')

  async function handleClosed(data: CloseDealFormData) {
    setLoading(true)
    try {
      await createDealClosed(set.id, data)
      toast.success('Deal cerrado — cliente creado')
      onOpenChange(false)
      router.refresh()
    } catch (e) {
      toast.error('Error al cerrar deal')
    } finally {
      setLoading(false)
    }
  }

  async function handleFollowUp(data: FollowUpFormData) {
    setLoading(true)
    try {
      await createDealFollowUp(set.id, data)
      toast.success('Follow up programado')
      onOpenChange(false)
      router.refresh()
    } catch (e) {
      toast.error('Error al crear follow up')
    } finally {
      setLoading(false)
    }
  }

  async function handleDisqualify(data: DisqualifyFormData) {
    setLoading(true)
    try {
      await createDealDisqualified(set.id, data)
      toast.success('Set descalificado')
      onOpenChange(false)
      router.refresh()
    } catch (e) {
      toast.error('Error al descalificar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-2 border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resultado de llamada — {set.prospect_name}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="closed">Closed</TabsTrigger>
            <TabsTrigger value="follow_up">Follow Up</TabsTrigger>
            <TabsTrigger value="descalificado">Descalificado</TabsTrigger>
          </TabsList>

          <TabsContent value="closed" className="mt-4">
            <form onSubmit={closeForm.handleSubmit(handleClosed)} className="space-y-4">
              <div className="space-y-2">
                <Label>Servicio vendido <span className="text-destructive">*</span></Label>
                <Select onValueChange={(v) => closeForm.setValue('service_sold', v as CloseDealFormData['service_sold'])}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent className="bg-surface-3">
                    <SelectItem value="advance90">Advance90</SelectItem>
                    <SelectItem value="meta_advance">Meta Advance</SelectItem>
                    <SelectItem value="retencion">Retención</SelectItem>
                  </SelectContent>
                </Select>
                {closeForm.formState.errors.service_sold && <p className="text-xs text-destructive">{closeForm.formState.errors.service_sold.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Revenue total (USD) <span className="text-destructive">*</span></Label>
                <Input type="number" step="0.01" {...closeForm.register('revenue_total', { valueAsNumber: true })} />
                {closeForm.formState.errors.revenue_total && <p className="text-xs text-destructive">{closeForm.formState.errors.revenue_total.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Monto cobrado hoy (USD)</Label>
                <Input type="number" step="0.01" {...closeForm.register('amount_collected', { valueAsNumber: true })} />
              </div>

              <div className="space-y-2">
                <Label>Método de pago</Label>
                <Select onValueChange={(v) => closeForm.setValue('payment_method', v as CloseDealFormData['payment_method'])}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent className="bg-surface-3">
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="sinpe">SINPE</SelectItem>
                    <SelectItem value="tilopay">Tilopay</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === 'tilopay' && (
                <div className="space-y-2">
                  <Label>Cuotas Tilopay</Label>
                  <Select onValueChange={(v) => closeForm.setValue('tilopay_installment_months', Number(v))}>
                    <SelectTrigger><SelectValue placeholder="Sin cuotas" /></SelectTrigger>
                    <SelectContent className="bg-surface-3">
                      <SelectItem value="3">3 meses (7.5% fee)</SelectItem>
                      <SelectItem value="6">6 meses (10% fee)</SelectItem>
                      <SelectItem value="12">12 meses (14% fee)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Link Phantom (grabación)</Label>
                <Input placeholder="https://..." {...closeForm.register('phantom_link')} />
              </div>

              <div className="space-y-2">
                <Label>Notas del closer</Label>
                <Textarea {...closeForm.register('closer_notes')} rows={2} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Cerrando...' : 'Cerrar deal'}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="follow_up" className="mt-4">
            <form onSubmit={followUpForm.handleSubmit(handleFollowUp)} className="space-y-4">
              <div className="space-y-2">
                <Label>¿Qué pasó? <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="Describí qué pasó en la llamada"
                  {...followUpForm.register('follow_up_notes')}
                  rows={3}
                />
                {followUpForm.formState.errors.follow_up_notes && <p className="text-xs text-destructive">{followUpForm.formState.errors.follow_up_notes.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Fecha de follow up <span className="text-destructive">*</span></Label>
                <Input type="datetime-local" {...followUpForm.register('follow_up_date')} />
                {followUpForm.formState.errors.follow_up_date && <p className="text-xs text-destructive">{followUpForm.formState.errors.follow_up_date.message}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Guardando...' : 'Programar follow up'}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="descalificado" className="mt-4">
            <form onSubmit={disqualifyForm.handleSubmit(handleDisqualify)} className="space-y-4">
              <div className="space-y-2">
                <Label>Razón de descalificación <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="¿Por qué se descalificó?"
                  {...disqualifyForm.register('disqualified_reason')}
                  rows={3}
                />
                {disqualifyForm.formState.errors.disqualified_reason && <p className="text-xs text-destructive">{disqualifyForm.formState.errors.disqualified_reason.message}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" variant="destructive" disabled={loading}>
                  {loading ? 'Descalificando...' : 'Descalificar'}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
