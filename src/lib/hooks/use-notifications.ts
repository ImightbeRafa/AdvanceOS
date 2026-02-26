'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRecentNotifications, getUnreadNotificationCount } from '@/lib/actions/notifications'

export function useNotifications() {
  const queryClient = useQueryClient()

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getRecentNotifications(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => getUnreadNotificationCount(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['notifications-count'] })
  }

  return { notifications, unreadCount, invalidate }
}
