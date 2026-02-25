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
    .limit(200)

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
            Gestión de sets, deals y pipeline de ventas.
          </p>
        </div>
      </div>
      <VentasDashboard
        sets={sets ?? []}
        closers={closers ?? []}
        setters={setters ?? []}
        userRole={profile.role}
      />
    </div>
  )
}
