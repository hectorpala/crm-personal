import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Search, RefreshCw, Mail, Phone, Loader2, MessageCircle, MapPin, AlertCircle, Send, X, CheckSquare, DollarSign, TrendingUp, Calendar } from 'lucide-react'
import type { Contact } from '@/types'
import { LEAD_SOURCE_OPTIONS } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { LoadingState } from '@/components/ui/loading-state'
import { validators } from '@/components/ui/form-field'
import { getCategoryColor } from '@/lib/category-styles'
import { Checkbox } from '@/components/ui/checkbox'

const cleanPhone = (phone: string) => phone.replace(/[^0-9+]/g, '')

const formatPhoneForWhatsApp = (phone: string) => {
  const cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.length >= 12) return cleaned
  if (cleaned.length === 10) return '52' + cleaned
  return cleaned
}

interface FormErrors {
  name?: string
  email?: string
  phone?: string
  general?: string
}

export default function Contacts() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    category: 'prospecto',
    leadSource: '',
    leadScore: 0,
    potentialValue: 0,
    nextFollowup: '',
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [selectedContacts, setSelectedContacts] = useState<number[]>([])
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [whatsAppMessage, setWhatsAppMessage] = useState('')
  const [selectionMode, setSelectionMode] = useState(false)

  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: contacts = [], isLoading, refetch } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await fetch('/api/contacts')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (contact: typeof newContact) => {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact),
      })
      if (!res.ok) throw new Error('Error al crear contacto')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setIsDialogOpen(false)
      resetForm()
      toast({ title: 'Contacto creado', description: 'El contacto se ha creado correctamente.' })
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error al crear contacto', description: error instanceof Error ? error.message : 'Ocurrio un error' })
    },
  })

  const resetForm = () => {
    setNewContact({ name: '', email: '', phone: '', company: '', address: '', category: 'prospecto', leadSource: '', leadScore: 0, potentialValue: 0, nextFollowup: '' })
    setFormErrors({})
    setTouched({})
  }

  const validateField = (field: string, value: string) => {
    let error: string | undefined
    switch (field) {
      case 'name': error = validators.required(value, 'El nombre'); break
      case 'email': if (value) error = validators.email(value); break
      case 'phone': if (value) error = validators.phone(value); break
    }
    setFormErrors(prev => ({ ...prev, [field]: error }))
    return error
  }

  const handleFieldChange = (field: string, value: string | number) => {
    setNewContact(prev => ({ ...prev, [field]: value }))
    if (touched[field] && typeof value === 'string') validateField(field, value)
  }

  const handleFieldBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const value = newContact[field as keyof typeof newContact]
    if (typeof value === 'string') validateField(field, value)
  }

  const cities = useMemo(() => {
    const citySet = new Set<string>()
    contacts.forEach((c) => { if (c.tags && c.tags.length > 1) citySet.add(c.tags[1]) })
    return Array.from(citySet).sort()
  }, [contacts])

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = contact.name.toLowerCase().includes(search.toLowerCase()) || contact.email.toLowerCase().includes(search.toLowerCase()) || (contact.company?.toLowerCase().includes(search.toLowerCase()) || false)
    const matchesCategory = categoryFilter === 'all' || contact.category === categoryFilter
    const matchesCity = cityFilter === 'all' || (contact.tags && contact.tags.includes(cityFilter))
    return matchesSearch && matchesCategory && matchesCity
  })

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await fetch('/api/google-sheets/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spreadsheetId: '1AjQyoFIdEuGpf2UNZsbMVvg7MNuonwxm8rfdw5yv0eo' }) })
      refetch()
      toast({ title: 'Sincronizacion completada', description: 'Los contactos se han actualizado.' })
    } catch { toast({ variant: 'destructive', title: 'Error', description: 'No se pudo sincronizar.' }) }
    finally { setIsSyncing(false) }
  }

  const handleWhatsApp = (e: React.MouseEvent, phone: string) => { e.preventDefault(); e.stopPropagation(); window.open('https://wa.me/' + formatPhoneForWhatsApp(phone), '_blank') }
  const handleCall = (e: React.MouseEvent, phone: string) => { e.preventDefault(); e.stopPropagation(); window.location.href = 'tel:' + cleanPhone(phone) }
  const handleEmail = (e: React.MouseEvent, email: string) => { e.preventDefault(); e.stopPropagation(); window.location.href = 'mailto:' + email }

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault()
    const errors: FormErrors = {}
    const nameError = validators.required(newContact.name, 'El nombre')
    if (nameError) errors.name = nameError
    if (newContact.email) { const err = validators.email(newContact.email); if (err) errors.email = err }
    if (newContact.phone) { const err = validators.phone(newContact.phone); if (err) errors.phone = err }
    if (!newContact.email && !newContact.phone) errors.general = 'Se requiere email o telefono'
    setFormErrors(errors)
    setTouched({ name: true, email: true, phone: true })
    if (Object.keys(errors).length > 0) { if (errors.general) toast({ variant: 'destructive', title: 'Datos incompletos', description: errors.general }); return }
    createMutation.mutate(newContact)
  }

  const toggleContactSelection = (id: number, e?: React.MouseEvent) => { if (e) { e.preventDefault(); e.stopPropagation() }; setSelectedContacts(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]) }
  const toggleSelectionMode = () => { if (selectionMode) setSelectedContacts([]); setSelectionMode(!selectionMode) }
  const selectAllVisible = () => setSelectedContacts(filteredContacts.filter(c => c.phone).map(c => c.id))
  const clearSelection = () => setSelectedContacts([])
  const openWhatsAppModal = () => { if (selectedContacts.length === 0) { toast({ variant: 'destructive', title: 'Sin seleccion', description: 'Selecciona contactos.' }); return }; setIsWhatsAppModalOpen(true) }
  const sendWhatsAppToContact = (phone: string) => window.open('https://wa.me/' + formatPhoneForWhatsApp(phone) + '?text=' + encodeURIComponent(whatsAppMessage), '_blank')
  const selectedContactsList = contacts.filter(c => selectedContacts.includes(c.id) && c.phone)

  const getDisplayCompany = (company: string | null | undefined) => {
    if (!company) return null
    if (company.includes('http') || company.includes('www.')) { try { return new URL(company.startsWith('http') ? company : 'https://' + company).hostname.replace('www.', '') } catch { return company.length > 30 ? company.substring(0, 30) + '...' : company } }
    return company.length > 30 ? company.substring(0, 30) + '...' : company
  }

  const getLeadScoreColor = (score: number) => score >= 80 ? 'bg-green-100 text-green-800' : score >= 50 ? 'bg-yellow-100 text-yellow-800' : score >= 20 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
  const formatCurrency = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)

  if (isLoading) return <LoadingState message="Cargando contactos..." />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Contactos</h2>
          <p className="text-muted-foreground">{filteredContacts.length} de {contacts.length} contactos{isSyncing && <span className="ml-2 text-blue-600">Sincronizando...</span>}</p>
        </div>
        <div className="flex gap-2">
          <Button variant={selectionMode ? 'default' : 'outline'} onClick={toggleSelectionMode}>{selectionMode ? <><X className="mr-2 h-4 w-4" />Cancelar</> : <><CheckSquare className="mr-2 h-4 w-4" />Seleccionar</>}</Button>
          <Button variant="outline" onClick={handleSync} disabled={isSyncing}><RefreshCw className={'mr-2 h-4 w-4' + (isSyncing ? ' animate-spin' : '')} />Sincronizar</Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm() }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nuevo Contacto</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
              <DialogHeader><DialogTitle>Nuevo Contacto</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateContact} className="space-y-4" noValidate>
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Informacion basica</h3>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre <span className="text-destructive">*</span></Label>
                    <Input id="name" value={newContact.name} onChange={(e) => handleFieldChange('name', e.target.value)} onBlur={() => handleFieldBlur('name')} placeholder="Juan Perez" className={formErrors.name && touched.name ? 'border-destructive' : ''} />
                    {formErrors.name && touched.name && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />{formErrors.name}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={newContact.email} onChange={(e) => handleFieldChange('email', e.target.value)} onBlur={() => handleFieldBlur('email')} placeholder="juan@ejemplo.com" className={formErrors.email && touched.email ? 'border-destructive' : ''} />{formErrors.email && touched.email && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />{formErrors.email}</p>}</div>
                    <div className="space-y-2"><Label htmlFor="phone">Telefono</Label><Input id="phone" type="tel" value={newContact.phone} onChange={(e) => handleFieldChange('phone', e.target.value)} onBlur={() => handleFieldBlur('phone')} placeholder="+52 123 456 7890" className={formErrors.phone && touched.phone ? 'border-destructive' : ''} />{formErrors.phone && touched.phone && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />{formErrors.phone}</p>}</div>
                  </div>
                  {formErrors.general && <p className="text-sm text-destructive p-2 bg-destructive/10 rounded flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />{formErrors.general}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label htmlFor="company">Empresa</Label><Input id="company" value={newContact.company} onChange={(e) => handleFieldChange('company', e.target.value)} placeholder="Empresa SA" /></div>
                    <div className="space-y-2"><Label htmlFor="category">Categoria</Label><Select value={newContact.category} onValueChange={(v) => handleFieldChange('category', v)}><SelectTrigger id="category"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="prospecto">Prospecto</SelectItem><SelectItem value="cliente">Cliente</SelectItem><SelectItem value="proveedor">Proveedor</SelectItem><SelectItem value="personal">Personal</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="address">Ubicacion</Label><Textarea id="address" value={newContact.address} onChange={(e) => handleFieldChange('address', e.target.value)} placeholder="Direccion completa" rows={2} /></div>
                </div>
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" />Gestion Comercial</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label htmlFor="leadSource">Fuente de origen</Label><Select value={newContact.leadSource} onValueChange={(v) => handleFieldChange('leadSource', v)}><SelectTrigger id="leadSource"><SelectValue placeholder="Seleccionar..." /></SelectTrigger><SelectContent>{LEAD_SOURCE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label htmlFor="leadScore">Lead Score (0-100)</Label><div className="flex items-center gap-2"><Input id="leadScore" type="number" min={0} max={100} value={newContact.leadScore} onChange={(e) => handleFieldChange('leadScore', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} className="w-20" /><div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className={'h-full transition-all ' + (newContact.leadScore >= 80 ? 'bg-green-500' : newContact.leadScore >= 50 ? 'bg-yellow-500' : newContact.leadScore >= 20 ? 'bg-orange-500' : 'bg-gray-400')} style={{ width: newContact.leadScore + '%' }} /></div></div></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label htmlFor="potentialValue" className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />Valor potencial</Label><Input id="potentialValue" type="number" min={0} value={newContact.potentialValue} onChange={(e) => handleFieldChange('potentialValue', parseFloat(e.target.value) || 0)} placeholder="0.00" /></div>
                    <div className="space-y-2"><Label htmlFor="nextFollowup" className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Proximo seguimiento</Label><Input id="nextFollowup" type="datetime-local" value={newContact.nextFollowup} onChange={(e) => handleFieldChange('nextFollowup', e.target.value)} /></div>
                  </div>
                </div>
                <div className="flex gap-2 pt-4"><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">Cancelar</Button><Button type="submit" disabled={createMutation.isPending} className="flex-1">{createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}</Button></div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {selectionMode && <div className="flex items-center justify-between p-3 bg-muted rounded-lg"><div className="flex items-center gap-4"><span className="font-medium">{selectedContacts.length} seleccionados</span><Button variant="ghost" size="sm" onClick={selectAllVisible}>Seleccionar todos ({filteredContacts.filter(c => c.phone).length})</Button><Button variant="ghost" size="sm" onClick={clearSelection}>Limpiar</Button></div><Button onClick={openWhatsAppModal} disabled={selectedContacts.length === 0} className="bg-green-600 hover:bg-green-700"><MessageCircle className="mr-2 h-4 w-4" />Enviar WhatsApp ({selectedContacts.length})</Button></div>}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Buscar" placeholder="Buscar por nombre, email o empresa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={cityFilter} onValueChange={setCityFilter}><SelectTrigger className="w-[160px]"><MapPin className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Ciudad" /></SelectTrigger><SelectContent><SelectItem value="all">Todas las ciudades</SelectItem>{cities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}</SelectContent></Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="cliente">Cliente</SelectItem><SelectItem value="prospecto">Prospecto</SelectItem><SelectItem value="proveedor">Proveedor</SelectItem><SelectItem value="personal">Personal</SelectItem></SelectContent></Select>
      </div>
      {filteredContacts.length === 0 ? <Card><CardContent className="flex flex-col items-center justify-center py-12"><p className="text-muted-foreground mb-4">No hay contactos que coincidan.</p></CardContent></Card> : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContacts.map((contact) => (
            <div key={contact.id} className="relative h-full">
              {selectionMode && contact.phone && <div className="absolute top-3 left-3 z-10" onClick={(e) => toggleContactSelection(contact.id, e)}><Checkbox checked={selectedContacts.includes(contact.id)} className="h-5 w-5 bg-white border-2" /></div>}
              <Link to={selectionMode ? '#' : '/contacts/' + contact.id} onClick={(e) => { if (selectionMode && contact.phone) { e.preventDefault(); toggleContactSelection(contact.id) } }} className="block h-full">
                <Card className={'h-full flex flex-col cursor-pointer transition-all hover:shadow-md ' + (selectionMode && selectedContacts.includes(contact.id) ? 'ring-2 ring-green-500 bg-green-50' : '') + (selectionMode && !contact.phone ? ' opacity-50' : '')}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className={'flex-1 min-w-0 ' + (selectionMode ? 'ml-8' : '')}><CardTitle className="text-base truncate">{contact.name}</CardTitle>{getDisplayCompany(contact.company) && <p className="text-sm text-muted-foreground truncate">{getDisplayCompany(contact.company)}</p>}</div>
                      <div className="flex flex-col items-end gap-1"><Badge className={'shrink-0 ' + getCategoryColor(contact.category)}>{contact.category}</Badge>{contact.leadScore !== undefined && contact.leadScore > 0 && <Badge className={'text-xs ' + getLeadScoreColor(contact.leadScore)}>{contact.leadScore}%</Badge>}</div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="space-y-1 text-sm flex-1">
                      {contact.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3 w-3 shrink-0" /><span className="truncate">{contact.phone}</span></div>}
                      {!contact.email.includes('@phone') && !contact.email.includes('@whatsapp') && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{contact.email}</span></div>}
                      {contact.tags && contact.tags[1] && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{contact.tags[1]}</span></div>}
                      {contact.potentialValue !== undefined && contact.potentialValue > 0 && <div className="flex items-center gap-2 text-green-600"><DollarSign className="h-3 w-3 shrink-0" /><span className="truncate font-medium">{formatCurrency(contact.potentialValue)}</span></div>}
                    </div>
                    {contact.tags && contact.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{contact.tags.slice(0, 1).map(tag => <Badge key={tag} variant="secondary" className="text-xs truncate max-w-[150px]">{tag}</Badge>)}</div>}
                    {!selectionMode && <div className="mt-4 pt-3 border-t flex gap-2">{contact.phone && <><Button variant="outline" size="sm" className="flex-1 h-8" onClick={(e) => handleWhatsApp(e, contact.phone!)}><MessageCircle className="h-4 w-4 mr-1 text-green-600" /><span className="text-xs">WhatsApp</span></Button><Button variant="outline" size="sm" className="flex-1 h-8" onClick={(e) => handleCall(e, contact.phone!)}><Phone className="h-4 w-4 mr-1 text-blue-600" /><span className="text-xs">Llamar</span></Button></>}{!contact.email.includes('@phone') && !contact.email.includes('@whatsapp') && <Button variant="outline" size="sm" className="flex-1 h-8" onClick={(e) => handleEmail(e, contact.email)}><Mail className="h-4 w-4 mr-1 text-orange-600" /><span className="text-xs">Email</span></Button>}</div>}
                  </CardContent>
                </Card>
              </Link>
            </div>
          ))}
        </div>
      )}
      <Dialog open={isWhatsAppModalOpen} onOpenChange={setIsWhatsAppModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-green-600" />Envio Masivo de WhatsApp</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="whatsapp-message">Mensaje</Label><Textarea id="whatsapp-message" placeholder="Escribe tu mensaje..." value={whatsAppMessage} onChange={(e) => setWhatsAppMessage(e.target.value)} rows={4} className="resize-none" /></div>
            <div className="space-y-2"><Label>{selectedContactsList.length} contactos seleccionados</Label><div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">{selectedContactsList.map(contact => <div key={contact.id} className="flex items-center justify-between p-3 hover:bg-muted/50"><div className="min-w-0 flex-1 mr-3"><p className="font-medium truncate">{contact.name}</p><p className="text-sm text-muted-foreground truncate">{contact.phone}</p></div><Button size="sm" onClick={() => sendWhatsAppToContact(contact.phone!)} disabled={!whatsAppMessage.trim()} className="bg-green-600 hover:bg-green-700 shrink-0"><Send className="h-4 w-4 mr-1" />Enviar</Button></div>)}</div></div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3"><p className="text-sm text-amber-800"><strong>Nota:</strong> Cada boton abrira WhatsApp Web con el mensaje.</p></div>
            <Button variant="outline" onClick={() => setIsWhatsAppModalOpen(false)} className="w-full">Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
