import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  FileSpreadsheet,
  Mail,
  MessageSquare,
  Loader2,
  LogOut
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { LoadingState } from '@/components/ui/loading-state'

interface GoogleStatus {
  connected: boolean
  email: string | null
  spreadsheetId: string | null
}

export default function Settings() {
  const [spreadsheetId, setSpreadsheetId] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ imported: number; updated: number } | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: googleStatus, isLoading, refetch: refetchStatus } = useQuery<GoogleStatus>({
    queryKey: ['google-status'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/google-sheets/status')
      return res.json()
    },
  })

  useEffect(() => {
    if (googleStatus?.spreadsheetId) {
      setSpreadsheetId(googleStatus.spreadsheetId)
    }
  }, [googleStatus?.spreadsheetId])

  const handleConnect = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/google-sheets/auth-url')
      const data = await res.json()
      if (data.authUrl) {
        window.open(data.authUrl, '_blank', 'width=500,height=600')
        const pollInterval = setInterval(async () => {
          const statusRes = await fetch('http://localhost:3000/api/google-sheets/status')
          const status = await statusRes.json()
          if (status.connected) {
            clearInterval(pollInterval)
            refetchStatus()
            toast({
              title: 'Cuenta conectada',
              description: 'Tu cuenta de Google se ha conectado correctamente.',
            })
          }
        }, 2000)
        setTimeout(() => clearInterval(pollInterval), 120000)
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error de conexion',
        description: 'No se pudo obtener la URL de autenticacion. Verifica tu conexion.',
      })
    }
  }

  const handleDisconnect = async () => {
    try {
      await fetch('http://localhost:3000/api/google-sheets/disconnect', { method: 'DELETE' })
      refetchStatus()
      setSyncResult(null)
      toast({
        title: 'Cuenta desconectada',
        description: 'Tu cuenta de Google se ha desconectado.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al desconectar',
        description: 'No se pudo desconectar la cuenta de Google.',
      })
    }
  }

  const handleSync = async () => {
    if (!spreadsheetId) {
      toast({
        variant: 'destructive',
        title: 'ID requerido',
        description: 'Ingresa el ID del Spreadsheet para sincronizar.',
      })
      return
    }
    setIsSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('http://localhost:3000/api/google-sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId }),
      })
      const data = await res.json()
      if (data.error) {
        toast({
          variant: 'destructive',
          title: 'Error de sincronizacion',
          description: data.error,
        })
      } else {
        setSyncResult({ imported: data.imported, updated: data.updated })
        queryClient.invalidateQueries({ queryKey: ['contacts'] })
        toast({
          title: 'Sincronizacion completada',
          description: `${data.imported} nuevos contactos, ${data.updated} actualizados.`,
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al sincronizar',
        description: 'Ocurrio un error de conexion. Intenta de nuevo.',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const openSpreadsheet = () => {
    if (spreadsheetId) {
      window.open('https://docs.google.com/spreadsheets/d/' + spreadsheetId, '_blank')
    }
  }

  if (isLoading) {
    return <LoadingState message="Cargando configuracion..." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Configuracion</h2>
        <p className="text-muted-foreground">
          Configura las integraciones y preferencias del CRM
        </p>
      </div>

      <div className="grid gap-6">
        {/* Google Account */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-6 w-6 text-red-500" />
                <div>
                  <CardTitle>Cuenta de Google</CardTitle>
                  <CardDescription>
                    Conecta tu cuenta para sincronizar Sheets y enviar emails
                  </CardDescription>
                </div>
              </div>
              {googleStatus?.connected ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="outline">
                  <XCircle className="mr-1 h-3 w-3" />
                  Desconectado
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {googleStatus?.connected ? (
              <>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{googleStatus.email || 'Cuenta conectada'}</p>
                    <p className="text-sm text-muted-foreground">Gmail y Google Sheets</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDisconnect}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Desconectar
                  </Button>
                </div>
              </>
            ) : (
              <Button onClick={handleConnect}>
                Conectar con Google
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Se usara para sincronizar contactos desde Google Sheets y enviar emails desde Gmail
            </p>
          </CardContent>
        </Card>

        {/* Google Sheets Sync */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-6 w-6 text-green-600" />
                <div>
                  <CardTitle>Google Sheets</CardTitle>
                  <CardDescription>
                    Sincroniza contactos desde tu hoja de calculo
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="spreadsheet-id">ID del Spreadsheet</Label>
              <div className="flex gap-2">
                <Input
                  id="spreadsheet-id"
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                />
                <Button variant="outline" onClick={openSpreadsheet} disabled={!spreadsheetId}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Encuentra el ID en la URL de tu Google Sheet
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSync}
                disabled={!googleStatus?.connected || isSyncing}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sincronizar Ahora
                  </>
                )}
              </Button>
            </div>
            {syncResult && (
              <div className="p-3 bg-green-50 text-green-800 rounded-lg text-sm">
                <CheckCircle2 className="inline mr-2 h-4 w-4" />
                {syncResult.imported} nuevos contactos importados, {syncResult.updated} actualizados
              </div>
            )}
            {!googleStatus?.connected && (
              <p className="text-sm text-amber-600">
                Conecta tu cuenta de Google primero para sincronizar
              </p>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-6 w-6 text-green-500" />
                <div>
                  <CardTitle>WhatsApp</CardTitle>
                  <CardDescription>
                    Envia mensajes de WhatsApp a tus contactos
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Disponible
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Los mensajes de WhatsApp se envian generando links de wa.me que abren WhatsApp Web o la app directamente.
              No requiere configuracion adicional.
            </p>
          </CardContent>
        </Card>

        {/* Sync Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Sincronizacion Automatica</CardTitle>
            <CardDescription>
              Los contactos se sincronizan automaticamente al entrar a la pagina de Contactos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-sync al cargar</p>
                <p className="text-sm text-muted-foreground">
                  Actualiza contactos cada vez que entras a Contactos
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800">Activo</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
