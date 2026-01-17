import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Settings, DollarSign } from 'lucide-react'
import type { PipelineStage, Opportunity } from '@/types'

const defaultStages: PipelineStage[] = [
  { id: 1, name: 'Lead', order: 1, color: '#94a3b8' },
  { id: 2, name: 'Contactado', order: 2, color: '#60a5fa' },
  { id: 3, name: 'Propuesta', order: 3, color: '#fbbf24' },
  { id: 4, name: 'Negociacion', order: 4, color: '#f97316' },
  { id: 5, name: 'Cerrado', order: 5, color: '#22c55e' },
]

export default function Pipeline() {
  const [stages] = useState<PipelineStage[]>(defaultStages)
  const [opportunities] = useState<Opportunity[]>([])

  const getOpportunitiesByStage = (stageName: string) => {
    return opportunities.filter((opp) => opp.stage === stageName)
  }

  const getTotalByStage = (stageName: string) => {
    return getOpportunitiesByStage(stageName).reduce(
      (sum, opp) => sum + opp.value,
      0
    )
  }

  const formatCurrency = (value: number) => value.toLocaleString()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Pipeline</h2>
          <p className="text-muted-foreground">
            Gestiona tus oportunidades de venta
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Configurar Etapas
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Oportunidad
          </Button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <div key={stage.id} className="flex-shrink-0 w-72">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <CardTitle className="text-sm font-medium">
                      {stage.name}
                    </CardTitle>
                  </div>
                  <Badge variant="secondary">
                    {getOpportunitiesByStage(stage.name).length}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  {formatCurrency(getTotalByStage(stage.name))}
                </div>
              </CardHeader>
              <CardContent className="min-h-[400px]">
                {getOpportunitiesByStage(stage.name).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Sin oportunidades
                  </p>
                ) : (
                  <div className="space-y-2">
                    {getOpportunitiesByStage(stage.name).map((opp) => (
                      <Card key={opp.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          <p className="font-medium text-sm">{opp.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {opp.contact?.name}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm font-semibold">
                              ${formatCurrency(opp.value)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {opp.probability}%
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}
