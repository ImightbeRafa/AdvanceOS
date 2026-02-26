'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { paymentSchema, type PaymentFormData } from '@/lib/schemas'
import { registerPayment } from '@/lib/actions/payments'
import { calculateTilopayFee } from '@/lib/utils/currency'
import { formatUSD } from '@/lib/utils/currency'
import type { Set } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { todayCR } from '@/lib/utils/dates'

interface PaymentModalProps {
  set: Set
  clientId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentModal({ set, clientId, open, onOpenChange }: PaymentModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_date: todayCR(),
    },
  })

  const method = watch('payment_method')
  const gross = watch('amount_gross')
  const months = watch('tilopay_installment_months')

  const preview = method === 'tilopay' && months && gross
    ? calculateTilopayFee(gross, months)
    : null

  async function onSubmit(data: PaymentFormData) {
    setLoading(true)
    try {
      await registerPayment(set.id, clientId, data)
      toast.success('Pago registrado')
      onOpenChange(false)
      router.refresh()
    } catch (e) {
      toast.error('Error al registrar pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-2 border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago — {set.prospect_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Monto cobrado (USD) <span className="text-destructive">*</span></Label>
            <Input type="number" step="0.01" {...register('amount_gross', { valueAsNumber: true })} />
            {errors.amount_gross && <p className="text-xs text-destructive">{errors.amount_gross.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Método de pago <span className="text-destructive">*</span></Label>
            <Select onValueChange={(v) => setValue('payment_method', v as PaymentFormData['payment_method'])}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent className="bg-surface-3">
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="sinpe">SINPE</SelectItem>
                <SelectItem value="tilopay">Tilopay</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
            {errors.payment_method && <p className="text-xs text-destructive">{errors.payment_method.message}</p>}
          </div>

          {method === 'tilopay' && (
            <div className="space-y-2">
              <Label>Cuotas Tilopay</Label>
              <Select onValueChange={(v) => setValue('tilopay_installment_months', Number(v))}>
                <SelectTrigger><SelectValue placeholder="Sin cuotas" /></SelectTrigger>
                <SelectContent className="bg-surface-3">
                  <SelectItem value="3">3 meses (7.5% fee)</SelectItem>
                  <SelectItem value="6">6 meses (10% fee)</SelectItem>
                  <SelectItem value="12">12 meses (14% fee)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {preview && (
            <div className="rounded-lg border border-border bg-surface-1 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee banco</span>
                <span className="text-destructive">-{formatUSD(preview.feeAmount)} ({(preview.feePercentage * 100).toFixed(1)}%)</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Neto recibido</span>
                <span>{formatUSD(preview.netAmount)}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Fecha de pago <span className="text-destructive">*</span></Label>
            <Input type="date" {...register('payment_date')} />
            {errors.payment_date && <p className="text-xs text-destructive">{errors.payment_date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea {...register('notes')} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar pago'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
