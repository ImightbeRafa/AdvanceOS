'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CreateSetFormData, CloseDealFormData, FollowUpFormData, DisqualifyFormData } from '@/lib/schemas'
import { VALID_STATUS_TRANSITIONS, ONBOARDING_CHECKLIST_TEMPLATE, ADVANCE90_PHASES } from '@/lib/constants'
import { calculateTilopayFee, calculateCommission } from '@/lib/utils/currency'
import { todayCR, nowCR } from '@/lib/utils/dates'
import type { SetStatus } from '@/types'
import { addDays, format } from 'date-fns'

const IG_PLACEHOLDERS = ['', 'n/a', 'na', 'no', 'none', '-', 'sin', 'no tiene']

function isBlankIG(ig: string): boolean {
  const clean = ig.toLowerCase().replace('@', '').trim()
  return !clean || IG_PLACEHOLDERS.includes(clean)
}

export async function checkDuplicateIG(ig: string) {
  if (isBlankIG(ig)) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('sets')
    .select('id, prospect_name, prospect_ig, status')
    .eq('prospect_ig', ig.toLowerCase().replace('@', ''))
    .limit(5)

  return data ?? []
}

export async function createSet(data: CreateSetFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const igRaw = data.prospect_ig || ''
  const igClean = igRaw.toLowerCase().replace('@', '').trim()
  const igValue = isBlankIG(igRaw) ? null : igClean

  const existing = igValue ? await checkDuplicateIG(igClean) : []
  const isDuplicate = existing.length > 0

  const { data: newSet, error } = await supabase
    .from('sets')
    .insert({
      prospect_name: data.prospect_name,
      prospect_whatsapp: data.prospect_whatsapp || null,
      prospect_ig: igValue,
      prospect_web: data.prospect_web || null,
      setter_id: data.setter_id,
      closer_id: data.closer_id,
      scheduled_at: data.scheduled_at || null,
      summary: data.summary,
      service_offered: data.service_offered,
      is_duplicate: isDuplicate,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  const { error: historyError } = await supabase.from('set_status_history').insert({
    set_id: newSet.id,
    old_status: null,
    new_status: 'agendado',
    changed_by: user.id,
    notes: 'Set creado',
  })
  if (historyError) throw new Error(historyError.message)

  const { error: logError } = await supabase.from('activity_log').insert({
    entity_type: 'set',
    entity_id: newSet.id,
    action: 'created',
    user_id: user.id,
    details: { prospect_name: data.prospect_name, service: data.service_offered },
  })
  if (logError) throw new Error(logError.message)

  revalidatePath('/ventas')
  return newSet
}

export async function updateSet(setId: string, data: CreateSetFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const igRaw = data.prospect_ig || ''
  const igClean = igRaw.toLowerCase().replace('@', '').trim()
  const igValue = isBlankIG(igRaw) ? null : igClean

  const { error } = await supabase
    .from('sets')
    .update({
      prospect_name: data.prospect_name,
      prospect_whatsapp: data.prospect_whatsapp || null,
      prospect_ig: igValue,
      prospect_web: data.prospect_web || null,
      setter_id: data.setter_id,
      closer_id: data.closer_id,
      scheduled_at: data.scheduled_at || null,
      summary: data.summary,
      service_offered: data.service_offered,
    })
    .eq('id', setId)

  if (error) throw new Error(error.message)

  const { error: logError } = await supabase.from('activity_log').insert({
    entity_type: 'set',
    entity_id: setId,
    action: 'updated',
    user_id: user.id,
    details: { prospect_name: data.prospect_name, service: data.service_offered },
  })
  if (logError) throw new Error(logError.message)

  revalidatePath('/ventas')
}

export async function updateSetStatus(setId: string, newStatus: SetStatus, notes?: string, scheduledAt?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: currentSet } = await supabase
    .from('sets')
    .select('status')
    .eq('id', setId)
    .single()

  if (!currentSet) throw new Error('Set no encontrado')

  const validTransitions = VALID_STATUS_TRANSITIONS[currentSet.status as SetStatus]
  if (!validTransitions.includes(newStatus)) {
    throw new Error(`Transición inválida: ${currentSet.status} → ${newStatus}`)
  }

  const updatePayload: Record<string, unknown> = { status: newStatus }
  if (scheduledAt) updatePayload.scheduled_at = scheduledAt

  const { error } = await supabase
    .from('sets')
    .update(updatePayload)
    .eq('id', setId)

  if (error) throw new Error(error.message)

  const { error: historyError } = await supabase.from('set_status_history').insert({
    set_id: setId,
    old_status: currentSet.status,
    new_status: newStatus,
    changed_by: user.id,
    notes: scheduledAt ? `Re-agendado para ${scheduledAt}` : (notes ?? null),
  })
  if (historyError) throw new Error(historyError.message)

  const { error: logError } = await supabase.from('activity_log').insert({
    entity_type: 'set',
    entity_id: setId,
    action: 'status_changed',
    user_id: user.id,
    details: {
      old_status: currentSet.status,
      new_status: newStatus,
      ...(scheduledAt ? { scheduled_at: scheduledAt } : {}),
    },
  })
  if (logError) throw new Error(logError.message)

  revalidatePath('/ventas')
}

export async function createDealClosed(setId: string, data: CloseDealFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: set } = await supabase
    .from('sets')
    .select('*, setter:profiles!sets_setter_id_fkey(id), closer:profiles!sets_closer_id_fkey(id)')
    .eq('id', setId)
    .single()

  if (!set) throw new Error('Set no encontrado')

  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .insert({
      set_id: setId,
      outcome: 'closed',
      service_sold: data.service_sold,
      revenue_total: data.revenue_total,
      phantom_link: data.phantom_link || null,
      closer_notes: data.closer_notes || null,
    })
    .select()
    .single()

  if (dealError) throw new Error(dealError.message)

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      deal_id: deal.id,
      set_id: setId,
      business_name: set.prospect_name,
      contact_name: set.prospect_name,
      whatsapp: set.prospect_whatsapp,
      ig: set.prospect_ig,
      web: set.prospect_web,
      service: data.service_sold,
      status: 'onboarding',
    })
    .select()
    .single()

  if (clientError) throw new Error(clientError.message)

  const checklistItems = ONBOARDING_CHECKLIST_TEMPLATE.map((item) => ({
    client_id: client.id,
    item_key: item.key,
    label: item.label,
  }))
  const { error: checklistError } = await supabase.from('onboarding_checklist').insert(checklistItems)
  if (checklistError) throw new Error(checklistError.message)

  if (data.service_sold === 'advance90') {
    const startDate = nowCR()
    const phases = ADVANCE90_PHASES.map((phase) => ({
      client_id: client.id,
      phase_name: phase.name,
      start_day: phase.start_day,
      end_day: phase.end_day,
      start_date: format(addDays(startDate, phase.start_day), 'yyyy-MM-dd'),
      end_date: format(addDays(startDate, phase.end_day), 'yyyy-MM-dd'),
      status: 'pendiente',
      order: phase.order,
    }))

    const { error: phasesError } = await supabase
      .from('advance90_phases')
      .insert(phases)
    if (phasesError) throw new Error(phasesError.message)
  }

  if (data.amount_collected && data.amount_collected > 0 && data.payment_method) {
    const { feePercentage, feeAmount, netAmount } = calculateTilopayFee(
      data.amount_collected,
      data.payment_method === 'tilopay' ? (data.tilopay_installment_months ?? null) : null
    )

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        set_id: setId,
        client_id: client.id,
        amount_gross: data.amount_collected,
        payment_method: data.payment_method,
        tilopay_installment_months: data.payment_method === 'tilopay' ? data.tilopay_installment_months : null,
        fee_percentage: feePercentage,
        fee_amount: feeAmount,
        amount_net: netAmount,
        payment_date: todayCR(),
      })
      .select()
      .single()

    if (paymentError) throw new Error(paymentError.message)

    const setterCommission = calculateCommission(netAmount, 'setter')
    const closerCommission = calculateCommission(netAmount, 'closer')

    const { error: commError } = await supabase.from('commissions').insert([
      {
        payment_id: payment.id,
        team_member_id: set.setter_id,
        role: 'setter',
        percentage: 0.05,
        amount: setterCommission,
      },
      {
        payment_id: payment.id,
        team_member_id: set.closer_id,
        role: 'closer',
        percentage: 0.10,
        amount: closerCommission,
      },
    ])
    if (commError) throw new Error(commError.message)
  }

  const hasFullPayment = (data.amount_collected ?? 0) >= data.revenue_total
  const { error: statusError } = await supabase
    .from('sets')
    .update({ status: hasFullPayment ? 'closed' : 'closed_pendiente' })
    .eq('id', setId)
  if (statusError) throw new Error(statusError.message)

  const { error: historyError } = await supabase.from('set_status_history').insert({
    set_id: setId,
    old_status: set.status,
    new_status: hasFullPayment ? 'closed' : 'closed_pendiente',
    changed_by: user.id,
    notes: `Deal cerrado. Revenue: ${data.revenue_total}`,
  })
  if (historyError) throw new Error(historyError.message)

  const { error: logError } = await supabase.from('activity_log').insert({
    entity_type: 'set',
    entity_id: setId,
    action: 'deal_closed',
    user_id: user.id,
    details: { revenue: data.revenue_total, service: data.service_sold, client_id: client.id },
  })
  if (logError) throw new Error(logError.message)

  const { error: notifError } = await supabase.from('notifications').insert({
    user_id: set.closer_id,
    type: 'deal_closed',
    title: 'Deal cerrado',
    message: `${set.prospect_name} — ${data.service_sold}`,
    action_url: `/clientes/${client.id}`,
  })
  if (notifError) throw new Error(notifError.message)

  revalidatePath('/ventas')
  revalidatePath('/clientes')
  return { deal, client }
}

export async function createDealFollowUp(setId: string, data: FollowUpFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: set } = await supabase.from('sets').select('status, closer_id').eq('id', setId).single()
  if (!set) throw new Error('Set no encontrado')

  const { error: dealError } = await supabase.from('deals').insert({
    set_id: setId,
    outcome: 'follow_up',
    follow_up_date: data.follow_up_date,
    follow_up_notes: data.follow_up_notes,
  })
  if (dealError) throw new Error(dealError.message)

  const { error: statusError } = await supabase.from('sets').update({ status: 'seguimiento' }).eq('id', setId)
  if (statusError) throw new Error(statusError.message)

  const { error: historyError } = await supabase.from('set_status_history').insert({
    set_id: setId,
    old_status: set.status,
    new_status: 'seguimiento',
    changed_by: user.id,
    notes: data.follow_up_notes,
  })
  if (historyError) throw new Error(historyError.message)

  const { error: notifError } = await supabase.from('notifications').insert({
    user_id: set.closer_id,
    type: 'follow_up',
    title: 'Follow up programado',
    message: data.follow_up_notes,
    action_url: `/ventas/${setId}`,
  })
  if (notifError) throw new Error(notifError.message)

  const { error: logError } = await supabase.from('activity_log').insert({
    entity_type: 'set',
    entity_id: setId,
    action: 'follow_up_created',
    user_id: user.id,
    details: { follow_up_date: data.follow_up_date, notes: data.follow_up_notes },
  })
  if (logError) throw new Error(logError.message)

  revalidatePath('/ventas')
}

export async function createDealDisqualified(setId: string, data: DisqualifyFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: set } = await supabase.from('sets').select('status').eq('id', setId).single()
  if (!set) throw new Error('Set no encontrado')

  const { error: dealError } = await supabase.from('deals').insert({
    set_id: setId,
    outcome: 'descalificado',
    disqualified_reason: data.disqualified_reason,
  })
  if (dealError) throw new Error(dealError.message)

  const { error: statusError } = await supabase.from('sets').update({ status: 'descalificado' }).eq('id', setId)
  if (statusError) throw new Error(statusError.message)

  const { error: historyError } = await supabase.from('set_status_history').insert({
    set_id: setId,
    old_status: set.status,
    new_status: 'descalificado',
    changed_by: user.id,
    notes: data.disqualified_reason,
  })
  if (historyError) throw new Error(historyError.message)

  const { error: logError } = await supabase.from('activity_log').insert({
    entity_type: 'set',
    entity_id: setId,
    action: 'disqualified',
    user_id: user.id,
    details: { reason: data.disqualified_reason },
  })
  if (logError) throw new Error(logError.message)

  revalidatePath('/ventas')
}

export async function deleteSet(setId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Solo admin puede eliminar sets')

  // Use service client to bypass RLS for admin delete operations
  const { createServiceClient } = await import('@/lib/supabase/server')
  const serviceClient = await createServiceClient()

  const { data: set } = await serviceClient
    .from('sets')
    .select('prospect_name')
    .eq('id', setId)
    .single()

  if (!set) throw new Error('Set no encontrado')

  // Log BEFORE delete so we always have a record
  await serviceClient.from('activity_log').insert({
    entity_type: 'set',
    entity_id: setId,
    action: 'deleted',
    user_id: user.id,
    details: { prospect_name: set.prospect_name },
  })

  // With ON DELETE CASCADE on all FKs, deleting the set cleans up
  // deals, clients, payments, commissions, set_status_history, etc.
  const { error } = await serviceClient
    .from('sets')
    .delete()
    .eq('id', setId)

  if (error) throw new Error(error.message)

  revalidatePath('/ventas')
  revalidatePath('/clientes')
  revalidatePath('/contabilidad')
}
