import { getAuthProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AjustesForm } from '@/components/ajustes/ajustes-form'

export const dynamic = 'force-dynamic'

export default async function AjustesPage() {
  const { user, profile } = await getAuthProfile()
  if (!user || !profile) redirect('/login')

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
