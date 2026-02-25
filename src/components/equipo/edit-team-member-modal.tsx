'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { teamMemberSchema, type TeamMemberFormData } from '@/lib/schemas'
import { updateTeamMember } from '@/lib/actions/team'
import type { Profile } from '@/types'
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
import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface EditTeamMemberModalProps {
  member: Profile | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditTeamMemberModal({ member, open, onOpenChange }: EditTeamMemberModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<TeamMemberFormData>({
    resolver: zodResolver(teamMemberSchema),
    values: member
      ? {
          full_name: member.full_name,
          whatsapp: member.whatsapp,
          role: member.role,
          salary: member.salary,
          salary_notes: member.salary_notes ?? '',
          admin_notes: member.admin_notes ?? '',
        }
      : undefined,
  })

  if (!member) return null

  async function onSubmit(data: TeamMemberFormData) {
    setLoading(true)
    try {
      await updateTeamMember(member!.id, data)
      toast.success('Miembro actualizado')
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Error al actualizar miembro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-2 border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Editar miembro</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre completo <span className="text-destructive">*</span></Label>
            <Input {...register('full_name')} />
            {errors.full_name && (
              <p className="text-xs text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>WhatsApp <span className="text-destructive">*</span></Label>
            <Input {...register('whatsapp')} />
            {errors.whatsapp && (
              <p className="text-xs text-destructive">{errors.whatsapp.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Rol <span className="text-destructive">*</span></Label>
            <Select
              defaultValue={member.role}
              onValueChange={(v) => setValue('role', v as TeamMemberFormData['role'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-3">
                <SelectItem value="setter">Setter</SelectItem>
                <SelectItem value="closer">Closer</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Salario (USD)</Label>
            <Input
              type="number"
              step="0.01"
              {...register('salary', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label>Notas salario</Label>
            <Textarea {...register('salary_notes')} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Notas internas</Label>
            <Textarea {...register('admin_notes')} rows={2} />
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
