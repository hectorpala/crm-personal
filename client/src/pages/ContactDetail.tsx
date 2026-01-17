import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  ChevronLeft,
  MessageCircle,
  Phone,
  Video,
  Mail,
  Copy,
  Check,
  DollarSign,
  Calendar,
  Target,
  Clock,
} from 'lucide-react'
import type { Contact } from '@/types'
import { LEAD_SOURCE_OPTIONS } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { LoadingState } from '@/components/ui/loading-state'

const cleanPhone = (phone: string) => phone.replace(/[^0-9+]/g, '')

const formatPhoneForWhatsApp = (phone: string) => {
  const cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.length >= 12) return cleaned
  if (cleaned.length === 10) return '521' + cleaned
  if (cleaned.length === 11 && cleaned.startsWith('1')) return cleaned
  return '52' + cleaned
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

const formatDateTime = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const formatRelativeTime = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Justo ahora'
  if (diffMins < 60) return 'Hace ' + diffMins + ' min'
  if (diffHours < 24) return 'Hace ' + diffHours + 'h'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return 'Hace ' + diffDays + ' dias'
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

const formatCurrency = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)

const getLeadScoreColor = (score: number) => score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : score >= 20 ? 'bg-orange-500' : 'bg-gray-400'

const getLeadSourceLabel = (value: string) => LEAD_SOURCE_OPTIONS.find(opt => opt.value === value)?.label || value

export default function ContactDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Contact>>({})
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const { toast } = useToast()

  const { data: contact, isLoading, error } = useQuery<Contact>({
    queryKey: ['contact', id],
    queryFn: async () => {
      const res = await fetch('/api/contacts/' + id)
      if (!res.ok) throw new Error('Contact not found')
      return res.json()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Contact>) => {
      const res = await fetch('/api/contacts/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Error al actualizar')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact', id] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setIsEditing(false)
      toast({ title: 'Contacto actualizado', description: 'Los cambios se han guardado correctamente.' })
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error al actualizar', description: error instanceof Error ? error.message : 'Ocurrio un error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/contacts/' + id, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast({ title: 'Contacto eliminado', description: 'El contacto ha sido eliminado.' })
      navigate('/contacts')
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error al eliminar', description: error instanceof Error ? error.message : 'Ocurrio un error' })
    },
  })

  const startEditing = () => {
    if (contact) {
      setEditData({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        address: contact.address,
        category: contact.category,
        leadSource: contact.leadSource,
        leadScore: contact.leadScore,
        potentialValue: contact.potentialValue,
        nextFollowup: contact.nextFollowup,
        notes: contact.notes,
      })
      setIsEditing(true)
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast({ title: 'Copiado', description: 'El contenido se ha copiado al portapapeles.' })
    setTimeout(() => setCopiedField(null), 1500)
  }

  if (isLoading) return <LoadingState message="Cargando contacto..." />

  if (error || !contact) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex flex-col items-center justify-center gap-3">
        <p className="text-ios-body text-[#6b7280]">Contacto no encontrado</p>
        <Link to="/contacts" className="text-ios-body text-[#007aff]">Volver</Link>
      </div>
    )
  }

  const initials = contact.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const hasValidEmail = contact.email && !contact.email.includes('@phone') && !contact.email.includes('@whatsapp')

  if (isEditing) {
    return (
      <div className="min-h-screen bg-[#f2f2f7]">
        <div className="bg-[#f2f2f7]/80 backdrop-blur-xl sticky top-0 z-10 border-b border-[rgba(60,60,67,0.29)]">
          <div className="max-w-lg mx-auto flex items-center justify-between h-[44px] px-4">
            <button onClick={() => setIsEditing(false)} className="text-ios-body text-[#007aff] active:opacity-60">Cancelar</button>
            <span className="text-ios-headline">Editar</span>
            <button onClick={() => updateMutation.mutate(editData)} disabled={updateMutation.isPending} className="text-ios-headline text-[#007aff] active:opacity-60 disabled:opacity-40">{updateMutation.isPending ? 'Guardando...' : 'OK'}</button>
          </div>
        </div>
        <div className="max-w-lg mx-auto pt-8 pb-20">
          <div className="flex flex-col items-center mb-8">
            <div className="h-[100px] w-[100px] rounded-full flex items-center justify-center text-white shadow-sm" style={{ background: 'linear-gradient(180deg, #B4B4B4 0%, #8E8E93 100%)', fontSize: '40px', fontWeight: 300 }}>{initials}</div>
          </div>
          <div className="mx-4 bg-white rounded-[10px] overflow-hidden">
            <div className="divide-y divide-[rgba(60,60,67,0.29)]">
              <div className="flex items-center px-4 min-h-[44px]"><label htmlFor="edit-name" className="text-ios-body text-[#6b7280] w-24">Nombre</label><input id="edit-name" type="text" value={editData.name || ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="flex-1 text-ios-body bg-transparent outline-none" /></div>
              <div className="flex items-center px-4 min-h-[44px]"><label htmlFor="edit-company" className="text-ios-body text-[#6b7280] w-24">Empresa</label><input id="edit-company" type="text" value={editData.company || ''} onChange={(e) => setEditData({ ...editData, company: e.target.value })} className="flex-1 text-ios-body bg-transparent outline-none placeholder:text-[#c7c7cc]" placeholder="Agregar" /></div>
            </div>
          </div>
          <div className="mx-4 mt-8 bg-white rounded-[10px] overflow-hidden"><div className="flex items-center px-4 min-h-[44px]"><label htmlFor="edit-phone" className="text-ios-body text-[#6b7280] w-24">Telefono</label><input id="edit-phone" type="tel" value={editData.phone || ''} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} className="flex-1 text-ios-body text-[#007aff] bg-transparent outline-none placeholder:text-[#c7c7cc]" placeholder="Agregar" /></div></div>
          <div className="mx-4 mt-8 bg-white rounded-[10px] overflow-hidden"><div className="flex items-center px-4 min-h-[44px]"><label htmlFor="edit-email" className="text-ios-body text-[#6b7280] w-24">Email</label><input id="edit-email" type="email" value={editData.email || ''} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className="flex-1 text-ios-body text-[#007aff] bg-transparent outline-none placeholder:text-[#c7c7cc]" placeholder="Agregar" /></div></div>
          <div className="mx-4 mt-8 bg-white rounded-[10px] overflow-hidden"><div className="px-4 py-3"><label htmlFor="edit-address" className="text-ios-body text-[#6b7280] block">Ubicacion</label><textarea id="edit-address" value={editData.address || ''} onChange={(e) => setEditData({ ...editData, address: e.target.value })} className="w-full text-ios-body bg-transparent outline-none resize-none mt-1 placeholder:text-[#c7c7cc]" placeholder="Agregar" rows={2} /></div></div>
          <div className="mx-4 mt-8 bg-white rounded-[10px] overflow-hidden"><div className="flex items-center justify-between px-4 min-h-[44px]"><label htmlFor="edit-category" className="text-ios-body">Categoria</label><select id="edit-category" value={editData.category || 'prospecto'} onChange={(e) => setEditData({ ...editData, category: e.target.value as Contact['category'] })} className="text-ios-body text-[#6b7280] bg-transparent outline-none text-right appearance-none"><option value="prospecto">Prospecto</option><option value="cliente">Cliente</option><option value="proveedor">Proveedor</option><option value="personal">Personal</option></select></div></div>
          
          <p className="mx-4 mt-8 mb-2 text-ios-footnote text-[#6b7280] uppercase">Gestion Comercial</p>
          <div className="mx-4 bg-white rounded-[10px] overflow-hidden">
            <div className="divide-y divide-[rgba(60,60,67,0.29)]">
              <div className="flex items-center justify-between px-4 min-h-[44px]"><label htmlFor="edit-source" className="text-ios-body">Fuente</label><select id="edit-source" value={editData.leadSource || ''} onChange={(e) => setEditData({ ...editData, leadSource: e.target.value as any })} className="text-ios-body text-[#6b7280] bg-transparent outline-none text-right appearance-none"><option value="">Sin especificar</option>{LEAD_SOURCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
              <div className="flex items-center px-4 min-h-[44px]"><label htmlFor="edit-score" className="text-ios-body text-[#6b7280] flex-1">Lead Score</label><input id="edit-score" type="number" min={0} max={100} value={editData.leadScore || 0} onChange={(e) => setEditData({ ...editData, leadScore: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })} className="w-16 text-ios-body text-right bg-transparent outline-none" /></div>
              <div className="flex items-center px-4 min-h-[44px]"><label htmlFor="edit-value" className="text-ios-body text-[#6b7280] flex-1">Valor potencial</label><span className="text-ios-body text-[#6b7280] mr-1">$</span><input id="edit-value" type="number" min={0} value={editData.potentialValue || 0} onChange={(e) => setEditData({ ...editData, potentialValue: parseFloat(e.target.value) || 0 })} className="w-24 text-ios-body text-right bg-transparent outline-none" /></div>
              <div className="flex items-center px-4 min-h-[44px]"><label htmlFor="edit-followup" className="text-ios-body text-[#6b7280] flex-1">Seguimiento</label><input id="edit-followup" type="datetime-local" value={editData.nextFollowup || ''} onChange={(e) => setEditData({ ...editData, nextFollowup: e.target.value })} className="text-ios-body text-[#007aff] bg-transparent outline-none" /></div>
            </div>
          </div>
          
          <div className="mx-4 mt-8 bg-white rounded-[10px] overflow-hidden"><div className="px-4 py-3"><label htmlFor="edit-notes" className="text-ios-body text-[#6b7280] block">Notas</label><textarea id="edit-notes" value={editData.notes || ''} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} className="w-full text-ios-body bg-transparent outline-none resize-none mt-1 placeholder:text-[#c7c7cc]" placeholder="Agregar notas..." rows={3} /></div></div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild><button className="mx-4 mt-8 w-[calc(100%-32px)] bg-white rounded-[10px] text-[#ff3b30] text-ios-body h-[44px] active:bg-[#f2f2f7] transition-colors">Eliminar contacto</button></AlertDialogTrigger>
            <AlertDialogContent className="rounded-[14px] max-w-[270px] p-0 gap-0 border-0">
              <AlertDialogHeader className="p-4 pb-2 text-center"><AlertDialogTitle className="text-ios-headline text-center">Eliminar contacto</AlertDialogTitle><AlertDialogDescription className="text-ios-footnote text-[#6b7280] text-center">Esta accion no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter className="flex-col border-t border-[rgba(60,60,67,0.29)] p-0 gap-0 sm:flex-col sm:space-x-0"><AlertDialogCancel className="border-0 border-b border-[rgba(60,60,67,0.29)] rounded-none h-[44px] text-[#007aff] text-ios-body font-normal hover:bg-[#f2f2f7] m-0">Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate()} className="border-0 rounded-none h-[44px] bg-transparent text-[#ff3b30] text-ios-headline hover:bg-[#f2f2f7] m-0">Eliminar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <div className="bg-[#f2f2f7]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between h-[44px] px-4">
          <Link to="/contacts" className="flex items-center text-[#007aff] text-ios-body active:opacity-60 -ml-2"><ChevronLeft className="h-[22px] w-[22px] stroke-[2]" /><span className="-ml-1">Contactos</span></Link>
          <button onClick={startEditing} className="text-[#007aff] text-ios-body active:opacity-60">Editar</button>
        </div>
      </div>
      <div className="max-w-lg mx-auto pt-6 pb-20">
        <div className="flex flex-col items-center px-4">
          <div className="h-[100px] w-[100px] rounded-full flex items-center justify-center text-white shadow-sm mb-3" style={{ background: 'linear-gradient(180deg, #B4B4B4 0%, #8E8E93 100%)', fontSize: '40px', fontWeight: 300 }}>{initials}</div>
          <h1 className="text-ios-title1 font-semibold text-black text-center">{contact.name}</h1>
          {contact.company && <p className="text-ios-body text-[#6b7280] mt-0.5">{contact.company}</p>}
          <p className="text-ios-footnote text-[#6b7280] mt-0.5 capitalize">{contact.category}</p>
          {contact.leadScore !== undefined && contact.leadScore > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden"><div className={'h-full ' + getLeadScoreColor(contact.leadScore)} style={{ width: contact.leadScore + '%' }} /></div>
              <span className="text-ios-footnote text-[#6b7280]">{contact.leadScore}%</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-6 px-4">
          {contact.phone && (<>
            <button aria-label="WhatsApp" onClick={() => window.open('https://wa.me/' + formatPhoneForWhatsApp(contact.phone!), '_blank')} className="flex flex-col items-center justify-center min-w-[68px] w-[68px] sm:w-[76px] h-[56px] sm:h-[60px] bg-white rounded-[10px] active:bg-[#e5e5ea] transition-colors"><MessageCircle className="h-[26px] w-[26px] text-[#34c759] stroke-[1.5]" /><span className="text-ios-tabbar text-[#007aff] mt-1">WhatsApp</span></button>
            <button aria-label="Llamar" onClick={() => window.location.href = 'tel:' + cleanPhone(contact.phone!)} className="flex flex-col items-center justify-center min-w-[68px] w-[68px] sm:w-[76px] h-[56px] sm:h-[60px] bg-white rounded-[10px] active:bg-[#e5e5ea] transition-colors"><Phone className="h-[26px] w-[26px] text-[#34c759] stroke-[1.5]" /><span className="text-ios-tabbar text-[#007aff] mt-1">Llamar</span></button>
            <button aria-label="Video" className="flex flex-col items-center justify-center min-w-[68px] w-[68px] sm:w-[76px] h-[56px] sm:h-[60px] bg-white rounded-[10px] active:bg-[#e5e5ea] transition-colors"><Video className="h-[26px] w-[26px] text-[#34c759] stroke-[1.5]" /><span className="text-ios-tabbar text-[#007aff] mt-1">Video</span></button>
          </>)}
          {hasValidEmail && (<button aria-label="Mail" onClick={() => window.location.href = 'mailto:' + contact.email} className="flex flex-col items-center justify-center min-w-[68px] w-[68px] sm:w-[76px] h-[56px] sm:h-[60px] bg-white rounded-[10px] active:bg-[#e5e5ea] transition-colors"><Mail className="h-[26px] w-[26px] text-[#34c759] stroke-[1.5]" /><span className="text-ios-tabbar text-[#007aff] mt-1">Mail</span></button>)}
        </div>
        <div className="mx-4 mt-8">
          <div className="bg-white rounded-[10px] overflow-hidden">
            {contact.phone && (<button onClick={() => copyToClipboard(contact.phone!, 'phone')} className="w-full px-4 py-3 flex items-start justify-between active:bg-[#f2f2f7] border-b border-[rgba(60,60,67,0.29)] last:border-0 transition-colors"><div className="text-left"><p className="text-ios-footnote text-[#6b7280]">telefono</p><p className="text-ios-body text-[#007aff]">{contact.phone}</p></div>{copiedField === 'phone' ? <Check className="h-5 w-5 text-[#34c759] mt-2" /> : <Copy className="h-5 w-5 text-[#c7c7cc] mt-2" />}</button>)}
            {hasValidEmail && (<button onClick={() => copyToClipboard(contact.email, 'email')} className="w-full px-4 py-3 flex items-start justify-between active:bg-[#f2f2f7] border-b border-[rgba(60,60,67,0.29)] last:border-0 transition-colors"><div className="text-left min-w-0 flex-1"><p className="text-ios-footnote text-[#6b7280]">email</p><p className="text-ios-body text-[#007aff] truncate pr-2">{contact.email}</p></div>{copiedField === 'email' ? <Check className="h-5 w-5 text-[#34c759] mt-2 shrink-0" /> : <Copy className="h-5 w-5 text-[#c7c7cc] mt-2 shrink-0" />}</button>)}
          </div>
        </div>
        {contact.address && (<div className="mx-4 mt-8"><div className="bg-white rounded-[10px] overflow-hidden"><button onClick={() => copyToClipboard(contact.address!, 'address')} className="w-full px-4 py-3 flex items-start justify-between active:bg-[#f2f2f7] transition-colors"><div className="text-left flex-1 min-w-0"><p className="text-ios-footnote text-[#6b7280]">ubicacion</p><p className="text-ios-body text-[#007aff] mt-0.5 pr-2">{contact.address}</p></div>{copiedField === 'address' ? <Check className="h-5 w-5 text-[#34c759] mt-2 shrink-0" /> : <Copy className="h-5 w-5 text-[#c7c7cc] mt-2 shrink-0" />}</button></div></div>)}
        
        <p className="mx-4 mt-8 mb-2 text-ios-footnote text-[#6b7280] uppercase">Gestion Comercial</p>
        <div className="mx-4 bg-white rounded-[10px] overflow-hidden">
          <div className="divide-y divide-[rgba(60,60,67,0.29)]">
            {contact.lastContactDate && (<div className="px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-[#8e8e93]" /><span className="text-ios-body text-[#6b7280]">Ultimo contacto</span></div><span className="text-ios-body text-[#8e8e93]">{formatRelativeTime(contact.lastContactDate)}</span></div>)}
            {contact.leadSource && (<div className="px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-[#6b7280]" /><span className="text-ios-body text-[#6b7280]">Fuente</span></div><span className="text-ios-body">{getLeadSourceLabel(contact.leadSource)}</span></div>)}
            {contact.potentialValue !== undefined && contact.potentialValue > 0 && (<div className="px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-600" /><span className="text-ios-body text-[#6b7280]">Valor potencial</span></div><span className="text-ios-body text-green-600 font-medium">{formatCurrency(contact.potentialValue)}</span></div>)}
            {contact.nextFollowup && (<div className="px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-[#007aff]" /><span className="text-ios-body text-[#6b7280]">Proximo seguimiento</span></div><span className="text-ios-body text-[#007aff]">{formatDateTime(contact.nextFollowup)}</span></div>)}
            {!contact.lastContactDate && !contact.leadSource && (!contact.potentialValue || contact.potentialValue === 0) && !contact.nextFollowup && (<div className="px-4 py-3 text-center"><span className="text-ios-body text-[#c7c7cc]">Sin datos comerciales</span></div>)}
          </div>
        </div>
        
        <div className="mx-4 mt-8">
          <div className="bg-white rounded-[10px] overflow-hidden">
            <div className="px-4 py-3">
              <p className="text-ios-footnote text-[#6b7280] mb-2">Notas</p>
              {contact.notes ? <p className="text-ios-body">{contact.notes}</p> : <p className="text-ios-body text-[#c7c7cc]">Sin notas</p>}
            </div>
          </div>
        </div>
        
        {contact.createdAt && <p className="text-center text-ios-footnote text-[#6b7280] mt-8">{formatDate(contact.createdAt)}</p>}
      </div>
    </div>
  )
}
