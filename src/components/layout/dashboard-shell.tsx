'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Sidebar } from './sidebar'
import { TopBar } from './topbar'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

const GlobalSearch = dynamic(() => import('@/components/shared/global-search').then(m => ({ default: m.GlobalSearch })))
const FeedbackWidget = dynamic(() => import('@/components/feedback/feedback-widget').then(m => ({ default: m.FeedbackWidget })))

interface DashboardShellProps {
  children: React.ReactNode
  profile: Profile
}

export function DashboardShell({ children, profile }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={profile.role} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div
        className={cn(
          'transition-all duration-200',
          collapsed ? 'ml-16' : 'ml-56'
        )}
      >
        <TopBar profile={profile} collapsed={collapsed} />
        <main className="p-6">{children}</main>
      </div>
      <GlobalSearch />
      <FeedbackWidget />
    </div>
  )
}
