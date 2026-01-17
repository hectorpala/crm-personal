import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Target, CheckSquare, DollarSign, Calendar, User } from 'lucide-react'
import { useStore } from '@/store'
import { contactsAPI, opportunitiesAPI, tasksAPI } from '@/lib/api'
import type { Contact, Opportunity, Task } from '@/types'
import { Link } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { getCategoryColor } from '@/lib/category-styles'

export default function Dashboard() {
  const {
    contacts, setContacts,
    opportunities, setOpportunities,
    tasks, setTasks
  } = useStore()
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [contactsData, opportunitiesData, tasksData] = await Promise.all([
        contactsAPI.getAll() as Promise<Contact[]>,
        opportunitiesAPI.getAll() as Promise<Opportunity[]>,
        tasksAPI.getAll() as Promise<Task[]>,
      ])
      setContacts(contactsData)
      setOpportunities(opportunitiesData)
      setTasks(tasksData)
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

  const recentContacts = useMemo(() => {
    return [...contacts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [contacts])

  const upcomingTasks = useMemo(() => {
    return [...tasks]
      .filter(t => !t.completed)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5)
  }, [tasks])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return 'Hoy'
    if (date.toDateString() === tomorrow.toDateString()) return 'Mañana'

    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'destructive'
      case 'media': return 'default'
      default: return 'secondary'
    }
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

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.name} to={stat.href}>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Contacts & Upcoming Tasks */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contactos Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay contactos aun
              </p>
            ) : (
              <div className="space-y-3">
                {recentContacts.map((contact) => (
                  <Link key={contact.id} to={`/contacts/${contact.id}`}>
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {contact.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{contact.name}</p>
                          <p className="text-xs text-muted-foreground">{contact.company || contact.email}</p>
                        </div>
                      </div>
                      <Badge className={getCategoryColor(contact.category)}>
                        {contact.category}
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
                          {task.contact && ` - ${task.contact.name}`}
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
      </div>
    </div>
  )
}
