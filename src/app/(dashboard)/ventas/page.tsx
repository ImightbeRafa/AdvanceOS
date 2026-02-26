import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VentasDashboard } from '@/components/ventas/ventas-dashboard'

export const dynamic = 'force-dynamic'

export default async function VentasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'setter', 'closer'].includes(profile.role)) {
    redirect('/')
  }

  const { data: sets } = await supabase
    .from('sets')
    .select(`
      *,
      setter:profiles!sets_setter_id_fkey(id, full_name),
      closer:profiles!sets_closer_id_fkey(id, full_name),
      deal:deals(*)
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  const { data: payments } = await supabase
    .from('payments')
    .select('set_id, amount_gross, amount_net, payment_date')

  const paymentsBySet = (payments ?? []).reduce<Record<string, { totalGross: number; totalNet: number }>>((acc, p) => {
    if (!acc[p.set_id]) acc[p.set_id] = { totalGross: 0, totalNet: 0 }
    acc[p.set_id].totalGross += Number(p.amount_gross)
    acc[p.set_id].totalNet += Number(p.amount_net)
    return acc
  }, {})

  const { data: closers } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('role', ['closer', 'admin'])
    .eq('active', true)

  const { data: setters } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('role', ['setter', 'admin'])
    .eq('active', true)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ventas</h1>
          <p className="text-muted-foreground">
            Pipeline de ventas: setting, closing, pendientes y estadísticas.
          </p>
        </div>
      </div>
      <VentasDashboard
        sets={sets ?? []}
        closers={closers ?? []}
        setters={setters ?? []}
        paymentsBySet={paymentsBySet}
        userRole={profile.role}
      />
    </div>
  )
}
