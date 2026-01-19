import { useState, useRef, useEffect } from 'react'
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
  Target,
  Clock,
  Send,
  MessageSquare,
  PhoneCall,
  Trash2,
} from 'lucide-react'
import type { Contact } from '@/types'
import { LEAD_SOURCE_OPTIONS } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { LoadingState } from '@/components/ui/loading-state'

const cleanPhone = (phone: string) => phone.replace(/[^0-9+]/g, '')

const formatPhoneForWhatsApp = (phone: string) => {
  const cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.length >= 12) return cleaned
  if (cleaned.length === 10) return '52' + cleaned
  if (cleaned.length === 11 && cleaned.startsWith('1')) return cleaned
  return '52' + cleaned
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
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

const getLeadSourceLabel = (value: string) => LEAD_SOURCE_OPTIONS.find(opt => opt.value === value)?.label || value

export default function ContactDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Contact>>({})
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const { toast } = useToast()
  const [newMessage, setNewMessage] = useState('')
  const [messageType, setMessageType] = useState<'whatsapp' | 'llamada' | 'nota'>('whatsapp')
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const { data: conversations = [], refetch: refetchConversations } = useQuery<any[]>({
    queryKey: ["conversations", id],
    refetchInterval: 5000,
    queryFn: async () => {
      const res = await fetch('/api/conversations/contact/' + id)
      return res.json()
    },
  })

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [conversations])

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; type: string }) => {
      // If WhatsApp message, try to send via API first
      if (data.type === 'whatsapp' && contact?.phone) {
        const waRes = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactId: id,
            phone: contact.phone,
            message: data.content,
          }),
        })
        const waResult = await waRes.json()
        if (waResult.success) {
          return { ...waResult, sentViaAPI: true }
        }
        // WhatsApp failed - return the error
        return { sentViaAPI: false, waError: waResult.error || 'WhatsApp no disponible' }
      }
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: parseInt(id!),
          content: data.content,
          type: data.type,
          direction: 'saliente',
          channel: data.type === 'whatsapp' ? 'whatsapp' : data.type === 'llamada' ? 'telefono' : 'manual',
        }),
      })
      return res.json()
    },
    onSuccess: (result) => {
      refetchConversations()
      setNewMessage('')
      if (result.sentViaAPI) {
        toast({ title: 'Mensaje enviado', description: 'Enviado por WhatsApp' })
      } else if (result.waError) {
        toast({ variant: 'destructive', title: 'WhatsApp fallo', description: 'Usa el boton de WhatsApp para enviar manualmente' })
      } else {
        toast({ title: 'Mensaje guardado' })
      }
    },
  })

  const deleteConversationMutation = useMutation({
    mutationFn: async (convId: number) => {
      await fetch('/api/conversations/' + convId, { method: 'DELETE' })
    },
    onSuccess: () => refetchConversations(),
  })

  const handleSendMessage = () => {
    if (!newMessage.trim()) return
    sendMessageMutation.mutate({ content: newMessage, type: messageType })
  }


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
          
          <p className="mx-4 mt-8 mb-2 text-ios-footnote text-[#6b7280] uppercase">Origen</p>
          <div className="mx-4 bg-white rounded-[10px] overflow-hidden">
            <div className="flex items-center justify-between px-4 min-h-[44px]"><label htmlFor="edit-source" className="text-ios-body">Fuente</label><select id="edit-source" value={editData.leadSource || ''} onChange={(e) => setEditData({ ...editData, leadSource: e.target.value as any })} className="text-ios-body text-[#6b7280] bg-transparent outline-none text-right appearance-none"><option value="">Sin especificar</option>{LEAD_SOURCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
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
        
        {(contact.lastContactDate || contact.leadSource) && (
          <>
            <p className="mx-4 mt-8 mb-2 text-ios-footnote text-[#6b7280] uppercase">Informacion</p>
            <div className="mx-4 bg-white rounded-[10px] overflow-hidden">
              <div className="divide-y divide-[rgba(60,60,67,0.29)]">
                {contact.lastContactDate && (<div className="px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-[#8e8e93]" /><span className="text-ios-body text-[#6b7280]">Ultimo contacto</span></div><span className="text-ios-body text-[#8e8e93]">{formatRelativeTime(contact.lastContactDate)}</span></div>)}
                {contact.leadSource && (<div className="px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-[#6b7280]" /><span className="text-ios-body text-[#6b7280]">Fuente</span></div><span className="text-ios-body">{getLeadSourceLabel(contact.leadSource)}</span></div>)}
              </div>
            </div>
          </>
        )}
        
        <div className="mx-4 mt-8">
          <div className="bg-white rounded-[10px] overflow-hidden">
            <div className="px-4 py-3">
              <p className="text-ios-footnote text-[#6b7280] mb-2">Notas</p>
              {contact.notes ? <p className="text-ios-body">{contact.notes}</p> : <p className="text-ios-body text-[#c7c7cc]">Sin notas</p>}
            </div>
          </div>
        </div>
        
        
        <p className="mx-4 mt-8 mb-2 text-ios-footnote text-[#6b7280] uppercase">Conversaciones</p>
        <div className="mx-4 bg-white rounded-[10px] overflow-hidden">
          <div className="p-3 border-b border-[rgba(60,60,67,0.29)]">
            <div className="flex gap-2 mb-3">
              <button onClick={() => setMessageType('whatsapp')} className={"flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors " + (messageType === 'whatsapp' ? 'bg-[#25D366] text-white' : 'bg-gray-100 text-gray-600')}><MessageCircle className="inline h-4 w-4 mr-1" />WhatsApp</button>
              <button onClick={() => setMessageType('llamada')} className={"flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors " + (messageType === 'llamada' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600')}><PhoneCall className="inline h-4 w-4 mr-1" />Llamada</button>
              <button onClick={() => setMessageType('nota')} className={"flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors " + (messageType === 'nota' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-600')}><MessageSquare className="inline h-4 w-4 mr-1" />Nota</button>
            </div>
            <div className="flex gap-2">
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={messageType === 'whatsapp' ? 'Escribe un mensaje...' : messageType === 'llamada' ? 'Resumen de la llamada...' : 'Agregar nota...'} className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={handleSendMessage} disabled={!newMessage.trim() || sendMessageMutation.isPending} className="px-4 py-2 bg-[#007aff] text-white rounded-lg disabled:opacity-50"><Send className="h-4 w-4" /></button>
            </div>
            {messageType === 'whatsapp' && <p className="text-xs text-gray-500 mt-2">Si WhatsApp falla, usa el boton de arriba</p>}
          </div>
          <div ref={chatContainerRef} className="max-h-[300px] overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-[#c7c7cc] text-sm">Sin conversaciones</div>
            ) : (
              conversations.map((conv: any) => (
                <div key={conv.id} className={"px-4 py-2 flex " + (conv.direction === "entrante" ? "justify-start" : "justify-end")}>
                  <div className={"max-w-[80%] rounded-lg px-3 py-2 group " + (conv.direction === "entrante" ? "bg-gray-100" : "bg-[#DCF8C6]")}>
                    <div className="flex items-center gap-2 mb-1">
                      {conv.type === "whatsapp" && <MessageCircle className="h-3 w-3 text-[#25D366]" />}
                      {conv.type === "llamada" && <PhoneCall className="h-3 w-3 text-blue-500" />}
                      {conv.type === "nota" && <MessageSquare className="h-3 w-3 text-yellow-500" />}
                      <span className="text-[10px] text-gray-500">{conv.direction === "entrante" ? "Recibido" : "Enviado"}</span>
                      <span className="text-[10px] text-gray-400">{formatRelativeTime(conv.createdAt)}</span>
                      <button onClick={() => deleteConversationMutation.mutate(conv.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity ml-auto"><Trash2 className="h-3 w-3" /></button>
                    </div>
                    <p className="text-sm">{conv.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
{contact.createdAt && <p className="text-center text-ios-footnote text-[#6b7280] mt-8">{formatDate(contact.createdAt)}</p>}
      </div>
    </div>
  )
}
