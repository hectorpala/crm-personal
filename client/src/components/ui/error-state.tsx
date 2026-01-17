import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  /** Título del error */
  title?: string
  /** Descripción del error */
  description?: string
  /** Función para reintentar */
  onRetry?: () => void
  /** Tamaño del contenedor */
  size?: 'card' | 'page'
  /** Clases adicionales */
  className?: string
}

export function ErrorState({
  title = 'Error al cargar',
  description = 'Ocurrió un problema al cargar los datos.',
  onRetry,
  size = 'card',
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        size === 'card' ? 'h-64 p-6' : 'min-h-[50vh] p-8',
        className
      )}
    >
      <AlertCircle className="h-10 w-10 text-destructive mb-4" />
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      )}
    </div>
  )
}
