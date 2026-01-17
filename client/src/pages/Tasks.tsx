import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Calendar, CheckCircle2, Circle, AlertCircle, Loader2, Trash2 } from 'lucide-react'
import type { Task, Contact } from '@/types'
import { LoadingState } from '@/components/ui/loading-state'
import { useToast } from '@/hooks/use-toast'

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
  const [search, setSearch] = useState('')
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'media',
    dueDate: '',
    contactId: '',
  })
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await fetch('/api/tasks')
      return res.json()
    },
  })

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await fetch('/api/contacts')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof newTask) => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          contactId: data.contactId ? parseInt(data.contactId) : null,
        }),
      })
      if (!res.ok) throw new Error('Error al crear')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setIsNewTaskOpen(false)
      setNewTask({ title: '', description: '', priority: 'media', dueDate: '', contactId: '' })
      toast({ title: 'Tarea creada', description: 'Se ha agregado a la lista.' })
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la tarea.' })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch('/api/tasks/' + id + '/toggle', { method: 'PATCH' })
      if (!res.ok) throw new Error('Error al actualizar')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch('/api/tasks/' + id, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast({ title: 'Eliminada', description: 'Tarea eliminada.' })
    },
  })

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (filter === 'all') return true
    if (filter === 'pending') return !task.completed
    if (filter === 'completed') return task.completed
    return task.priority === filter
  })

  const pendingCount = tasks.filter((t) => !t.completed).length
  const completedCount = tasks.filter((t) => t.completed).length

  if (isLoading) {
    return <LoadingState message="Cargando tareas..." />
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Tareas</h2>
          <p className="text-muted-foreground">
            {pendingCount} pendientes, {completedCount} completadas
          </p>
        </div>
        <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Tarea
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Tarea</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(newTask) }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">Titulo *</Label>
                <Input
                  id="task-title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Llamar a cliente..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-desc">Descripcion</Label>
                <Textarea
                  id="task-desc"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Detalles de la tarea..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-priority">Prioridad</Label>
                  <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                    <SelectTrigger id="task-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-date">Fecha limite</Label>
                  <Input
                    id="task-date"
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-contact">Contacto relacionado</Label>
                <Select value={newTask.contactId} onValueChange={(v) => setNewTask({ ...newTask, contactId: v })}>
                  <SelectTrigger id="task-contact">
                    <SelectValue placeholder="Seleccionar contacto" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsNewTaskOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !newTask.title} className="flex-1">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Buscar tareas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
          aria-label="Buscar tareas"
        />
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
        <Card className="animate-in fade-in duration-300">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay tareas</p>
            <Button variant="link" onClick={() => setIsNewTaskOpen(true)}>
              Crear una nueva tarea
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task, index) => {
            const PriorityIcon = priorityIcons[task.priority]
            return (
              <Card
                key={task.id}
                className="animate-in slide-in-from-left duration-300 transition-all hover:shadow-md group"
                style={{ animationDelay: index * 30 + 'ms' }}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <button
                    className="flex-shrink-0 transition-transform hover:scale-110"
                    onClick={() => toggleMutation.mutate(task.id)}
                    aria-label={task.completed ? 'Marcar como pendiente' : 'Marcar como completada'}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={task.completed ? 'font-medium line-through text-muted-foreground' : 'font-medium'}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                    )}
                    {task.contact && (
                      <p className="text-sm text-muted-foreground">Contacto: {task.contact.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={priorityColors[task.priority]}>
                      <PriorityIcon className="mr-1 h-3 w-3" />
                      {task.priority}
                    </Badge>
                    {task.dueDate && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      aria-label="Eliminar tarea"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
