'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CreateSetFormData, CloseDealFormData, FollowUpFormData, DisqualifyFormData } from '@/lib/schemas'
import { VALID_STATUS_TRANSITIONS, ONBOARDING_CHECKLIST_TEMPLATE, ADVANCE90_PHASES } from '@/lib/constants'
import { calculateTilopayFee, calculateCommission } from '@/lib/utils/currency'
import { todayCR, nowCR } from '@/lib/utils/dates'
import type { SetStatus } from '@/types'
import { addDays, format } from 'date-fns'

export async function checkDuplicateIG(ig: string) {
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

  const igClean = data.prospect_ig.toLowerCase().replace('@', '')

  const existing = await checkDuplicateIG(igClean)
  const isDuplicate = existing.length > 0

  const { data: newSet, error } = await supabase
    .from('sets')
    .insert({
      prospect_name: data.prospect_name,
      prospect_whatsapp: data.prospect_whatsapp,
      prospect_ig: igClean,
      prospect_web: data.prospect_web || null,
      setter_id: user.id,
      closer_id: data.closer_id,
      scheduled_at: data.scheduled_at,
      summary: data.summary,
      service_offered: data.service_offered,
      is_duplicate: isDuplicate,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await supabase.from('set_status_history').insert({
    set_id: newSet.id,
    old_status: null,
    new_status: 'agendado',
    changed_by: user.id,
    notes: 'Set creado',
  })

  await supabase.from('activity_log').insert({
    entity_type: 'set',
    entity_id: newSet.id,
    action: 'created',
    user_id: user.id,
    details: { prospect_name: data.prospect_name, service: data.service_offered },
  })

  revalidatePath('/ventas')
  return newSet
}

export async function updateSet(setId: string, data: CreateSetFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const igClean = data.prospect_ig.toLowerCase().replace('@', '')

  const { error } = await supabase
    .from('sets')
    .update({
      prospect_name: data.prospect_name,
      prospect_whatsapp: data.prospect_whatsapp,
      prospect_ig: igClean,
      prospect_web: data.prospect_web || null,
      closer_id: data.closer_id,
      scheduled_at: data.scheduled_at,
      summary: data.summary,
      service_offered: data.service_offered,
    })
    .eq('id', setId)

  if (error) throw new Error(error.message)

  await supabase.from('activity_log').insert({
    entity_type: 'set',
    entity_id: setId,
    action: 'updated',
    user_id: user.id,
    details: { prospect_name: data.prospect_name, service: data.service_offered },
  })

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

  await supabase.from('set_status_history').insert({
    set_id: setId,
    old_status: currentSet.status,
    new_status: newStatus,
    changed_by: user.id,
    notes: scheduledAt ? `Re-agendado para ${scheduledAt}` : (notes ?? null),
  })

  await supabase.from('activity_log').insert({
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
  await supabase.from('onboarding_checklist').insert(checklistItems)

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

    await supabase
      .from('advance90_phases')
      .insert(phases)
  }

  if (data.amount_collected && data.amount_collected > 0 && data.payment_method) {
    const { feePercentage, feeAmount, netAmount } = calculateTilopayFee(
      data.amount_collected,
      data.payment_method === 'tilopay' ? (data.tilopay_installment_months ?? null) : null
    )

    const { data: payment } = await supabase
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

    if (payment) {
      const setterCommission = calculateCommission(netAmount, 'setter')
      const closerCommission = calculateCommission(netAmount, 'closer')

      await supabase.from('commissions').insert([
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
    }
  }

  const hasFullPayment = (data.amount_collected ?? 0) >= data.revenue_total
  await supabase
    .from('sets')
    .update({ status: hasFullPayment ? 'closed' : 'closed_pendiente' })
    .eq('id', setId)

  await supabase.from('set_status_history').insert({
    set_id: setId,
    old_status: set.status,
    new_status: hasFullPayment ? 'closed' : 'closed_pendiente',
    changed_by: user.id,
    notes: `Deal cerrado. Revenue: ${data.revenue_total}`,
  })

  await supabase.from('activity_log').insert({
    entity_type: 'set',
    entity_id: setId,
    action: 'deal_closed',
    user_id: user.id,
    details: { revenue: data.revenue_total, service: data.service_sold, client_id: client.id },
  })

  await supabase.from('notifications').insert({
    user_id: set.closer_id,
    type: 'deal_closed',
    title: 'Deal cerrado',
    message: `${set.prospect_name} — ${data.service_sold}`,
    action_url: `/clientes/${client.id}`,
  })

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

  await supabase.from('deals').insert({
    set_id: setId,
    outcome: 'follow_up',
    follow_up_date: data.follow_up_date,
    follow_up_notes: data.follow_up_notes,
  })

  await supabase.from('sets').update({ status: 'seguimiento' }).eq('id', setId)

  await supabase.from('set_status_history').insert({
    set_id: setId,
    old_status: set.status,
    new_status: 'seguimiento',
    changed_by: user.id,
    notes: data.follow_up_notes,
  })

  await supabase.from('notifications').insert({
    user_id: set.closer_id,
    type: 'follow_up',
    title: 'Follow up programado',
    message: data.follow_up_notes,
    action_url: `/ventas/${setId}`,
  })

  await supabase.from('activity_log').insert({
    entity_type: 'set',
    entity_id: setId,
    action: 'follow_up_created',
    user_id: user.id,
    details: { follow_up_date: data.follow_up_date, notes: data.follow_up_notes },
  })

  revalidatePath('/ventas')
}

export async function createDealDisqualified(setId: string, data: DisqualifyFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: set } = await supabase.from('sets').select('status').eq('id', setId).single()
  if (!set) throw new Error('Set no encontrado')

  await supabase.from('deals').insert({
    set_id: setId,
    outcome: 'descalificado',
    disqualified_reason: data.disqualified_reason,
  })

  await supabase.from('sets').update({ status: 'descalificado' }).eq('id', setId)

  await supabase.from('set_status_history').insert({
    set_id: setId,
    old_status: set.status,
    new_status: 'descalificado',
    changed_by: user.id,
    notes: data.disqualified_reason,
  })

  await supabase.from('activity_log').insert({
    entity_type: 'set',
    entity_id: setId,
    action: 'disqualified',
    user_id: user.id,
    details: { reason: data.disqualified_reason },
  })

  revalidatePath('/ventas')
}
