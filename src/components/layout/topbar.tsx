'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Bell,
  Plus,
  LogOut,
  User,
  CheckCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { markNotificationRead, markAllNotificationsRead } from '@/lib/actions/notifications'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS } from '@/lib/constants'
import { formatTimeAgo } from '@/lib/utils/dates'
import type { Profile, Notification } from '@/types'

interface TopBarProps {
  profile: Profile
  collapsed: boolean
  notificationCount: number
  notifications: Notification[]
}

export function TopBar({ profile, collapsed, notificationCount, notifications }: TopBarProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead()
      router.refresh()
    })
  }

  function handleNotificationClick(n: Notification) {
    startTransition(async () => {
      if (!n.read) {
        await markNotificationRead(n.id)
      }
      if (n.action_url) {
        router.push(n.action_url)
      }
      router.refresh()
    })
  }

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-64 justify-start gap-2 text-muted-foreground"
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
          }}
        >
          <Search className="h-4 w-4" />
          <span className="text-sm">Buscar...</span>
          <kbd className="ml-auto pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:flex">
            Ctrl+K
          </kbd>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Acción rápida</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-surface-2">
            <DropdownMenuItem onClick={() => router.push('/ventas?crear=true')}>
              Crear set
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/ventas?registrar_pago=true')}>
              Registrar pago
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/clientes')}>
              Ver clientes
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {notificationCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center"
                >
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-surface-2 w-80">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-medium">Notificaciones</span>
              {notificationCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleMarkAllRead}
                  disabled={isPending}
                >
                  <CheckCheck className="h-3 w-3" />
                  Marcar todas
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                Sin notificaciones
              </div>
            ) : (
              notifications.map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  className={`flex flex-col items-start gap-0.5 px-3 py-2 cursor-pointer ${!n.read ? 'bg-primary/5' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <span className="text-sm font-medium">{n.title}</span>
                  <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                  <span className="text-[10px] text-muted-foreground/60">{formatTimeAgo(n.created_at)}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start sm:flex">
                <span className="text-xs font-medium">{profile.full_name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {ROLE_LABELS[profile.role]}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-surface-2 w-48">
            <DropdownMenuItem onClick={() => router.push('/ajustes')}>
              <User className="mr-2 h-4 w-4" />
              Mi perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
