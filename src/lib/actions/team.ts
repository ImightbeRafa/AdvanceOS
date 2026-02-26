'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TeamMemberFormData } from '@/lib/schemas'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Sin permisos')

  return { supabase, user }
}

export async function getTeamMembers() {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')

  if (error) throw new Error(error.message)
  return data
}

export async function updateTeamMember(
  id: string,
  data: Partial<TeamMemberFormData>
) {
  const { supabase, user } = await requireAdmin()

  const { error } = await supabase
    .from('profiles')
    .update({
      ...data,
      salary: data.salary ?? null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  await supabase.from('activity_log').insert({
    entity_type: 'profile',
    entity_id: id,
    action: 'updated',
    user_id: user.id,
    details: data,
  })

  revalidatePath('/equipo')
}

export async function getTeamMemberById(id: string) {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}
