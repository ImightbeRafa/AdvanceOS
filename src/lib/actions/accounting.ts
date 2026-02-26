'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ExpenseFormData, AdSpendFormData } from '@/lib/schemas'

export async function getAccountingSummary(periodStart?: string, periodEnd?: string) {
  const supabase = await createClient()

  let paymentsQ = supabase.from('payments').select('amount_gross, amount_net, fee_amount, payment_date')
  if (periodStart) paymentsQ = paymentsQ.gte('payment_date', periodStart)
  if (periodEnd) paymentsQ = paymentsQ.lte('payment_date', periodEnd)

  let expensesQ = supabase.from('expenses').select('amount_usd, date')
  if (periodStart) expensesQ = expensesQ.gte('date', periodStart)
  if (periodEnd) expensesQ = expensesQ.lte('date', periodEnd)

  let commissionsQ = supabase.from('commissions').select('amount, is_paid, created_at')
  if (periodStart) commissionsQ = commissionsQ.gte('created_at', `${periodStart}T00:00:00`)
  if (periodEnd) commissionsQ = commissionsQ.lte('created_at', `${periodEnd}T23:59:59`)

  let salariesQ = supabase.from('salary_payments').select('amount, status, created_at')
  if (periodStart) salariesQ = salariesQ.gte('created_at', `${periodStart}T00:00:00`)
  if (periodEnd) salariesQ = salariesQ.lte('created_at', `${periodEnd}T23:59:59`)

  let adSpendQ = supabase.from('ad_spend').select('amount_usd, period_start')
  if (periodStart) adSpendQ = adSpendQ.gte('period_start', periodStart)
  if (periodEnd) adSpendQ = adSpendQ.lte('period_start', periodEnd)

  let closedDealsQ = supabase.from('deals').select('revenue_total, outcome, created_at').eq('outcome', 'closed')
  if (periodStart) closedDealsQ = closedDealsQ.gte('created_at', `${periodStart}T00:00:00`)
  if (periodEnd) closedDealsQ = closedDealsQ.lte('created_at', `${periodEnd}T23:59:59`)

  let allDealsQ = supabase.from('deals').select('id, created_at')
  if (periodStart) allDealsQ = allDealsQ.gte('created_at', `${periodStart}T00:00:00`)
  if (periodEnd) allDealsQ = allDealsQ.lte('created_at', `${periodEnd}T23:59:59`)

  let setsQ = supabase.from('sets').select('*', { count: 'exact', head: true })
  if (periodStart) setsQ = setsQ.gte('created_at', `${periodStart}T00:00:00`)
  if (periodEnd) setsQ = setsQ.lte('created_at', `${periodEnd}T23:59:59`)

  let clientsQ = supabase.from('clients').select('*', { count: 'exact', head: true })
  if (periodStart) clientsQ = clientsQ.gte('created_at', `${periodStart}T00:00:00`)
  if (periodEnd) clientsQ = clientsQ.lte('created_at', `${periodEnd}T23:59:59`)

  const [
    { data: payments },
    { data: expenses },
    { data: commissions },
    { data: salaryPayments },
    { data: adSpends },
    { data: closedDeals },
    { data: allDeals },
    { count: setsTotal },
    { count: clientsTotal },
  ] = await Promise.all([
    paymentsQ, expensesQ, commissionsQ, salariesQ, adSpendQ,
    closedDealsQ, allDealsQ, setsQ, clientsQ,
  ])

  const closedDealsCount = (closedDeals ?? []).length
  const revenue = (closedDeals ?? []).reduce((sum, d) => sum + Number(d.revenue_total ?? 0), 0)
  const cashCollected = (payments ?? []).reduce((sum, p) => sum + Number(p.amount_gross), 0)
  const cashNet = (payments ?? []).reduce((sum, p) => sum + Number(p.amount_net), 0)
  const bankFees = (payments ?? []).reduce((sum, p) => sum + Number(p.fee_amount), 0)
  const totalExpenses = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount_usd), 0)
  const totalCommissions = (commissions ?? []).reduce((sum, c) => sum + Number(c.amount), 0)
  const unpaidCommissions = (commissions ?? []).filter((c) => !c.is_paid).reduce((sum, c) => sum + Number(c.amount), 0)
  const totalSalaries = (salaryPayments ?? []).reduce((sum, s) => sum + Number(s.amount), 0)
  const totalAdSpend = (adSpends ?? []).reduce((sum, a) => sum + Number(a.amount_usd), 0)

  const margin = cashNet - totalExpenses - totalSalaries - totalCommissions - totalAdSpend
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

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

export async function createAdSpend(data: AdSpendFormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('ad_spend').insert(data)
  if (error) throw new Error(error.message)
  revalidatePath('/contabilidad')
}

export async function getExpenses() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false })
  return data ?? []
}

export async function getUnpaidCommissions() {
  const supabase = await createClient()
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
  const supabase = await createClient()
  const { data } = await supabase
    .from('salary_payments')
    .select('*, team_member:profiles!salary_payments_team_member_id_fkey(id, full_name)')
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function markCommissionPaid(commissionId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('commissions')
    .update({
      is_paid: true,
      paid_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', commissionId)

  if (error) throw new Error(error.message)
  revalidatePath('/equipo/planilla')
  revalidatePath('/contabilidad')
}

export async function markSalaryPaid(salaryPaymentId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('salary_payments')
    .update({ status: 'paid' })
    .eq('id', salaryPaymentId)

  if (error) throw new Error(error.message)
  revalidatePath('/equipo/planilla')
  revalidatePath('/contabilidad')
}

export async function generateSalaryPayments(periodLabel: string) {
  const supabase = await createClient()

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
