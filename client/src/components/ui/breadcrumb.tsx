import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm', className)}
    >
      <ol className="flex items-center gap-1">
        <li>
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Inicio"
          >
            <Home className="h-4 w-4" />
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={index} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              {isLast || !item.href ? (
                <span
                  className={cn(
                    'font-medium',
                    isLast ? 'text-foreground' : 'text-muted-foreground'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
