'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { expenseSchema, type ExpenseFormData } from '@/lib/schemas'
import { createExpense, updateExpense } from '@/lib/actions/accounting'
import type { Expense } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { todayCR } from '@/lib/utils/dates'

interface ExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: Expense | null
}

export function ExpenseModal({ open, onOpenChange, expense }: ExpenseModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isEditing = !!expense

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    ...(isEditing
      ? {
          values: {
            category: expense.category,
            description: expense.description,
            amount_usd: expense.amount_usd,
            date: expense.date,
            recurring: expense.recurring,
          },
        }
      : {
          defaultValues: {
            date: todayCR(),
            recurring: false,
          },
        }),
  })

  async function onSubmit(data: ExpenseFormData) {
    setLoading(true)
    try {
      if (isEditing) {
        await updateExpense(expense.id, data)
        toast.success('Gasto actualizado')
      } else {
        await createExpense(data)
        toast.success('Gasto registrado')
      }
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error(isEditing ? 'Error al actualizar gasto' : 'Error al registrar gasto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-2 border-border max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar gasto' : 'Registrar gasto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Categoría <span className="text-destructive">*</span></Label>
            <Select
              defaultValue={expense?.category}
              onValueChange={(v) => setValue('category', v as ExpenseFormData['category'])}
            >
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent className="bg-surface-3">
                <SelectItem value="ads">Ads / Pauta</SelectItem>
                <SelectItem value="software">Software</SelectItem>
                <SelectItem value="oficina">Oficina</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Descripción <span className="text-destructive">*</span></Label>
            <Input {...register('description')} />
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

          <div className="flex items-center gap-2">
            <Checkbox
              id="recurring"
              defaultChecked={expense?.recurring}
              onCheckedChange={(checked) => setValue('recurring', !!checked)}
            />
            <Label htmlFor="recurring" className="text-sm">Gasto recurrente</Label>
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
