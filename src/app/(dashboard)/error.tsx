'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Algo salió mal</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Ocurrió un error inesperado. Intentá de nuevo o recargá la página.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">Código: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Reintentar</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Recargar página
        </Button>
      </div>
    </div>
  )
}
