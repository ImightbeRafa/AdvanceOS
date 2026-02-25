'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { TopBar } from './topbar'
import { GlobalSearch } from '@/components/shared/global-search'
import { cn } from '@/lib/utils'
import type { Profile, Notification } from '@/types'

interface DashboardShellProps {
  children: React.ReactNode
  profile: Profile
  notificationCount: number
  notifications: Notification[]
}

export function DashboardShell({ children, profile, notificationCount, notifications }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={profile.role} />
      <div
        className={cn(
          'transition-all duration-200',
          collapsed ? 'ml-16' : 'ml-56'
        )}
      >
        <TopBar profile={profile} collapsed={collapsed} notificationCount={notificationCount} notifications={notifications} />
        <main className="p-6">{children}</main>
      </div>
      <GlobalSearch />
    </div>
  )
}
