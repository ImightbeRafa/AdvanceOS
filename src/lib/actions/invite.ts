'use server'

import { createClient, createServiceClient, getAuthProfile } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { InviteFormData } from '@/lib/schemas'

async function getOrigin() {
  const headersList = await headers()
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    headersList.get('origin') ||
    headersList.get('x-forwarded-host') ||
    'http://localhost:3000'
  )
}

async function requireAdmin() {
  const { user, profile } = await getAuthProfile()
  if (!user || !profile) throw new Error('No autenticado')
  if (profile.role !== 'admin') throw new Error('Sin permisos')
  return { user, profile }
}

export async function inviteUser(data: InviteFormData) {
  const { user } = await requireAdmin()
  const origin = await getOrigin()
  const serviceClient = await createServiceClient()

  const { data: inviteData, error } = await serviceClient.auth.admin.inviteUserByEmail(
    data.email,
    {
      data: {
        full_name: data.full_name,
        role: data.role,
      },
      redirectTo: `${origin}/auth/callback`,
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

export async function resendInvite(memberId: string, email: string) {
  const { user } = await requireAdmin()
  const origin = await getOrigin()
  const serviceClient = await createServiceClient()

  const { error } = await serviceClient.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: `${origin}/auth/callback` }
  )

  if (error) throw new Error(error.message)

  const supabase = await createClient()
  await supabase.from('activity_log').insert({
    entity_type: 'invite',
    entity_id: memberId,
    action: 'resent',
    user_id: user.id,
    details: { email },
  })

  revalidatePath('/equipo')
}

export async function deleteUser(memberId: string) {
  const { user } = await requireAdmin()
  if (memberId === user.id) throw new Error('No podés eliminarte a vos mismo')

  const serviceClient = await createServiceClient()

  const { data: member } = await serviceClient
    .from('profiles')
    .select('email, full_name')
    .eq('id', memberId)
    .single()

  const { error: profileError } = await serviceClient
    .from('profiles')
    .delete()
    .eq('id', memberId)

  if (profileError) throw new Error(profileError.message)

  const { error: authError } = await serviceClient.auth.admin.deleteUser(memberId)
  if (authError) throw new Error(authError.message)

  await serviceClient.from('activity_log').insert({
    entity_type: 'profile',
    entity_id: memberId,
    action: 'deleted',
    user_id: user.id,
    details: { email: member?.email, full_name: member?.full_name },
  })

  revalidatePath('/equipo')
}
