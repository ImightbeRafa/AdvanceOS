'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getClients() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      assigned_member:profiles!clients_assigned_to_fkey(id, full_name),
      tasks(id, title, status, due_date)
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function getClientById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      deal:deals(*),
      set:sets(*, setter:profiles!sets_setter_id_fkey(id, full_name), closer:profiles!sets_closer_id_fkey(id, full_name)),
      assigned_member:profiles!clients_assigned_to_fkey(id, full_name)
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getClientOnboarding(clientId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('onboarding_checklist')
    .select('*')
    .eq('client_id', clientId)
    .order('item_key')

  return data ?? []
}

export async function toggleOnboardingItem(itemId: string, completed: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  await supabase
    .from('onboarding_checklist')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? user.id : null,
    })
    .eq('id', itemId)

  revalidatePath('/clientes')
}

export async function updateClientStatus(clientId: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  await supabase
    .from('clients')
    .update({ status })
    .eq('id', clientId)

  await supabase.from('activity_log').insert({
    entity_type: 'client',
    entity_id: clientId,
    action: 'status_changed',
    user_id: user.id,
    details: { new_status: status },
  })

  revalidatePath('/clientes')
}

export async function assignClient(clientId: string, assignedTo: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  await supabase
    .from('clients')
    .update({ assigned_to: assignedTo })
    .eq('id', clientId)

  revalidatePath('/clientes')
}

export async function getClientPayments(clientId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('payments')
    .select('*, commissions(*)')
    .eq('client_id', clientId)
    .order('payment_date', { ascending: false })

  return data ?? []
}

export async function getClientTasks(clientId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tasks')
    .select('*, assigned_member:profiles!tasks_assigned_to_fkey(id, full_name)')
    .eq('client_id', clientId)
    .order('due_date')

  return data ?? []
}

export async function updateTaskStatus(taskId: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  await supabase.from('tasks').update({ status }).eq('id', taskId)
  revalidatePath('/clientes')
}

export async function getClientAssets(clientId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('client_assets')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getClientPhases(clientId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('advance90_phases')
    .select('*, tasks(*)')
    .eq('client_id', clientId)
    .order('order')

  return data ?? []
}

export async function getClientActivityLog(clientId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('activity_log')
    .select('*, user:profiles!activity_log_user_id_fkey(id, full_name)')
    .eq('entity_id', clientId)
    .order('created_at', { ascending: false })
    .limit(50)

  return data ?? []
}

export async function getClientForm(clientId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('client_forms')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}

export async function saveClientForm(
  clientId: string,
  businessType: string,
  formData: Record<string, unknown>,
  progressPct: number,
  completed: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: existing } = await supabase
    .from('client_forms')
    .select('id')
    .eq('client_id', clientId)
    .limit(1)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('client_forms')
      .update({ form_data: formData, progress_pct: progressPct, completed, business_type: businessType })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('client_forms')
      .insert({ client_id: clientId, business_type: businessType, form_data: formData, progress_pct: progressPct, completed })
  }

  revalidatePath(`/clientes/${clientId}`)
}

export async function addClientNote(clientId: string, noteType: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  await supabase.from('activity_log').insert({
    entity_type: 'client',
    entity_id: clientId,
    action: noteType,
    user_id: user.id,
    details: { content },
  })

  revalidatePath(`/clientes/${clientId}`)
}
