import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  /** Tamaño del contenedor: 'card' para dentro de cards, 'page' para página completa */
  size?: 'card' | 'page'
  /** Mensaje opcional debajo del spinner */
  message?: string
  /** Clases adicionales */
  className?: string
}

export function LoadingState({ size = 'card', message, className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        size === 'card' ? 'h-64' : 'min-h-[50vh]',
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      {message && (
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  )
}
