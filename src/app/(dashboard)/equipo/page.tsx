import { createClient, getAuthProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TeamList } from '@/components/equipo/team-list'

export const dynamic = 'force-dynamic'

export default async function EquipoPage() {
  const { user, profile } = await getAuthProfile()
  if (!user || !profile) redirect('/login')
  if (profile.role !== 'admin') redirect('/')

  const supabase = await createClient()
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
