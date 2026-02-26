'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { manualTransactionSchema, type ManualTransactionFormData } from '@/lib/schemas'
import { createManualTransaction } from '@/lib/actions/accounting'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface ManualTransactionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManualTransactionModal({ open, onOpenChange }: ManualTransactionModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<ManualTransactionFormData>({
    resolver: zodResolver(manualTransactionSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      type: 'ingreso',
    },
  })

  async function onSubmit(data: ManualTransactionFormData) {
    setLoading(true)
    try {
      await createManualTransaction(data)
      toast.success(data.type === 'ingreso' ? 'Ingreso registrado' : 'Egreso registrado')
      reset({ date: new Date().toISOString().split('T')[0], type: 'ingreso' })
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Error al registrar movimiento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-2 border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar movimiento manual</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo <span className="text-destructive">*</span></Label>
            <Select defaultValue="ingreso" onValueChange={(v) => setValue('type', v as ManualTransactionFormData['type'])}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent className="bg-surface-3">
                <SelectItem value="ingreso">Ingreso (plata que entra)</SelectItem>
                <SelectItem value="egreso">Egreso (plata que sale)</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Descripción <span className="text-destructive">*</span></Label>
            <Input placeholder="Ej: Inversión, préstamo, ajuste..." {...register('description')} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Monto (USD) <span className="text-destructive">*</span></Label>
            <Input type="number" step="0.01" {...register('amount_usd', { valueAsNumber: true })} />
            {errors.amount_usd && <p className="text-xs text-destructive">{errors.amount_usd.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Fecha <span className="text-destructive">*</span></Label>
            <Input type="date" {...register('date')} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea placeholder="Opcional" rows={2} {...register('notes')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
