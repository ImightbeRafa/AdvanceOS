'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PaymentFormData } from '@/lib/schemas'
import { calculateTilopayFee, calculateCommission } from '@/lib/utils/currency'

export async function registerPayment(setId: string, clientId: string, data: PaymentFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: set } = await supabase
    .from('sets')
    .select('setter_id, closer_id')
    .eq('id', setId)
    .single()

  if (!set) throw new Error('Set no encontrado')

  const installmentMonths = data.payment_method === 'tilopay'
    ? (data.tilopay_installment_months ?? null)
    : null

  const { feePercentage, feeAmount, netAmount } = calculateTilopayFee(
    data.amount_gross,
    installmentMonths
  )

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      set_id: setId,
      client_id: clientId,
      amount_gross: data.amount_gross,
      payment_method: data.payment_method,
      tilopay_installment_months: installmentMonths,
      fee_percentage: feePercentage,
      fee_amount: feeAmount,
      amount_net: netAmount,
      payment_date: data.payment_date,
      notes: data.notes || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

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

  const { data: deal } = await supabase
    .from('deals')
    .select('revenue_total')
    .eq('set_id', setId)
    .eq('outcome', 'closed')
    .single()

  if (deal) {
    const { data: allPayments } = await supabase
      .from('payments')
      .select('amount_gross')
      .eq('set_id', setId)

    const totalCollected = (allPayments ?? []).reduce((sum, p) => sum + Number(p.amount_gross), 0)

    if (totalCollected >= Number(deal.revenue_total)) {
      await supabase.from('sets').update({ status: 'closed' }).eq('id', setId)

      await supabase.from('set_status_history').insert({
        set_id: setId,
        old_status: 'closed_pendiente',
        new_status: 'closed',
        changed_by: user.id,
        notes: 'Pago completado — saldo cubierto',
      })
    }
  }

  await supabase.from('activity_log').insert({
    entity_type: 'payment',
    entity_id: payment.id,
    action: 'payment_registered',
    user_id: user.id,
    details: {
      set_id: setId,
      client_id: clientId,
      amount_gross: data.amount_gross,
      amount_net: netAmount,
      method: data.payment_method,
    },
  })

  revalidatePath('/ventas')
  revalidatePath('/clientes')
  revalidatePath('/contabilidad')
  return payment
}

export async function markCommissionPaid(commissionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('commissions')
    .update({
      is_paid: true,
      paid_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', commissionId)

  if (error) throw new Error(error.message)

  await supabase.from('activity_log').insert({
    entity_type: 'commission',
    entity_id: commissionId,
    action: 'commission_paid',
    user_id: user.id,
    details: {},
  })

  revalidatePath('/equipo')
  revalidatePath('/contabilidad')
}

export async function markSalaryPaid(salaryPaymentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('salary_payments')
    .update({
      status: 'pagado',
      paid_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', salaryPaymentId)

  if (error) throw new Error(error.message)

  revalidatePath('/equipo')
  revalidatePath('/contabilidad')
}
