import { createClient, getAuthProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClientesList } from '@/components/clientes/clientes-list'

export const dynamic = 'force-dynamic'

export default async function ClientesPage() {
  const { user, profile } = await getAuthProfile()
  if (!user || !profile) redirect('/login')
  if (!['admin', 'closer', 'delivery'].includes(profile.role)) redirect('/')

  const supabase = await createClient()

  const [{ data: clients }, { data: payments }, { data: deals }, { data: phases }] = await Promise.all([
    supabase
      .from('clients')
      .select('*, assigned_member:profiles!clients_assigned_to_fkey(id, full_name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('payments')
      .select('client_id, amount_gross'),
    supabase
      .from('deals')
      .select('id, revenue_total'),
    supabase
      .from('advance90_phases')
      .select('client_id, phase_name, start_date, end_date, order')
      .order('order'),
  ])

  const paymentsByClient = (payments ?? []).reduce<Record<string, number>>((acc, p) => {
    if (p.client_id) {
      acc[p.client_id] = (acc[p.client_id] ?? 0) + Number(p.amount_gross)
    }
    return acc
  }, {})

  const revenueByDeal = (deals ?? []).reduce<Record<string, number>>((acc, d) => {
    acc[d.id] = Number(d.revenue_total ?? 0)
    return acc
  }, {})

  const phasesByClient = (phases ?? []).reduce<Record<string, { phase_name: string; start_date: string; end_date: string; order: number }[]>>((acc, p) => {
    if (!acc[p.client_id]) acc[p.client_id] = []
    acc[p.client_id].push({ phase_name: p.phase_name, start_date: p.start_date, end_date: p.end_date, order: p.order })
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
        phasesByClient={phasesByClient}
        userRole={profile.role}
      />
    </div>
  )
}
