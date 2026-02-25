'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ExpenseFormData, AdSpendFormData } from '@/lib/schemas'

export async function getAccountingSummary(periodStart?: string, periodEnd?: string) {
  const supabase = await createClient()

  const { data: payments } = await supabase
    .from('payments')
    .select('amount_gross, amount_net, fee_amount, payment_date')

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount_usd, date')

  const { data: commissions } = await supabase
    .from('commissions')
    .select('amount, is_paid')

  const { data: salaryPayments } = await supabase
    .from('salary_payments')
    .select('amount, status')

  const { data: adSpends } = await supabase
    .from('ad_spend')
    .select('amount_usd')

  const { data: deals } = await supabase
    .from('deals')
    .select('revenue_total, outcome')
    .eq('outcome', 'closed')

  const { count: setsTotal } = await supabase
    .from('sets')
    .select('*', { count: 'exact', head: true })

  const { count: clientsTotal } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })

  const { count: dealsTotal } = await supabase
    .from('deals')
    .select('*', { count: 'exact', head: true })

  const revenue = (deals ?? []).reduce((sum, d) => sum + Number(d.revenue_total ?? 0), 0)
  const cashCollected = (payments ?? []).reduce((sum, p) => sum + Number(p.amount_gross), 0)
  const cashNet = (payments ?? []).reduce((sum, p) => sum + Number(p.amount_net), 0)
  const bankFees = (payments ?? []).reduce((sum, p) => sum + Number(p.fee_amount), 0)
  const totalExpenses = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount_usd), 0)
  const totalCommissions = (commissions ?? []).reduce((sum, c) => sum + Number(c.amount), 0)
  const unpaidCommissions = (commissions ?? []).filter((c) => !c.is_paid).reduce((sum, c) => sum + Number(c.amount), 0)
  const totalSalaries = (salaryPayments ?? []).reduce((sum, s) => sum + Number(s.amount), 0)
  const totalAdSpend = (adSpends ?? []).reduce((sum, a) => sum + Number(a.amount_usd), 0)

  const margin = cashNet - totalExpenses - totalSalaries - totalCommissions
  const totalSets = setsTotal ?? 0
  const totalClients = clientsTotal ?? 0
  const totalDeals = dealsTotal ?? 0

  const costPerClient = totalClients > 0 ? totalAdSpend / totalClients : 0
  const costPerSet = totalSets > 0 ? totalAdSpend / totalSets : 0
  const costPerCall = totalDeals > 0 ? totalAdSpend / totalDeals : 0

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
    costPerClient,
    costPerSet,
    costPerCall,
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
