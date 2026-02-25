'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  profileEditSchema,
  passwordChangeSchema,
  type ProfileEditFormData,
  type PasswordChangeFormData,
} from '@/lib/schemas'
import { updateProfile, changePassword } from '@/lib/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { StatusChip } from '@/components/shared/status-chip'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants'
import { toast } from 'sonner'
import type { Profile } from '@/types'

interface AjustesFormProps {
  profile: Profile
}

export function AjustesForm({ profile }: AjustesFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileEditFormData>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      full_name: profile.full_name,
      whatsapp: profile.whatsapp,
    },
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
  })

  async function onProfileSubmit(data: ProfileEditFormData) {
    setSaving(true)
    try {
      await updateProfile(data)
      toast.success('Perfil actualizado')
      router.refresh()
    } catch {
      toast.error('Error al actualizar perfil')
    } finally {
      setSaving(false)
    }
  }

  async function onPasswordSubmit(data: PasswordChangeFormData) {
    setChangingPassword(true)
    try {
      await changePassword(data.new_password)
      toast.success('Contraseña actualizada')
      resetPasswordForm()
    } catch {
      toast.error('Error al cambiar contraseña')
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Profile info card */}
      <div className="rounded-xl border border-border bg-surface-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Información del perfil</h2>
          <StatusChip label={ROLE_LABELS[profile.role]} colorClass={ROLE_COLORS[profile.role]} />
        </div>

        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile.email ?? ''} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground">El email no se puede cambiar.</p>
          </div>

          <div className="space-y-2">
            <Label>Nombre completo <span className="text-destructive">*</span></Label>
            <Input {...registerProfile('full_name')} />
            {profileErrors.full_name && (
              <p className="text-xs text-destructive">{profileErrors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>WhatsApp <span className="text-destructive">*</span></Label>
            <Input {...registerProfile('whatsapp')} placeholder="+506 8888 8888" />
            {profileErrors.whatsapp && (
              <p className="text-xs text-destructive">{profileErrors.whatsapp.message}</p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </div>

      <Separator />

      {/* Password change card */}
      <div className="rounded-xl border border-border bg-surface-1 p-6">
        <h2 className="text-lg font-semibold mb-4">Cambiar contraseña</h2>

        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nueva contraseña <span className="text-destructive">*</span></Label>
            <Input type="password" {...registerPassword('new_password')} />
            {passwordErrors.new_password && (
              <p className="text-xs text-destructive">{passwordErrors.new_password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Confirmar contraseña <span className="text-destructive">*</span></Label>
            <Input type="password" {...registerPassword('confirm_password')} />
            {passwordErrors.confirm_password && (
              <p className="text-xs text-destructive">{passwordErrors.confirm_password.message}</p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={changingPassword} variant="outline">
              {changingPassword ? 'Cambiando...' : 'Cambiar contraseña'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
