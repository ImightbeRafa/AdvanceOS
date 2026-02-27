'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { adSpendSchema, type AdSpendFormData } from '@/lib/schemas'
import { createAdSpend, updateAdSpend } from '@/lib/actions/accounting'
import type { AdSpend } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { todayCR } from '@/lib/utils/dates'

interface AdSpendModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  adSpend?: AdSpend | null
}

export function AdSpendModal({ open, onOpenChange, adSpend }: AdSpendModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isEditing = !!adSpend

  const today = todayCR()

  const { register, handleSubmit, formState: { errors } } = useForm<AdSpendFormData>({
    resolver: zodResolver(adSpendSchema),
    ...(isEditing
      ? {
          values: {
            period_start: adSpend.period_start,
            period_end: adSpend.period_end,
            amount_usd: adSpend.amount_usd,
            platform: adSpend.platform,
            notes: adSpend.notes ?? '',
          },
        }
      : {
          defaultValues: {
            period_start: today,
            period_end: today,
            platform: 'Meta Ads',
          },
        }),
  })

  async function onSubmit(data: AdSpendFormData) {
    setLoading(true)
    try {
      if (isEditing) {
        await updateAdSpend(adSpend.id, data)
        toast.success('Ad spend actualizado')
      } else {
        await createAdSpend(data)
        toast.success('Ad spend registrado')
      }
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error(isEditing ? 'Error al actualizar ad spend' : 'Error al registrar ad spend')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-2 border-border max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Ad Spend' : 'Registrar Ad Spend'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Plataforma <span className="text-destructive">*</span></Label>
            <Input {...register('platform')} placeholder="Meta Ads, Google Ads..." />
            {errors.platform && <p className="text-xs text-destructive">{errors.platform.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Monto (USD) <span className="text-destructive">*</span></Label>
            <Input type="number" step="0.01" {...register('amount_usd', { valueAsNumber: true })} />
            {errors.amount_usd && <p className="text-xs text-destructive">{errors.amount_usd.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Inicio del periodo <span className="text-destructive">*</span></Label>
              <Input type="date" {...register('period_start')} />
              {errors.period_start && <p className="text-xs text-destructive">{errors.period_start.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Fin del periodo <span className="text-destructive">*</span></Label>
              <Input type="date" {...register('period_end')} />
              {errors.period_end && <p className="text-xs text-destructive">{errors.period_end.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Input {...register('notes')} placeholder="Opcional" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : isEditing ? 'Guardar' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
