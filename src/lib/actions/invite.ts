'use server'

import { createClient, createServiceClient, getAuthProfile } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { InviteFormData } from '@/lib/schemas'

export async function inviteUser(data: InviteFormData) {
  const { user, profile } = await getAuthProfile()
  if (!user || !profile) throw new Error('No autenticado')
  if (profile.role !== 'admin') throw new Error('Sin permisos')

  const serviceClient = await createServiceClient()

  const { data: inviteData, error } = await serviceClient.auth.admin.inviteUserByEmail(
    data.email,
    {
      data: {
        full_name: data.full_name,
        role: data.role,
      },
    }
  )

  if (error) {
    if (error.message?.includes('already been registered')) {
      throw new Error('Este email ya está registrado')
    }
    throw new Error(error.message)
  }

  const supabase = await createClient()
  await supabase.from('activity_log').insert({
    entity_type: 'invite',
    entity_id: inviteData.user?.id ?? '00000000-0000-0000-0000-000000000000',
    action: 'created',
    user_id: user.id,
    details: { email: data.email, role: data.role, full_name: data.full_name },
  })

  revalidatePath('/equipo')
}
