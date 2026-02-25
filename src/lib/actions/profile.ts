'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProfileEditFormData } from '@/lib/schemas'

export async function updateProfile(data: ProfileEditFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: data.full_name,
      whatsapp: data.whatsapp,
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/ajustes')
  revalidatePath('/')
}

export async function changePassword(newPassword: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}
