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
  LogOut,
  
  QrCode,
  Smartphone
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { LoadingState } from '@/components/ui/loading-state'

interface GoogleStatus {
  connected: boolean
  email: string | null
  spreadsheetId: string | null
}

interface WhatsAppStatus {
  mode: 'local' | 'cloud'
  configured: boolean
  connected?: boolean
  qrCode?: string
  phoneNumber?: string
  verifiedName?: string
  error?: string
  message?: string
}

export default function Settings() {
  const [spreadsheetId, setSpreadsheetId] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ imported: number; updated: number } | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: googleStatus, isLoading, refetch: refetchStatus } = useQuery<GoogleStatus>({
    queryKey: ['google-status'],
    queryFn: async () => {
      const res = await fetch('/api/google-sheets/status')
      return res.json()
    },
  })

  const { data: whatsappStatus, isLoading: isLoadingWA, refetch: refetchWA } = useQuery<WhatsAppStatus>({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const res = await fetch('/api/whatsapp/status')
      return res.json()
    },
    
  })

  useEffect(() => {
    if (googleStatus?.spreadsheetId) {
      setSpreadsheetId(googleStatus.spreadsheetId)
    }
  }, [googleStatus?.spreadsheetId])

  // Poll for status while QR is showing
  useEffect(() => {
    if (whatsappStatus?.qrCode && !whatsappStatus?.connected) {
      const interval = setInterval(() => refetchWA(), 2000)
      return () => clearInterval(interval)
    }
  }, [whatsappStatus?.qrCode, whatsappStatus?.connected, refetchWA])

  const handleConnect = async () => {
    try {
      const res = await fetch('/api/google-sheets/auth-url')
      const data = await res.json()
      if (data.authUrl) {
        window.open(data.authUrl, '_blank', 'width=500,height=600')
        const pollInterval = setInterval(async () => {
          const statusRes = await fetch('/api/google-sheets/status')
          const status = await statusRes.json()
          if (status.connected) {
            clearInterval(pollInterval)
            refetchStatus()
            toast({ title: 'Cuenta conectada' })
          }
        }, 2000)
        setTimeout(() => clearInterval(pollInterval), 120000)
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error de conexion' })
    }
  }

  const handleDisconnect = async () => {
    try {
      await fetch('/api/google-sheets/disconnect', { method: 'DELETE' })
      refetchStatus()
      setSyncResult(null)
      toast({ title: 'Cuenta desconectada' })
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al desconectar' })
    }
  }

  const handleSync = async () => {
    if (!spreadsheetId) {
      toast({ variant: 'destructive', title: 'ID requerido' })
      return
    }
    setIsSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/google-sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId }),
      })
      const data = await res.json()
      if (data.error) {
        toast({ variant: 'destructive', title: 'Error', description: data.error })
      } else {
        setSyncResult({ imported: data.imported, updated: data.updated })
        queryClient.invalidateQueries({ queryKey: ['contacts'] })
        toast({ title: 'Sincronizacion completada' })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al sincronizar' })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleInitWhatsApp = async () => {
    setIsInitializing(true)
    try {
      await fetch('/api/whatsapp/init', { method: 'POST' })
      toast({ title: 'Inicializando WhatsApp...', description: 'Espera el codigo QR' })
      // Start polling
      setTimeout(() => refetchWA(), 2000)
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al inicializar' })
    } finally {
      setIsInitializing(false)
    }
  }

  const handleDisconnectWhatsApp = async () => {
    try {
      await fetch('/api/whatsapp/disconnect', { method: 'POST' })
      refetchWA()
      toast({ title: 'WhatsApp desconectado' })
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al desconectar' })
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
        <p className="text-muted-foreground">Configura las integraciones del CRM</p>
      </div>

      <div className="grid gap-6">
        {/* WhatsApp Web */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-6 w-6 text-green-500" />
                <div>
                  <CardTitle>WhatsApp</CardTitle>
                  <CardDescription>Conecta tu WhatsApp para enviar mensajes desde el CRM</CardDescription>
                </div>
              </div>
              {isLoadingWA ? (
                <Badge variant="outline"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Verificando...</Badge>
              ) : whatsappStatus?.connected ? (
                <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="mr-1 h-3 w-3" />Conectado</Badge>
              ) : whatsappStatus?.qrCode ? (
                <Badge variant="outline" className="bg-blue-50 text-blue-700"><QrCode className="mr-1 h-3 w-3" />Escanea QR</Badge>
              ) : (
                <Badge variant="outline"><XCircle className="mr-1 h-3 w-3" />Desconectado</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {whatsappStatus?.connected ? (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Smartphone className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">+{whatsappStatus.phoneNumber}</p>
                    {whatsappStatus.verifiedName && (
                      <p className="text-sm text-green-600">{whatsappStatus.verifiedName}</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-green-600 mt-2">Los mensajes se enviaran directamente desde tu WhatsApp</p>
                <Button variant="outline" size="sm" onClick={handleDisconnectWhatsApp} className="mt-3">
                  <LogOut className="mr-2 h-4 w-4" />Desconectar
                </Button>
              </div>
            ) : whatsappStatus?.qrCode ? (
              <div className="flex flex-col items-center p-4 bg-white border rounded-lg">
                <p className="text-sm text-gray-600 mb-3">Escanea con WhatsApp en tu telefono:</p>
                <img src={whatsappStatus.qrCode} alt="QR Code" className="w-48 h-48" />
                <p className="text-xs text-gray-500 mt-3">Abre WhatsApp &gt; Menu &gt; Dispositivos vinculados</p>
              </div>
            ) : (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">
                  Conecta tu WhatsApp para enviar y recibir mensajes directamente desde el CRM.
                </p>
                <Button onClick={handleInitWhatsApp} disabled={isInitializing}>
                  {isInitializing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Iniciando...</>
                  ) : (
                    <><QrCode className="mr-2 h-4 w-4" />Conectar WhatsApp</>
                  )}
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Requiere correr el servidor localmente. Las conversaciones se guardan automaticamente.
            </p>
          </CardContent>
        </Card>

        {/* Google Account */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-6 w-6 text-red-500" />
                <div>
                  <CardTitle>Cuenta de Google</CardTitle>
                  <CardDescription>Conecta para sincronizar Sheets y enviar emails</CardDescription>
                </div>
              </div>
              {googleStatus?.connected ? (
                <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="mr-1 h-3 w-3" />Conectado</Badge>
              ) : (
                <Badge variant="outline"><XCircle className="mr-1 h-3 w-3" />Desconectado</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {googleStatus?.connected ? (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{googleStatus.email || 'Cuenta conectada'}</p>
                  <p className="text-sm text-muted-foreground">Gmail y Google Sheets</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  <LogOut className="mr-2 h-4 w-4" />Desconectar
                </Button>
              </div>
            ) : (
              <Button onClick={handleConnect}>Conectar con Google</Button>
            )}
          </CardContent>
        </Card>

        {/* Google Sheets */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-6 w-6 text-green-600" />
              <div>
                <CardTitle>Google Sheets</CardTitle>
                <CardDescription>Sincroniza contactos desde tu hoja de calculo</CardDescription>
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
            </div>
            <Button onClick={handleSync} disabled={!googleStatus?.connected || isSyncing}>
              {isSyncing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sincronizando...</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4" />Sincronizar Ahora</>
              )}
            </Button>
            {syncResult && (
              <div className="p-3 bg-green-50 text-green-800 rounded-lg text-sm">
                <CheckCircle2 className="inline mr-2 h-4 w-4" />
                {syncResult.imported} nuevos, {syncResult.updated} actualizados
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
