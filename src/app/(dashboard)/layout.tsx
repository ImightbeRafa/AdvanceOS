import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUnreadNotificationCount, getRecentNotifications } from '@/lib/actions/notifications'

export const dynamic = 'force-dynamic'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  const [notificationCount, recentNotifications] = await Promise.all([
    getUnreadNotificationCount(),
    getRecentNotifications(),
  ])

  return (
    <DashboardShell
      profile={profile}
      notificationCount={notificationCount}
      notifications={recentNotifications}
    >
      {children}
    </DashboardShell>
  )
}
