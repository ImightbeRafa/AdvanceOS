'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ExpenseFormData, AdSpendFormData, ManualTransactionFormData } from '@/lib/schemas'
import { startOfDayCR, endOfDayCR, todayCR } from '@/lib/utils/dates'

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

export async function getAccountingSummary(periodStart?: string, periodEnd?: string) {
  const { supabase } = await requireAdmin()

  // All financial queries anchor on payment_date for consistency
  let paymentsQ = supabase.from('payments').select('id, set_id, amount_gross, amount_net, fee_amount, payment_date')
  if (periodStart) paymentsQ = paymentsQ.gte('payment_date', periodStart)
  if (periodEnd) paymentsQ = paymentsQ.lte('payment_date', periodEnd)

  let expensesQ = supabase.from('expenses').select('amount_usd, date')
  if (periodStart) expensesQ = expensesQ.gte('date', periodStart)
  if (periodEnd) expensesQ = expensesQ.lte('date', periodEnd)

  let commissionsQ = supabase.from('commissions').select('amount, is_paid, payment_id, created_at')
  let salariesQ = supabase.from('salary_payments').select('amount, status, created_at')
  if (periodStart) salariesQ = salariesQ.gte('created_at', startOfDayCR(periodStart))
  if (periodEnd) salariesQ = salariesQ.lte('created_at', endOfDayCR(periodEnd))

  let adSpendQ = supabase.from('ad_spend').select('amount_usd, period_start')
  if (periodStart) adSpendQ = adSpendQ.gte('period_start', periodStart)
  if (periodEnd) adSpendQ = adSpendQ.lte('period_start', periodEnd)

  // Deals fetched without date filter — we cross-reference with payments below
  const closedDealsQ = supabase.from('deals').select('revenue_total, outcome, set_id').eq('outcome', 'closed')

  // Activity metrics still use created_at (measures when the activity happened)
  let allDealsQ = supabase.from('deals').select('id, created_at')
  if (periodStart) allDealsQ = allDealsQ.gte('created_at', startOfDayCR(periodStart))
  if (periodEnd) allDealsQ = allDealsQ.lte('created_at', endOfDayCR(periodEnd))

  let setsQ = supabase.from('sets').select('*', { count: 'exact', head: true })
  if (periodStart) setsQ = setsQ.gte('created_at', startOfDayCR(periodStart))
  if (periodEnd) setsQ = setsQ.lte('created_at', endOfDayCR(periodEnd))

  let clientsQ = supabase.from('clients').select('*', { count: 'exact', head: true })
  if (periodStart) clientsQ = clientsQ.gte('created_at', startOfDayCR(periodStart))
  if (periodEnd) clientsQ = clientsQ.lte('created_at', endOfDayCR(periodEnd))

  let manualTxQ = supabase.from('manual_transactions').select('type, amount_usd, date')
  if (periodStart) manualTxQ = manualTxQ.gte('date', periodStart)
  if (periodEnd) manualTxQ = manualTxQ.lte('date', periodEnd)

  const [
    { data: payments },
    { data: expenses },
    { data: allCommissions },
    { data: salaryPayments },
    { data: adSpends },
    { data: allClosedDeals },
    { data: allDeals },
    { count: setsTotal },
    { count: clientsTotal },
    { data: manualTx },
  ] = await Promise.all([
    paymentsQ, expensesQ, commissionsQ, salariesQ, adSpendQ,
    closedDealsQ, allDealsQ, setsQ, clientsQ, manualTxQ,
  ])

  // Anchor deals and commissions to payment_date via payments in period
  const paymentIds = new Set((payments ?? []).map(p => p.id as string))
  const paymentSetIds = new Set((payments ?? []).map(p => p.set_id as string))

  const closedDeals = (allClosedDeals ?? []).filter(d => paymentSetIds.has(d.set_id))
  const commissions = (allCommissions ?? []).filter(c => paymentIds.has(c.payment_id))

  const closedDealsCount = closedDeals.length
  const revenue = closedDeals.reduce((sum, d) => sum + Number(d.revenue_total ?? 0), 0)
  const cashCollected = (payments ?? []).reduce((sum, p) => sum + Number(p.amount_gross), 0)
  const cashNet = (payments ?? []).reduce((sum, p) => sum + Number(p.amount_net), 0)
  const bankFees = (payments ?? []).reduce((sum, p) => sum + Number(p.fee_amount), 0)
  const totalExpenses = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount_usd), 0)
  const totalCommissions = commissions.reduce((sum, c) => sum + Number(c.amount), 0)
  const unpaidCommissions = commissions.filter((c) => !c.is_paid).reduce((sum, c) => sum + Number(c.amount), 0)
  const totalSalaries = (salaryPayments ?? []).reduce((sum, s) => sum + Number(s.amount), 0)
  const totalAdSpend = (adSpends ?? []).reduce((sum, a) => sum + Number(a.amount_usd), 0)

  const manualIncome = (manualTx ?? []).filter(t => t.type === 'ingreso').reduce((sum, t) => sum + Number(t.amount_usd), 0)
  const manualDeductions = (manualTx ?? []).filter(t => t.type === 'egreso').reduce((sum, t) => sum + Number(t.amount_usd), 0)

  const margin = cashNet + manualIncome - totalExpenses - totalSalaries - totalCommissions - totalAdSpend - manualDeductions
  const totalSets = setsTotal ?? 0
  const totalClients = clientsTotal ?? 0
  const totalDeals = (allDeals ?? []).length

  const costPerClient = totalClients > 0 ? totalAdSpend / totalClients : 0
  const costPerSet = totalSets > 0 ? totalAdSpend / totalSets : 0
  const costPerCall = totalDeals > 0 ? totalAdSpend / totalDeals : 0
  const costPerClosed = closedDealsCount > 0 ? totalAdSpend / closedDealsCount : 0

  return {
    revenue,
    cashCollected,
    cashNet,
    bankFees,
    totalExpenses,
    totalCommissions,
    unpaidCommissions,
    totalSalaries,
    totalAdSpend,
    manualIncome,
    manualDeductions,
    margin,
    totalSets,
    totalClients,
    totalDeals,
    closedDealsCount,
    costPerClient,
    costPerSet,
    costPerCall,
    costPerClosed,
  }
}

export async function createExpense(data: ExpenseFormData) {
  const { supabase, user } = await requireAdmin()

  const { error } = await supabase.from('expenses').insert({
    category: data.category,
    description: data.description,
    amount_usd: data.amount_usd,
    date: data.date,
    recurring: data.recurring,
  })

  if (error) throw new Error(error.message)

  await supabase.from('activity_log').insert({
    entity_type: 'expense',
    entity_id: '00000000-0000-0000-0000-000000000000',
    action: 'created',
    user_id: user.id,
    details: data,
  })

  revalidatePath('/contabilidad')
}

export async function updateExpense(id: string, data: ExpenseFormData) {
  const { supabase, user } = await requireAdmin()

  const { error } = await supabase
    .from('expenses')
    .update({
      category: data.category,
      description: data.description,
      amount_usd: data.amount_usd,
      date: data.date,
      recurring: data.recurring,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  await supabase.from('activity_log').insert({
    entity_type: 'expense',
    entity_id: id,
    action: 'updated',
    user_id: user.id,
    details: data,
  })

  revalidatePath('/contabilidad')
}

export async function createAdSpend(data: AdSpendFormData) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('ad_spend').insert(data)
  if (error) throw new Error(error.message)
  revalidatePath('/contabilidad')
}

export async function updateAdSpend(id: string, data: AdSpendFormData) {
  const { supabase, user } = await requireAdmin()

  const { error } = await supabase
    .from('ad_spend')
    .update({
      period_start: data.period_start,
      period_end: data.period_end,
      amount_usd: data.amount_usd,
      platform: data.platform,
      notes: data.notes ?? null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  await supabase.from('activity_log').insert({
    entity_type: 'ad_spend',
    entity_id: id,
    action: 'updated',
    user_id: user.id,
    details: data,
  })

  revalidatePath('/contabilidad')
}

export async function getAdSpends() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase
    .from('ad_spend')
    .select('*')
    .order('period_start', { ascending: false })
  return data ?? []
}

export async function getExpenses() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false })
  return data ?? []
}

export async function getUnpaidCommissions() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase
    .from('commissions')
    .select(`
      *,
      team_member:profiles!commissions_team_member_id_fkey(id, full_name),
      payment:payments(*, set:sets(prospect_name))
    `)
    .eq('is_paid', false)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getSalaryPayments() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase
    .from('salary_payments')
    .select('*, team_member:profiles!salary_payments_team_member_id_fkey(id, full_name)')
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function markCommissionPaid(commissionId: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase
    .from('commissions')
    .update({
      is_paid: true,
      paid_date: todayCR(),
    })
    .eq('id', commissionId)

  if (error) throw new Error(error.message)
  revalidatePath('/equipo/planilla')
  revalidatePath('/contabilidad')
}

export async function markSalaryPaid(salaryPaymentId: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase
    .from('salary_payments')
    .update({ status: 'paid' })
    .eq('id', salaryPaymentId)

  if (error) throw new Error(error.message)
  revalidatePath('/equipo/planilla')
  revalidatePath('/contabilidad')
}

export async function generateSalaryPayments(periodLabel: string) {
  const { supabase } = await requireAdmin()

  const { data: members } = await supabase
    .from('profiles')
    .select('id, salary')
    .eq('active', true)
    .gt('salary', 0)

  if (!members?.length) return

  const inserts = members.map((m) => ({
    team_member_id: m.id,
    amount: m.salary,
    period_label: periodLabel,
    status: 'pendiente',
  }))

  const { error } = await supabase.from('salary_payments').insert(inserts)
  if (error) throw new Error(error.message)

  revalidatePath('/equipo/planilla')
}

export async function createManualTransaction(data: ManualTransactionFormData) {
  const { supabase, user } = await requireAdmin()

  const { error } = await supabase.from('manual_transactions').insert({
    type: data.type,
    description: data.description,
    amount_usd: data.amount_usd,
    date: data.date,
    notes: data.notes ?? '',
    created_by: user.id,
  })

  if (error) throw new Error(error.message)

  await supabase.from('activity_log').insert({
    entity_type: 'manual_transaction',
    entity_id: '00000000-0000-0000-0000-000000000000',
    action: 'created',
    user_id: user.id,
    details: data,
  })

  revalidatePath('/contabilidad')
}

export async function getManualTransactions() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase
    .from('manual_transactions')
    .select('*')
    .order('date', { ascending: false })
  return data ?? []
}

export async function deleteManualTransaction(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase
    .from('manual_transactions')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/contabilidad')
}

export async function getLatestExchangeRate() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('exchange_rates')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .single()

  return data
}
