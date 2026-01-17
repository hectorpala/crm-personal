import { useState, useMemo, useEffect } from 'react'
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
import { Plus, Search, RefreshCw, Mail, Phone, Loader2, MessageCircle, MapPin, AlertCircle } from 'lucide-react'
import type { Contact } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { LoadingState } from '@/components/ui/loading-state'
import { validators } from '@/components/ui/form-field'
import { getCategoryColor } from '@/lib/category-styles'


const cleanPhone = (phone: string) => {
  return phone.replace(/[^0-9+]/g, '')
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
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
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
      toast({
        title: 'Contacto creado',
        description: 'El contacto se ha creado correctamente.',
      })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error al crear contacto',
        description: error instanceof Error ? error.message : 'Ocurrio un error inesperado',
      })
    },
  })

  const resetForm = () => {
    setNewContact({ name: '', email: '', phone: '', company: '', address: '', category: 'prospecto' })
    setFormErrors({})
    setTouched({})
  }

  // Validate field on blur
  const validateField = (field: string, value: string) => {
    let error: string | undefined

    switch (field) {
      case 'name':
        error = validators.required(value, 'El nombre')
        break
      case 'email':
        if (value) error = validators.email(value)
        break
      case 'phone':
        if (value) error = validators.phone(value)
        break
    }

    setFormErrors(prev => ({ ...prev, [field]: error }))
    return error
  }

  const handleFieldChange = (field: string, value: string) => {
    setNewContact(prev => ({ ...prev, [field]: value }))
    // Validate on change if field was already touched
    if (touched[field]) {
      validateField(field, value)
    }
  }

  const handleFieldBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    validateField(field, newContact[field as keyof typeof newContact])
  }

  // Auto-sync on page load
  useEffect(() => {
    const autoSync = async () => {
      setIsSyncing(true)
      try {
        await fetch('/api/google-sheets/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spreadsheetId: '1AjQyoFIdEuGpf2UNZsbMVvg7MNuonwxm8rfdw5yv0eo' })
        })
        refetch()
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error de sincronizacion',
          description: 'No se pudo sincronizar con Google Sheets. Verifica tu conexion.',
        })
      } finally {
        setIsSyncing(false)
      }
    }
    autoSync()
  }, [refetch, toast])

  // Extract unique cities from contact tags
  const cities = useMemo(() => {
    const citySet = new Set<string>()
    contacts.forEach((contact) => {
      if (contact.tags && contact.tags.length > 1) {
        citySet.add(contact.tags[1])
      }
    })
    return Array.from(citySet).sort()
  }, [contacts])

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(search.toLowerCase()) ||
      contact.email.toLowerCase().includes(search.toLowerCase()) ||
      (contact.company?.toLowerCase().includes(search.toLowerCase()) || false)
    const matchesCategory =
      categoryFilter === 'all' || contact.category === categoryFilter
    const matchesCity =
      cityFilter === 'all' || (contact.tags && contact.tags.includes(cityFilter))
    return matchesSearch && matchesCategory && matchesCity
  })

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await fetch('/api/google-sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: '1AjQyoFIdEuGpf2UNZsbMVvg7MNuonwxm8rfdw5yv0eo' })
      })
      refetch()
      toast({
        title: 'Sincronizacion completada',
        description: 'Los contactos se han actualizado.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error de sincronizacion',
        description: 'No se pudo sincronizar con Google Sheets.',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleWhatsApp = (e: React.MouseEvent, phone: string) => {
    e.preventDefault()
    e.stopPropagation()
    window.open('https://wa.me/' + cleanPhone(phone), '_blank')
  }

  const handleCall = (e: React.MouseEvent, phone: string) => {
    e.preventDefault()
    e.stopPropagation()
    window.location.href = 'tel:' + cleanPhone(phone)
  }

  const handleEmail = (e: React.MouseEvent, email: string) => {
    e.preventDefault()
    e.stopPropagation()
    window.location.href = 'mailto:' + email
  }

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all fields
    const errors: FormErrors = {}
    
    const nameError = validators.required(newContact.name, 'El nombre')
    if (nameError) errors.name = nameError
    
    if (newContact.email) {
      const emailError = validators.email(newContact.email)
      if (emailError) errors.email = emailError
    }
    
    if (newContact.phone) {
      const phoneError = validators.phone(newContact.phone)
      if (phoneError) errors.phone = phoneError
    }
    
    // Require at least email or phone
    if (!newContact.email && !newContact.phone) {
      errors.general = 'Se requiere al menos un email o telefono'
    }
    
    setFormErrors(errors)
    setTouched({ name: true, email: true, phone: true })
    
    // Check if there are any errors
    if (Object.keys(errors).length > 0) {
      if (errors.general) {
        toast({
          variant: 'destructive',
          title: 'Datos incompletos',
          description: errors.general,
        })
      }
      return
    }
    
    createMutation.mutate(newContact)
  }

  if (isLoading) {
    return <LoadingState message="Cargando contactos..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Contactos</h2>
          <p className="text-muted-foreground">
            {filteredContacts.length} de {contacts.length} contactos
            {isSyncing && <span className="ml-2 text-blue-600">Sincronizando...</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={'mr-2 h-4 w-4' + (isSyncing ? ' animate-spin' : '')} />
            Sincronizar
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Contacto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nuevo Contacto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateContact} className="space-y-4" noValidate>
                {/* Name field */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-1">
                    Nombre <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={newContact.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    onBlur={() => handleFieldBlur('name')}
                    placeholder="Juan Perez"
                    className={formErrors.name && touched.name ? 'border-destructive' : ''}
                    aria-invalid={!!(formErrors.name && touched.name)}
                    aria-describedby={formErrors.name ? 'name-error' : undefined}
                    autoComplete="name"
                  />
                  {formErrors.name && touched.name && (
                    <p id="name-error" className="flex items-center gap-1.5 text-sm text-destructive" role="alert">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {formErrors.name}
                    </p>
                  )}
                </div>
                
                {/* Email field */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newContact.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    onBlur={() => handleFieldBlur('email')}
                    placeholder="juan@ejemplo.com"
                    className={formErrors.email && touched.email ? 'border-destructive' : ''}
                    aria-invalid={!!(formErrors.email && touched.email)}
                    aria-describedby={formErrors.email ? 'email-error' : undefined}
                    autoComplete="email"
                  />
                  {formErrors.email && touched.email && (
                    <p id="email-error" className="flex items-center gap-1.5 text-sm text-destructive" role="alert">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {formErrors.email}
                    </p>
                  )}
                </div>
                
                {/* Phone field */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={newContact.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    onBlur={() => handleFieldBlur('phone')}
                    placeholder="+52 123 456 7890"
                    className={formErrors.phone && touched.phone ? 'border-destructive' : ''}
                    aria-invalid={!!(formErrors.phone && touched.phone)}
                    aria-describedby={formErrors.phone ? 'phone-error' : undefined}
                    autoComplete="tel"
                  />
                  {formErrors.phone && touched.phone && (
                    <p id="phone-error" className="flex items-center gap-1.5 text-sm text-destructive" role="alert">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {formErrors.phone}
                    </p>
                  )}
                </div>
                
                {/* General error for email/phone requirement */}
                {formErrors.general && (
                  <p className="flex items-center gap-1.5 text-sm text-destructive p-2 bg-destructive/10 rounded" role="alert">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {formErrors.general}
                  </p>
                )}
                
                {/* Company field */}
                <div className="space-y-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    value={newContact.company}
                    onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                    placeholder="Empresa SA"
                    autoComplete="organization"
                  />
                </div>
                
                {/* Address field */}
                <div className="space-y-2">
                  <Label htmlFor="address">Ubicacion</Label>
                  <Textarea
                    id="address"
                    value={newContact.address}
                    onChange={(e) => setNewContact({ ...newContact, address: e.target.value })}
                    placeholder="Direccion completa o link de Google Maps"
                    rows={2}
                  />
                </div>
                
                {/* Category field */}
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={newContact.category}
                    onValueChange={(v) => setNewContact({ ...newContact, category: v })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospecto">Prospecto</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="proveedor">Proveedor</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} className="flex-1">
                    {createMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Guardar'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[160px]">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Ciudad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ciudades</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="cliente">Cliente</SelectItem>
            <SelectItem value="prospecto">Prospecto</SelectItem>
            <SelectItem value="proveedor">Proveedor</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredContacts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No hay contactos que coincidan con tu busqueda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContacts.map((contact) => (
            <Link key={contact.id} to={"/contacts/" + contact.id}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{contact.name}</CardTitle>
                      {contact.company && (
                        <p className="text-sm text-muted-foreground truncate">
                          {contact.company}
                        </p>
                      )}
                    </div>
                    <Badge className={getCategoryColor(contact.category)}>
                      {contact.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </div>
                    )}
                    {!contact.email.includes('@phone') && !contact.email.includes('@whatsapp') && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </div>
                    )}
                    {contact.tags && contact.tags[1] && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {contact.tags[1]}
                      </div>
                    )}
                  </div>
                  {contact.tags && contact.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {contact.tags.slice(0, 1).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t flex gap-2">
                    {contact.phone && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8"
                          onClick={(e) => handleWhatsApp(e, contact.phone!)}
                        >
                          <MessageCircle className="h-4 w-4 mr-1 text-green-600" />
                          <span className="text-xs">WhatsApp</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8"
                          onClick={(e) => handleCall(e, contact.phone!)}
                        >
                          <Phone className="h-4 w-4 mr-1 text-blue-600" />
                          <span className="text-xs">Llamar</span>
                        </Button>
                      </>
                    )}
                    {!contact.email.includes('@phone') && !contact.email.includes('@whatsapp') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8"
                        onClick={(e) => handleEmail(e, contact.email)}
                      >
                        <Mail className="h-4 w-4 mr-1 text-orange-600" />
                        <span className="text-xs">Email</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
