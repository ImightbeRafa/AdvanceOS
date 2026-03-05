'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Auth Error]', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Error de autenticación</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Ocurrió un error inesperado. Intentá de nuevo.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Reintentar</Button>
        <Button variant="outline" onClick={() => (window.location.href = '/login')}>
          Ir al login
        </Button>
      </div>
    </div>
  )
}
