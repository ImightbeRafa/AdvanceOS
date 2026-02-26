'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getClients() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      assigned_member:profiles!clients_assigned_to_fkey(id, full_name)
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
    .select('*')
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

  if (completed && progressPct >= 100) {
    await generateClientBrief(clientId)
  }

  revalidatePath(`/clientes/${clientId}`)
}

export async function createClientAsset(
  clientId: string,
  asset: { type: string; name: string; url: string; notes?: string }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase.from('client_assets').insert({
    client_id: clientId,
    type: asset.type,
    name: asset.name,
    url: asset.url,
    notes: asset.notes ?? null,
    uploaded_by: user.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/clientes/${clientId}`)
}

export async function generateClientBrief(clientId: string) {
  const supabase = await createClient()

  const { data: form } = await supabase
    .from('client_forms')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!form || !form.completed) return

  const { data: client } = await supabase
    .from('clients')
    .select('business_name, service')
    .eq('id', clientId)
    .single()

  const formData = form.form_data as Record<string, unknown>
  const lines: string[] = []
  lines.push(`# Brief del cliente: ${client?.business_name ?? 'N/A'}`)
  lines.push(`**Tipo de negocio:** ${form.business_type}`)
  lines.push(`**Servicio:** ${client?.service ?? 'N/A'}`)
  lines.push('')
  lines.push('## Datos del formulario')
  for (const [key, value] of Object.entries(formData)) {
    if (value !== null && value !== undefined && value !== '') {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
      lines.push(`- **${label}:** ${String(value)}`)
    }
  }
  const briefContent = lines.join('\n')

  const { data: existingBrief } = await supabase
    .from('client_assets')
    .select('id')
    .eq('client_id', clientId)
    .eq('name', 'Brief del cliente')
    .limit(1)
    .maybeSingle()

  if (existingBrief) {
    await supabase
      .from('client_assets')
      .update({ url: briefContent, notes: 'Auto-generado desde formulario completo' })
      .eq('id', existingBrief.id)
  } else {
    await supabase.from('client_assets').insert({
      client_id: clientId,
      type: 'link',
      name: 'Brief del cliente',
      url: briefContent,
      notes: 'Auto-generado desde formulario completo',
    })
  }

  const { data: existingSummary } = await supabase
    .from('client_assets')
    .select('id')
    .eq('client_id', clientId)
    .eq('name', 'Resumen del formulario')
    .limit(1)
    .maybeSingle()

  const summaryLines: string[] = []
  summaryLines.push(`Formulario completado para ${client?.business_name ?? 'N/A'}`)
  summaryLines.push(`Tipo: ${form.business_type}`)
  const fieldCount = Object.keys(formData).filter((k) => formData[k] !== null && formData[k] !== '' && formData[k] !== undefined).length
  summaryLines.push(`Campos completados: ${fieldCount}`)
  const summaryContent = summaryLines.join(' | ')

  if (existingSummary) {
    await supabase
      .from('client_assets')
      .update({ url: summaryContent, notes: 'Auto-generado' })
      .eq('id', existingSummary.id)
  } else {
    await supabase.from('client_assets').insert({
      client_id: clientId,
      type: 'link',
      name: 'Resumen del formulario',
      url: summaryContent,
      notes: 'Auto-generado',
    })
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
