'use server'

import { createServiceClient, getAuthProfile } from '@/lib/supabase/server'
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

export async function inviteUser(data: InviteFormData): Promise<{ link?: string }> {
  const { user } = await requireAdmin()
  const origin = await getOrigin()
  const serviceClient = await createServiceClient()

  const inviteOptions = {
    data: { full_name: data.full_name, role: data.role },
    redirectTo: `${origin}/auth/callback`,
  }

  const result = await serviceClient.auth.admin.inviteUserByEmail(
    data.email,
    inviteOptions
  )

  if (result.error?.message?.includes('already been registered')) {
    const { data: existingUsers } = await serviceClient.auth.admin.listUsers()
    const existing = existingUsers?.users?.find(u => u.email === data.email)

    if (existing) {
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('whatsapp, active')
        .eq('id', existing.id)
        .single()

      if (profile?.whatsapp && profile?.active) {
        throw new Error('Este email ya tiene una cuenta activa en el sistema')
      }

      if (!profile?.active) {
        await serviceClient
          .from('profiles')
          .update({ active: true, role: data.role })
          .eq('id', existing.id)
        await serviceClient.auth.admin.updateUserById(existing.id, {
          ban_duration: 'none',
          user_metadata: { full_name: data.full_name, role: data.role },
        })
      }

      const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
        type: 'magiclink',
        email: data.email,
        options: { redirectTo: `${origin}/login` },
      })

      if (linkError) throw new Error(linkError.message)

      const { error: logError } = await serviceClient.from('activity_log').insert({
        entity_type: 'invite',
        entity_id: existing.id,
        action: 'created',
        user_id: user.id,
        details: { email: data.email, role: data.role, full_name: data.full_name, via: 'magiclink' },
      })
      if (logError) throw new Error(logError.message)

      revalidatePath('/equipo')
      return { link: linkData.properties.action_link }
    }
  }

  if (result.error) throw new Error(result.error.message)

  const { error: logError } = await serviceClient.from('activity_log').insert({
    entity_type: 'invite',
    entity_id: result.data.user?.id ?? '00000000-0000-0000-0000-000000000000',
    action: 'created',
    user_id: user.id,
    details: { email: data.email, role: data.role, full_name: data.full_name, via: 'email' },
  })
  if (logError) throw new Error(logError.message)

  revalidatePath('/equipo')
  return {}
}

export async function resendInvite(memberId: string, email: string): Promise<{ link: string }> {
  const { user } = await requireAdmin()
  const origin = await getOrigin()
  const serviceClient = await createServiceClient()

  const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${origin}/login` },
  })

  if (linkError) throw new Error(linkError.message)

  const { error: logError } = await serviceClient.from('activity_log').insert({
    entity_type: 'invite',
    entity_id: memberId,
    action: 'resent',
    user_id: user.id,
    details: { email },
  })
  if (logError) throw new Error(logError.message)

  revalidatePath('/equipo')
  return { link: linkData.properties.action_link }
}

export async function deactivateUser(memberId: string) {
  const { user } = await requireAdmin()
  if (memberId === user.id) throw new Error('No podés desactivarte a vos mismo')

  const serviceClient = await createServiceClient()

  const { data: member } = await serviceClient
    .from('profiles')
    .select('email, full_name')
    .eq('id', memberId)
    .single()

  const { error: profileError } = await serviceClient
    .from('profiles')
    .update({ active: false })
    .eq('id', memberId)

  if (profileError) throw new Error(profileError.message)

  await serviceClient.auth.admin.updateUserById(memberId, {
    ban_duration: '876000h',
  })

  const { error: logError } = await serviceClient.from('activity_log').insert({
    entity_type: 'profile',
    entity_id: memberId,
    action: 'deactivated',
    user_id: user.id,
    details: { email: member?.email, full_name: member?.full_name },
  })
  if (logError) throw new Error(logError.message)

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

  // Nullify nullable FK references
  await serviceClient.from('set_status_history').update({ changed_by: null }).eq('changed_by', memberId)
  await serviceClient.from('clients').update({ assigned_to: null }).eq('assigned_to', memberId)
  await serviceClient.from('onboarding_checklist').update({ completed_by: null }).eq('completed_by', memberId)
  await serviceClient.from('feedback_tickets').update({ assigned_to: null }).eq('assigned_to', memberId)
  await serviceClient.from('activity_log').update({ user_id: null }).eq('user_id', memberId)

  // Delete rows where user FK is NOT NULL (can't nullify)
  await serviceClient.from('feedback_replies').delete().eq('user_id', memberId)
  await serviceClient.from('feedback_tickets').delete().eq('user_id', memberId)
  await serviceClient.from('commissions').delete().eq('team_member_id', memberId)
  await serviceClient.from('salary_payments').delete().eq('team_member_id', memberId)

  // Fetch sets owned by this member, then clean up child rows before deleting sets
  const { data: memberSets } = await serviceClient
    .from('sets')
    .select('id')
    .or(`setter_id.eq.${memberId},closer_id.eq.${memberId}`)
  const memberSetIds = (memberSets ?? []).map(s => s.id)
  if (memberSetIds.length > 0) {
    await serviceClient.from('payments').delete().in('set_id', memberSetIds)
    await serviceClient.from('clients').delete().in('set_id', memberSetIds)
    await serviceClient.from('sets').delete().in('id', memberSetIds)
  }

  await serviceClient.from('notifications').delete().eq('user_id', memberId)

  await serviceClient.from('activity_log').insert({
    entity_type: 'profile',
    entity_id: memberId,
    action: 'deleted',
    user_id: user.id,
    details: { email: member?.email, full_name: member?.full_name },
  })

  await serviceClient.from('profiles').delete().eq('id', memberId)

  const { error: authError } = await serviceClient.auth.admin.deleteUser(memberId)
  if (authError) throw new Error(authError.message)

  revalidatePath('/equipo')
}

export async function reactivateUser(memberId: string) {
  const { user } = await requireAdmin()
  const serviceClient = await createServiceClient()

  const { data: member } = await serviceClient
    .from('profiles')
    .select('email, full_name')
    .eq('id', memberId)
    .single()

  const { error: profileError } = await serviceClient
    .from('profiles')
    .update({ active: true })
    .eq('id', memberId)

  if (profileError) throw new Error(profileError.message)

  await serviceClient.auth.admin.updateUserById(memberId, {
    ban_duration: 'none',
  })

  const { error: logError } = await serviceClient.from('activity_log').insert({
    entity_type: 'profile',
    entity_id: memberId,
    action: 'reactivated',
    user_id: user.id,
    details: { email: member?.email, full_name: member?.full_name },
  })
  if (logError) throw new Error(logError.message)

  revalidatePath('/equipo')
}
