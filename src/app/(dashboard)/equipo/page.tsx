import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TeamList } from '@/components/equipo/team-list'

export const dynamic = 'force-dynamic'

export default async function EquipoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Equipo</h1>
        <p className="text-muted-foreground">
          Directorio del equipo, roles y planilla.
        </p>
      </div>
      <TeamList members={members ?? []} />
    </div>
  )
}
