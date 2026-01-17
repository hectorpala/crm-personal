import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Calendar, CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import type { Task } from '@/types'

const priorityColors: Record<string, string> = {
  baja: 'bg-gray-100 text-gray-800',
  media: 'bg-yellow-100 text-yellow-800',
  alta: 'bg-red-100 text-red-800',
}

const priorityIcons: Record<string, typeof AlertCircle> = {
  baja: Circle,
  media: AlertCircle,
  alta: AlertCircle,
}

export default function Tasks() {
  const [filter, setFilter] = useState<string>('all')
  const [tasks] = useState<Task[]>([])

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true
    if (filter === 'pending') return !task.completed
    if (filter === 'completed') return task.completed
    return task.priority === filter
  })

  const pendingCount = tasks.filter((t) => !t.completed).length
  const completedCount = tasks.filter((t) => t.completed).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Tareas</h2>
          <p className="text-muted-foreground">
            {pendingCount} pendientes, {completedCount} completadas
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Tarea
        </Button>
      </div>

      <div className="flex gap-4">
        <Input placeholder="Buscar tareas..." className="max-w-sm" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="completed">Completadas</SelectItem>
            <SelectItem value="alta">Prioridad Alta</SelectItem>
            <SelectItem value="media">Prioridad Media</SelectItem>
            <SelectItem value="baja">Prioridad Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay tareas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const PriorityIcon = priorityIcons[task.priority]
            return (
              <Card key={task.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <button className="flex-shrink-0">
                    {task.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={task.completed ? 'font-medium line-through text-muted-foreground' : 'font-medium'}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {task.description}
                      </p>
                    )}
                    {task.contact && (
                      <p className="text-sm text-muted-foreground">
                        Contacto: {task.contact.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={priorityColors[task.priority]}>
                      <PriorityIcon className="mr-1 h-3 w-3" />
                      {task.priority}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
