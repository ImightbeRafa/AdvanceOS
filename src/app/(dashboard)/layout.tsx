import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile } = await getAuthProfile()
  if (!user || !profile) redirect('/login')

  return (
    <DashboardShell profile={profile}>
      {children}
    </DashboardShell>
  )
}
