import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Target, CheckSquare, DollarSign, Calendar, Bell, MessageCircle } from 'lucide-react'
import { useStore } from '@/store'
import { contactsAPI, opportunitiesAPI, tasksAPI } from '@/lib/api'
import type { Contact, Opportunity, Task } from '@/types'
import { Link } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'

export default function Dashboard() {
  const {
    contacts, setContacts,
    opportunities, setOpportunities,
    tasks, setTasks
  } = useStore()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const [recentConversationContacts, setRecentConversationContacts] = useState<any[]>([])

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [contactsData, opportunitiesData, tasksData, recentRes] = await Promise.all([
        contactsAPI.getAll() as Promise<Contact[]>,
        opportunitiesAPI.getAll() as Promise<Opportunity[]>,
        tasksAPI.getAll() as Promise<Task[]>,
        fetch('/api/conversations/recent?limit=10').then(r => r.json()),
      ])
      setContacts(contactsData)
      setOpportunities(opportunitiesData)
      setTasks(tasksData)
      setRecentConversationContacts(recentRes)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar datos del dashboard'
      setError(message)
      toast({
        variant: 'destructive',
        title: 'Error al cargar',
        description: message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [setContacts, setOpportunities, setTasks])

  const stats = useMemo(() => {
    const activeOpportunities = opportunities.filter(o =>
      !['ganada', 'perdida', 'won', 'lost'].includes(o.stage.toLowerCase())
    )
    const pendingTasks = tasks.filter(t => !t.completed)
    const totalPipelineValue = activeOpportunities.reduce((sum, o) => sum + (o.value || 0), 0)

    return [
      {
        name: 'Total Contactos',
        value: contacts.length.toString(),
        icon: Users,
        color: 'text-blue-600',
        href: '/contacts'
      },
      {
        name: 'Oportunidades Activas',
        value: activeOpportunities.length.toString(),
        icon: Target,
        color: 'text-green-600',
        href: '/pipeline'
      },
      {
        name: 'Tareas Pendientes',
        value: pendingTasks.length.toString(),
        icon: CheckSquare,
        color: 'text-orange-600',
        href: '/tasks'
      },
      {
        name: 'Valor Pipeline',
        value: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(totalPipelineValue),
        icon: DollarSign,
        color: 'text-purple-600',
        href: '/pipeline'
      },
    ]
  }, [contacts, opportunities, tasks])

  const upcomingTasks = useMemo(() => {
    return [...tasks]
      .filter(t => !t.completed)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5)
  }, [tasks])

  const upcomingFollowups = useMemo(() => {
    const now = new Date()
    return [...opportunities]
      .filter(o => o.nextFollowup && new Date(o.nextFollowup) >= now)
      .sort((a, b) => new Date(a.nextFollowup!).getTime() - new Date(b.nextFollowup!).getTime())
      .slice(0, 5)
  }, [opportunities])


  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return 'Hoy'
    if (date.toDateString() === tomorrow.toDateString()) return 'Manana'

    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'destructive'
      case 'media': return 'default'
      default: return 'secondary'
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(value)
  }


  if (isLoading) {
    return <LoadingState message="Cargando dashboard..." />
  }

  if (error) {
    return (
      <ErrorState
        title="Error al cargar el dashboard"
        description={error}
        onRetry={loadData}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="text-muted-foreground">Resumen de tu CRM personal</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.name} to={stat.href}>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
                <stat.icon className={'h-4 w-4 ' + stat.color} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Contactos con Conversaciones Recientes - Grid de 10 columnas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Conversaciones Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentConversationContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay conversaciones recientes
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
              {recentConversationContacts.map((item) => (
                <Link key={item.id} to={item.contact ? '/contacts/' + item.contact.id : '/contacts'}>
                  <div className="flex flex-col items-center p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors text-center">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                      {item.contact?.name ? (
                        <span className="text-lg font-medium text-green-700">
                          {item.contact.name.charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <MessageCircle className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <p className="text-xs font-medium truncate w-full">
                      {item.contact?.name || 'Desconocido'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDateTime(item.createdAt)}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate w-full mt-1">
                      {item.content?.substring(0, 20)}...
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Tareas Proximas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay tareas pendientes
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <Link key={task.id} to="/tasks">
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(task.dueDate)}
                          {task.contact && ' - ' + task.contact.name}
                        </p>
                      </div>
                      <Badge variant={getPriorityColor(task.priority) as any}>
                        {task.priority}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Proximos Seguimientos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingFollowups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay seguimientos programados
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingFollowups.map((opportunity) => (
                  <Link key={opportunity.id} to="/pipeline">
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                          <Bell className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{opportunity.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(opportunity.nextFollowup!)}
                            {opportunity.contact && ' - ' + opportunity.contact.name}
                          </p>
                        </div>
                      </div>
                      {opportunity.value > 0 && (
                        <span className="text-xs font-medium text-green-600">
                          {'$' + formatCurrency(opportunity.value)}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
