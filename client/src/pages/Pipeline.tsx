import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Plus, Settings, DollarSign, Loader2, Trash2 } from 'lucide-react'
import type { PipelineStage, Opportunity, Contact } from '@/types'
import { LoadingState } from '@/components/ui/loading-state'
import { useToast } from '@/hooks/use-toast'

const defaultStages: PipelineStage[] = [
  { id: 1, name: 'Lead', order: 1, color: '#94a3b8' },
  { id: 2, name: 'Contactado', order: 2, color: '#60a5fa' },
  { id: 3, name: 'Propuesta', order: 3, color: '#fbbf24' },
  { id: 4, name: 'Negociacion', order: 4, color: '#f97316' },
  { id: 5, name: 'Cerrado', order: 5, color: '#22c55e' },
]

export default function Pipeline() {
  const [isNewOppOpen, setIsNewOppOpen] = useState(false)
  const [newOpp, setNewOpp] = useState({
    title: '',
    contactId: '',
    value: '',
    probability: '50',
    stage: 'Lead',
    notes: '',
  })
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: stages = defaultStages, isLoading: stagesLoading } = useQuery<PipelineStage[]>({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const res = await fetch('/api/opportunities/stages')
      const data = await res.json()
      return data.length > 0 ? data : defaultStages
    },
  })

  const { data: opportunities = [], isLoading: oppsLoading } = useQuery<Opportunity[]>({
    queryKey: ['opportunities'],
    queryFn: async () => {
      const res = await fetch('/api/opportunities')
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
    mutationFn: async (data: typeof newOpp) => {
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          contactId: data.contactId ? parseInt(data.contactId) : null,
          value: parseFloat(data.value) || 0,
          probability: parseInt(data.probability) || 50,
        }),
      })
      if (!res.ok) throw new Error('Error al crear')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      setIsNewOppOpen(false)
      setNewOpp({ title: '', contactId: '', value: '', probability: '50', stage: 'Lead', notes: '' })
      toast({ title: 'Oportunidad creada', description: 'Se ha agregado al pipeline.' })
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la oportunidad.' })
    },
  })

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: number; stage: string }) => {
      const res = await fetch('/api/opportunities/' + id + '/stage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      })
      if (!res.ok) throw new Error('Error al actualizar')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch('/api/opportunities/' + id, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      toast({ title: 'Eliminado', description: 'Oportunidad eliminada.' })
    },
  })

  const getOpportunitiesByStage = (stageName: string) => {
    return opportunities.filter((opp) => opp.stage === stageName)
  }

  const getTotalByStage = (stageName: string) => {
    return getOpportunitiesByStage(stageName).reduce((sum, opp) => sum + opp.value, 0)
  }

  const formatCurrency = (value: number) => '$' + value.toLocaleString()

  const handleDragStart = (e: React.DragEvent, oppId: number) => {
    e.dataTransfer.setData('oppId', oppId.toString())
  }

  const handleDrop = (e: React.DragEvent, stageName: string) => {
    e.preventDefault()
    const oppId = parseInt(e.dataTransfer.getData('oppId'))
    if (oppId) {
      updateStageMutation.mutate({ id: oppId, stage: stageName })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  if (stagesLoading || oppsLoading) {
    return <LoadingState message="Cargando pipeline..." />
  }

  const totalValue = opportunities.reduce((sum, opp) => sum + opp.value, 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Pipeline</h2>
          <p className="text-muted-foreground">
            {opportunities.length} oportunidades · {formatCurrency(totalValue)} total
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isNewOppOpen} onOpenChange={setIsNewOppOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Oportunidad
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Oportunidad</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(newOpp) }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="opp-title">Titulo *</Label>
                  <Input
                    id="opp-title"
                    value={newOpp.title}
                    onChange={(e) => setNewOpp({ ...newOpp, title: e.target.value })}
                    placeholder="Venta de servicio..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opp-contact">Contacto</Label>
                  <Select value={newOpp.contactId} onValueChange={(v) => setNewOpp({ ...newOpp, contactId: v })}>
                    <SelectTrigger id="opp-contact">
                      <SelectValue placeholder="Seleccionar contacto" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="opp-value">Valor ($)</Label>
                    <Input
                      id="opp-value"
                      type="number"
                      value={newOpp.value}
                      onChange={(e) => setNewOpp({ ...newOpp, value: e.target.value })}
                      placeholder="10000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="opp-prob">Probabilidad (%)</Label>
                    <Input
                      id="opp-prob"
                      type="number"
                      min="0"
                      max="100"
                      value={newOpp.probability}
                      onChange={(e) => setNewOpp({ ...newOpp, probability: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opp-stage">Etapa</Label>
                  <Select value={newOpp.stage} onValueChange={(v) => setNewOpp({ ...newOpp, stage: v })}>
                    <SelectTrigger id="opp-stage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opp-notes">Notas</Label>
                  <Textarea
                    id="opp-notes"
                    value={newOpp.notes}
                    onChange={(e) => setNewOpp({ ...newOpp, notes: e.target.value })}
                    placeholder="Detalles adicionales..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsNewOppOpen(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || !newOpp.title} className="flex-1">
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            className="flex-shrink-0 w-72 animate-in slide-in-from-bottom duration-300"
            style={{ animationDelay: index * 50 + 'ms' }}
            onDrop={(e) => handleDrop(e, stage.name)}
            onDragOver={handleDragOver}
          >
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                    <CardTitle className="text-sm font-medium">{stage.name}</CardTitle>
                  </div>
                  <Badge variant="secondary">{getOpportunitiesByStage(stage.name).length}</Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  {formatCurrency(getTotalByStage(stage.name))}
                </div>
              </CardHeader>
              <CardContent className="min-h-[300px] space-y-2">
                {getOpportunitiesByStage(stage.name).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Arrastra oportunidades aqui
                  </p>
                ) : (
                  getOpportunitiesByStage(stage.name).map((opp) => (
                    <Card
                      key={opp.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, opp.id)}
                      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-all group"
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <p className="font-medium text-sm">{opp.title}</p>
                          <button
                            onClick={() => deleteMutation.mutate(opp.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">{opp.contact?.name || 'Sin contacto'}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm font-semibold">{formatCurrency(opp.value)}</span>
                          <Badge variant="outline" className="text-xs">{opp.probability}%</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}
