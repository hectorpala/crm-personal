import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Mail, MessageCircle, Send, Loader2, CheckCircle2, ExternalLink } from 'lucide-react'
import type { Contact } from '@/types'
import { useToast } from '@/hooks/use-toast'

export default function Messaging() {
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [selectedContacts, setSelectedContacts] = useState<number[]>([])
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<{ sent?: number; failed?: number; links?: any[] } | null>(null)
  const { toast } = useToast()

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await fetch('/api/contacts')
      return res.json()
    },
  })

  // Get unique cities
  const cities = [...new Set(contacts.map(c => c.tags?.[1]).filter(Boolean))]

  // Filter contacts by city and valid contact info
  const filteredContacts = contacts.filter(contact => {
    const matchesCity = cityFilter === 'all' || contact.tags?.includes(cityFilter)
    if (channel === 'email') {
      return matchesCity && contact.email && !contact.email.includes('@phone') && !contact.email.includes('@whatsapp')
    } else {
      return matchesCity && contact.phone
    }
  })

  const toggleContact = (id: number) => {
    setSelectedContacts(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    setSelectedContacts(filteredContacts.map(c => c.id))
  }

  const deselectAll = () => {
    setSelectedContacts([])
  }

  const handleSend = async () => {
    if (selectedContacts.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Sin destinatarios',
        description: 'Selecciona al menos un contacto para enviar el mensaje.',
      })
      return
    }
    if (!message) {
      toast({
        variant: 'destructive',
        title: 'Mensaje vacio',
        description: 'Escribe un mensaje antes de enviar.',
      })
      return
    }
    if (channel === 'email' && !subject) {
      toast({
        variant: 'destructive',
        title: 'Asunto requerido',
        description: 'Escribe un asunto para el email.',
      })
      return
    }

    setIsSending(true)
    setResult(null)

    const recipients = selectedContacts
      .map(id => contacts.find(c => c.id === id))
      .filter(Boolean)
      .map(c => ({
        name: c!.name,
        email: c!.email,
        phone: c!.phone,
      }))

    try {
      if (channel === 'email') {
        const res = await fetch('/api/email/send-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipients, subject, message }),
        })
        const data = await res.json()
        setResult({ sent: data.sent, failed: data.failed })
        if (data.sent > 0) {
          toast({
            title: 'Emails enviados',
            description: data.sent + ' emails enviados correctamente.' + (data.failed ? ' ' + data.failed + ' fallidos.' : ''),
          })
        }
      } else {
        const res = await fetch('/api/whatsapp/generate-bulk-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipients, message }),
        })
        const data = await res.json()
        setResult({ links: data.links })
        toast({
          title: 'Links generados',
          description: data.links.length + ' links de WhatsApp listos para usar.',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al enviar',
        description: 'No se pudieron enviar los mensajes. Verifica tu conexion.',
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Mensajeria Masiva</h2>
        <p className="text-muted-foreground">
          Envia emails o mensajes de WhatsApp a multiples contactos
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Message Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Componer Mensaje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select value={channel} onValueChange={(v: 'email' | 'whatsapp') => {
                setChannel(v)
                setSelectedContacts([])
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email (Gmail)
                    </div>
                  </SelectItem>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {channel === 'email' && (
              <div className="space-y-2">
                <Label>Asunto</Label>
                <Input 
                  placeholder="Asunto del email"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Mensaje</Label>
              <Textarea
                placeholder="Escribe tu mensaje. Usa {{name}} para personalizar con el nombre del contacto."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Tip: Usa {'{{name}}'} para incluir el nombre del contacto
              </p>
            </div>

            <Button 
              onClick={handleSend} 
              disabled={isSending || selectedContacts.length === 0}
              className="w-full"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {channel === 'email' ? 'Enviar Emails' : 'Generar Links de WhatsApp'} ({selectedContacts.length})
                </>
              )}
            </Button>

            {/* Results */}
            {result && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  {result.sent !== undefined && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>{result.sent} emails enviados</span>
                      {result.failed ? <span className="text-red-600">({result.failed} fallidos)</span> : null}
                    </div>
                  )}
                  {result.links && (
                    <div className="space-y-2">
                      <p className="font-medium">{result.links.length} links generados:</p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {result.links.map((link, i) => (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {link.name} - {link.phone}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Contact Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Seleccionar Contactos ({selectedContacts.length}/{filteredContacts.length})
              </CardTitle>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Ciudad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city} value={city!}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Seleccionar todos
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Deseleccionar
              </Button>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filteredContacts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay contactos con {channel === 'email' ? 'email' : 'telefono'} disponible
                </p>
              ) : (
                filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => toggleContact(contact.id)}
                  >
                    <Checkbox 
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={() => toggleContact(contact.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{contact.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {channel === 'email' ? contact.email : contact.phone}
                        {contact.tags?.[1] && ' - ' + contact.tags[1]}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
