'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createSetSchema, type CreateSetFormData } from '@/lib/schemas'
import { updateSet } from '@/lib/actions/sets'
import type { Set, Profile } from '@/types'
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
import { useRouter } from 'next/navigation'

interface EditSetModalProps {
  set: Set | null
  open: boolean
  onOpenChange: (open: boolean) => void
  closers: Pick<Profile, 'id' | 'full_name'>[]
}

export function EditSetModal({ set, open, onOpenChange, closers }: EditSetModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreateSetFormData>({
    resolver: zodResolver(createSetSchema),
    values: set
      ? {
          prospect_name: set.prospect_name,
          prospect_whatsapp: set.prospect_whatsapp,
          prospect_ig: set.prospect_ig,
          prospect_web: set.prospect_web ?? '',
          closer_id: set.closer_id,
          scheduled_at: set.scheduled_at.slice(0, 16),
          summary: set.summary,
          service_offered: set.service_offered,
        }
      : undefined,
  })

  if (!set) return null

  async function onSubmit(data: CreateSetFormData) {
    setLoading(true)
    try {
      await updateSet(set!.id, data)
      toast.success('Set actualizado')
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Error al actualizar el set')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-2 border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar set</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del prospecto <span className="text-destructive">*</span></Label>
            <Input {...register('prospect_name')} />
            {errors.prospect_name && <p className="text-xs text-destructive">{errors.prospect_name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>WhatsApp <span className="text-destructive">*</span></Label>
            <Input {...register('prospect_whatsapp')} />
            {errors.prospect_whatsapp && <p className="text-xs text-destructive">{errors.prospect_whatsapp.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Instagram del negocio <span className="text-destructive">*</span></Label>
            <Input {...register('prospect_ig')} />
            {errors.prospect_ig && <p className="text-xs text-destructive">{errors.prospect_ig.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Web</Label>
            <Input {...register('prospect_web')} />
            {errors.prospect_web && <p className="text-xs text-destructive">{errors.prospect_web.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Closer asignado <span className="text-destructive">*</span></Label>
            <Select defaultValue={set.closer_id} onValueChange={(v) => setValue('closer_id', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-3">
                {closers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.closer_id && <p className="text-xs text-destructive">{errors.closer_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Fecha y hora agendada <span className="text-destructive">*</span></Label>
            <Input type="datetime-local" {...register('scheduled_at')} />
            {errors.scheduled_at && <p className="text-xs text-destructive">{errors.scheduled_at.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Servicio ofrecido <span className="text-destructive">*</span></Label>
            <Select defaultValue={set.service_offered} onValueChange={(v) => setValue('service_offered', v as 'advance90' | 'meta_advance')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-3">
                <SelectItem value="advance90">Advance90</SelectItem>
                <SelectItem value="meta_advance">Meta Advance</SelectItem>
              </SelectContent>
            </Select>
            {errors.service_offered && <p className="text-xs text-destructive">{errors.service_offered.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Resumen de situación <span className="text-destructive">*</span></Label>
            <Textarea {...register('summary')} rows={3} />
            {errors.summary && <p className="text-xs text-destructive">{errors.summary.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
