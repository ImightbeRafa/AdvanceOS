import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AjustesForm } from '@/components/ajustes/ajustes-form'

export const dynamic = 'force-dynamic'

export default async function AjustesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground">
          Configuración de la cuenta y preferencias.
        </p>
      </div>
      <AjustesForm profile={profile} />
    </div>
  )
}
