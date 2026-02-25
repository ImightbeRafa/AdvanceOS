import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClientesList } from '@/components/clientes/clientes-list'

export const dynamic = 'force-dynamic'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'closer', 'delivery'].includes(profile.role)) {
    redirect('/')
  }

  const { data: clients } = await supabase
    .from('clients')
    .select(`
      *,
      assigned_member:profiles!clients_assigned_to_fkey(id, full_name)
    `)
    .order('created_at', { ascending: false })

  const { data: payments } = await supabase
    .from('payments')
    .select('client_id, amount_gross')

  const paymentsByClient = (payments ?? []).reduce<Record<string, number>>((acc, p) => {
    if (p.client_id) {
      acc[p.client_id] = (acc[p.client_id] ?? 0) + Number(p.amount_gross)
    }
    return acc
  }, {})

  const { data: deals } = await supabase
    .from('deals')
    .select('id, revenue_total')

  const revenueByDeal = (deals ?? []).reduce<Record<string, number>>((acc, d) => {
    acc[d.id] = Number(d.revenue_total ?? 0)
    return acc
  }, {})

  const { data: tasks } = await supabase
    .from('tasks')
    .select('client_id, title, due_date, status')
    .in('status', ['pendiente', 'en_progreso'])
    .order('due_date', { ascending: true, nullsFirst: false })

  const nextTaskByClient = (tasks ?? []).reduce<Record<string, { title: string; due_date: string | null }>>((acc, t) => {
    if (t.client_id && !acc[t.client_id]) {
      acc[t.client_id] = { title: t.title, due_date: t.due_date }
    }
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">
          Perfiles, delivery y cronogramas de clientes.
        </p>
      </div>
      <ClientesList
        clients={clients ?? []}
        paymentsByClient={paymentsByClient}
        revenueByDeal={revenueByDeal}
        nextTaskByClient={nextTaskByClient}
        userRole={profile.role}
      />
    </div>
  )
}
