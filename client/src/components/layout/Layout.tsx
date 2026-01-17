import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  Mail,
  Settings,
  Search,
  Menu,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Contactos', href: '/contacts', icon: Users },
  { name: 'Pipeline', href: '/pipeline', icon: Kanban },
  { name: 'Tareas', href: '/tasks', icon: CheckSquare },
  { name: 'Mensajeria', href: '/messaging', icon: Mail },
  { name: 'Configuracion', href: '/settings', icon: Settings },
]

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  // Check if current path matches or is a child of the nav item
  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return location.pathname === '/'
    }
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-semibold">CRM Personal</h1>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {navigation.map((item) => {
          const isActive = isActiveRoute(item.href)
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                'group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {/* Active indicator - left border */}
              <span
                className={cn(
                  'absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full transition-all',
                  isActive
                    ? 'bg-primary'
                    : 'bg-transparent group-hover:bg-muted-foreground/30'
                )}
              />
              <item.icon className={cn(
                'h-5 w-5 transition-colors',
                isActive ? 'text-primary' : ''
              )} />
              <span>{item.name}</span>
              {/* Active dot indicator */}
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          CRM Personal v1.0
        </p>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
        <h1 className="text-lg font-semibold">CRM Personal</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card transform transition-transform duration-200 ease-in-out md:hidden',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          <SidebarContent />
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r bg-card">
        <div className="flex h-full flex-col">
          <SidebarContent />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="h-full p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
