import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Send, Phone, ArrowLeft, User, Trash2, RefreshCw, Image, Mic, Video, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
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

interface ChatContact {
  id: number
  contactId: number
  content: string
  direction: string
  createdAt: string
  mediaType?: string | null
  mediaUrl?: string | null
  contact: {
    id: number
    name: string
    phone: string
    category: string
  }
}

interface WhatsAppChat {
  id: string
  phone: string
  name: string
  lastMessage: string
  lastMessageTime: string | null
  unreadCount: number
}

interface Message {
  id: number
  content: string
  direction: string
  createdAt: string
  type: string
  mediaType?: string | null
  mediaUrl?: string | null
}

// Media preview component
function MediaPreview({ mediaType, mediaUrl, content }: { mediaType?: string | null; mediaUrl?: string | null; content: string }) {
  if (!mediaType || !mediaUrl) {
    return <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
  }

  const fullUrl = mediaUrl.startsWith('/') ? mediaUrl : '/' + mediaUrl

  if (mediaType === 'image') {
    return (
      <div className="space-y-1">
        <a href={fullUrl} target="_blank" rel="noopener noreferrer">
          <img 
            src={fullUrl} 
            alt="Imagen" 
            className="max-w-full rounded-lg max-h-64 object-contain cursor-pointer hover:opacity-90"
            loading="lazy"
          />
        </a>
        {content && content !== '[image]' && (
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        )}
      </div>
    )
  }

  if (mediaType === 'audio') {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
          <Mic className="h-5 w-5 text-green-600 flex-shrink-0" />
          <audio controls className="w-full max-w-[200px] h-8">
            <source src={fullUrl} />
            Tu navegador no soporta audio
          </audio>
        </div>
        {content && content !== '[audio]' && (
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        )}
      </div>
    )
  }

  if (mediaType === 'video') {
    return (
      <div className="space-y-1">
        <video 
          controls 
          className="max-w-full rounded-lg max-h-64"
          preload="metadata"
        >
          <source src={fullUrl} />
          Tu navegador no soporta video
        </video>
        {content && content !== '[video]' && (
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        )}
      </div>
    )
  }

  if (mediaType === 'document') {
    return (
      <div className="space-y-1">
        <a 
          href={fullUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-gray-100 rounded-lg p-3 hover:bg-gray-200 transition-colors"
        >
          <FileText className="h-8 w-8 text-blue-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Documento</p>
            <p className="text-xs text-muted-foreground">Clic para abrir</p>
          </div>
        </a>
        {content && content !== '[document]' && (
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        )}
      </div>
    )
  }

  // Default fallback
  return (
    <div className="space-y-1">
      <a 
        href={fullUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-600 underline text-sm"
      >
        Ver archivo adjunto
      </a>
      {content && (
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
      )}
    </div>
  )
}

// Media icon for chat list preview
function MediaIcon({ mediaType }: { mediaType?: string | null }) {
  if (!mediaType) return null
  
  if (mediaType === 'image') return <Image className="h-3 w-3 inline mr-1" />
  if (mediaType === 'audio') return <Mic className="h-3 w-3 inline mr-1" />
  if (mediaType === 'video') return <Video className="h-3 w-3 inline mr-1" />
  if (mediaType === 'document') return <FileText className="h-3 w-3 inline mr-1" />
  return null
}

export default function Chats() {
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null)
  const [selectedWaChat, setSelectedWaChat] = useState<WhatsAppChat | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'crm' | 'whatsapp'>('crm')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Get chat list (contacts with recent conversations)
  const { data: chatList = [], refetch: refetchChatList } = useQuery<ChatContact[]>({
    queryKey: ['chat-list'],
    queryFn: async () => {
      const res = await fetch('/api/conversations/recent?limit=50')
      return res.json()
    },
    refetchInterval: 5000,
  })

  // Get all WhatsApp chats
  const { data: waChats = [], refetch: refetchWaChats, isLoading: isLoadingWaChats } = useQuery<WhatsAppChat[]>({
    queryKey: ['whatsapp-chats'],
    queryFn: async () => {
      const res = await fetch('/api/whatsapp/chats')
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 10000,
    enabled: activeTab === 'whatsapp',
  })

  // Get selected contact info
  const selectedChat = chatList.find(c => c.contact?.id === selectedContactId)

  // Get conversation for selected contact
  const { data: messages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ['chat-messages', selectedContactId],
    queryFn: async () => {
      if (!selectedContactId) return []
      const res = await fetch('/api/conversations/contact/' + selectedContactId)
      return res.json()
    },
    enabled: !!selectedContactId,
    refetchInterval: 3000,
  })

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const phone = selectedChat?.contact?.phone || selectedWaChat?.phone
      const contactId = selectedContactId
      if (!phone) throw new Error('No hay telefono')
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          message,
          contactId,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Error al enviar')
      }
      return data
    },
    onSuccess: () => {
      setNewMessage('')
      refetchMessages()
      refetchChatList()
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo enviar',
      })
    },
  })

  // Delete conversation mutation
  const deleteMutation = useMutation({
    mutationFn: async (contactId: number) => {
      const res = await fetch('/api/conversations/contact/' + contactId, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Error al eliminar')
      return res.json()
    },
    onSuccess: () => {
      toast({
        title: 'Conversacion eliminada',
        description: 'Se eliminaron todos los mensajes de este contacto',
      })
      setSelectedContactId(null)
      refetchChatList()
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar la conversacion',
      })
    },
  })

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'Hoy'
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer'
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }

  const handleSend = () => {
    if (!newMessage.trim()) return
    sendMutation.mutate(newMessage.trim())
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Normalize Mexican phone for comparison (handles 521 vs 52 variants)
  const normalizePhone = (phone: string): string[] => {
    const clean = phone.replace(/[^0-9]/g, '')
    if (!clean || clean.length < 10) return []
    const variants = [clean]
    // Mexican 521 -> 52 variant
    if (clean.startsWith('521') && clean.length === 13) {
      variants.push('52' + clean.substring(3))
    }
    // Mexican 52 -> 521 variant
    if (clean.startsWith('52') && !clean.startsWith('521') && clean.length === 12) {
      variants.push('521' + clean.substring(2))
    }
    // Last 10 digits for local format
    if (clean.length >= 10) {
      variants.push(clean.slice(-10))
    }
    return variants
  }

  const handleSelectWaChat = async (waChat: WhatsAppChat) => {
    setSelectedWaChat(waChat)
    // Check if contact exists in CRM
    const waVariants = normalizePhone(waChat.phone)
    const existingChat = chatList.find(c => {
      if (!c.contact?.phone) return false
      const crmVariants = normalizePhone(c.contact.phone)
      // Check if any variant matches
      return waVariants.some(wv => crmVariants.includes(wv))
    })
    if (existingChat) {
      setSelectedContactId(existingChat.contact.id)
    } else {
      setSelectedContactId(null)
    }
  }

  // Get preview text for chat list
  const getPreviewText = (chat: ChatContact) => {
    if (chat.mediaType) {
      const mediaNames: Record<string, string> = {
        image: 'Imagen',
        audio: 'Audio',
        video: 'Video',
        document: 'Documento',
      }
      return mediaNames[chat.mediaType] || 'Archivo'
    }
    return chat.content
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] bg-white rounded-lg border overflow-hidden">
      {/* Left Panel - Chat List */}
      <div className={cn(
        "w-full lg:w-80 border-r flex flex-col bg-white",
        (selectedContactId || selectedWaChat) ? "hidden lg:flex" : "flex"
      )}>
        <div className="p-4 border-b bg-[#f0f2f5]">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-3">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Chats
          </h2>
          {/* Tab buttons */}
          <div className="flex bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('crm')}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors",
                activeTab === 'crm' ? "bg-white shadow-sm" : "text-gray-600 hover:text-gray-900"
              )}
            >
              CRM
            </button>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors",
                activeTab === 'whatsapp' ? "bg-white shadow-sm" : "text-gray-600 hover:text-gray-900"
              )}
            >
              WhatsApp
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'crm' ? (
            // CRM Chats (contacts with conversations)
            chatList.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">
                No hay conversaciones
              </p>
            ) : (
              chatList.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => {
                    setSelectedContactId(chat.contact?.id || null)
                    setSelectedWaChat(null)
                  }}
                  className={cn(
                    "w-full p-3 flex items-center gap-3 hover:bg-[#f0f2f5] transition-colors border-b text-left",
                    selectedContactId === chat.contact?.id && "bg-[#f0f2f5]"
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-medium text-green-700">
                      {chat.contact?.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className="font-medium truncate">{chat.contact?.name || 'Desconocido'}</p>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {formatDate(chat.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.direction === 'saliente' && '✓ '}
                      <MediaIcon mediaType={chat.mediaType} />
                      {getPreviewText(chat)}
                    </p>
                  </div>
                </button>
              ))
            )
          ) : (
            // WhatsApp Chats (all from WhatsApp)
            <>
              <div className="p-2 border-b flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchWaChats()}
                  disabled={isLoadingWaChats}
                >
                  <RefreshCw className={cn("h-4 w-4", isLoadingWaChats && "animate-spin")} />
                </Button>
              </div>
              {waChats.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">
                  {isLoadingWaChats ? 'Cargando chats...' : 'No hay chats de WhatsApp'}
                </p>
              ) : (
                waChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleSelectWaChat(chat)}
                    className={cn(
                      "w-full p-3 flex items-center gap-3 hover:bg-[#f0f2f5] transition-colors border-b text-left",
                      selectedWaChat?.id === chat.id && "bg-[#f0f2f5]"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-medium text-green-700">
                        {chat.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <p className="font-medium truncate">{chat.name}</p>
                        {chat.lastMessageTime && (
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatDate(chat.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.lastMessage || 'Sin mensajes'}
                      </p>
                    </div>
                    {chat.unreadCount > 0 && (
                      <span className="bg-green-500 text-white text-xs rounded-full px-2 py-0.5">
                        {chat.unreadCount}
                      </span>
                    )}
                  </button>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Panel - Chat View */}
      <div className={cn(
        "flex-1 flex flex-col",
        !(selectedContactId || selectedWaChat) ? "hidden lg:flex" : "flex"
      )}>
        {!(selectedContactId || selectedWaChat) ? (
          <div className="flex-1 flex items-center justify-center bg-[#f0f2f5]">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-green-200" />
              <p className="text-lg">Selecciona un chat</p>
              <p className="text-sm">para ver la conversacion</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-3 border-b bg-[#f0f2f5] flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden flex items-center gap-1 text-green-600"
                onClick={() => {
                  setSelectedContactId(null)
                  setSelectedWaChat(null)
                }}
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Chats</span>
              </Button>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-lg font-medium text-green-700">
                  {(selectedChat?.contact?.name || selectedWaChat?.name)?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium">{selectedChat?.contact?.name || selectedWaChat?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedChat?.contact?.phone || (selectedWaChat ? '+' + selectedWaChat.phone : '')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.location.href = 'tel:' + (selectedChat?.contact?.phone || selectedWaChat?.phone)}
              >
                <Phone className="h-5 w-5 text-green-600" />
              </Button>
              {selectedContactId && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.location.href = '/contacts/' + selectedContactId}
                    title="Ver perfil"
                  >
                    <User className="h-5 w-5 text-blue-500" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" title="Eliminar conversacion">
                        <Trash2 className="h-5 w-5 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar conversacion</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esto eliminara todos los mensajes con este contacto. Esta accion no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => selectedContactId && deleteMutation.mutate(selectedContactId)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#e5ddd5]" style={{
              backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAhGVYSWZNTQAqAAAACAAFARIAAwAAAAEAAQAAARoABQAAAAEAAABKARsABQAAAAEAAABSASgAAwAAAAEAAgAAh2kABAAAAAEAAABaAAAAAAAAAEgAAAABAAAASAAAAAEAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAMqADAAQAAAABAAAAMgAAAABfvA/wAAAACXBIWXMAAAsTAAALEwEAmpwYAAABWWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgoZXuEHAAAA0klEQVRoBe3ZwQ3CMBAE0N0JdEAPtEIJdEYZdAGF0AeFQAkpgibsgRBLYGJ/7o3kSM7szO5FuZzLspzP5y/g9wX8TsBfCAEB4QlM8Pv8/f18v09nZ1f8DgLi/wH8DgLi/wH8zgLi/wH8TgKi/wH8pgKi/wH8JgOi/wF8xwBRf4DfUUDcP8CfMED8P8AfKSDBH8CfYYDoD+FPkCD6w/gDJYj+UP4ACRI/nD9Igsyf4A+WIPNP8AdLkPnT/MESxH46f6gE8dP8dQT4d/6A/4T/BL8B/gH+A/4T/KcC/gH+A/4R/Kf4A/4T/KcA/gH+A/4D/lP8A/4D/gP+U/wD/hP8A/5T/AP+E/wD/lP8A/4D/gP+U/wD/gP+A/5T/AP+A/4D/gH+M/xP8J8APwD/Cf4D4D/5HwI/4A==")'
            }}>
              {selectedContactId ? (
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.direction === 'saliente' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] rounded-lg px-3 py-2 shadow-sm",
                          msg.direction === 'saliente'
                            ? "bg-[#dcf8c6] rounded-tr-none"
                            : "bg-white rounded-tl-none"
                        )}
                      >
                        <MediaPreview 
                          mediaType={msg.mediaType} 
                          mediaUrl={msg.mediaUrl} 
                          content={msg.content} 
                        />
                        <p className={cn(
                          "text-[10px] text-right mt-1",
                          msg.direction === 'saliente' ? "text-green-700" : "text-gray-500"
                        )}>
                          {formatTime(msg.createdAt)}
                          {msg.direction === 'saliente' && ' ✓✓'}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              ) : selectedWaChat && !selectedContactId ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground bg-white/80 rounded-lg p-6">
                    <p className="mb-2">Este contacto no esta en tu CRM</p>
                    <p className="text-sm">Puedes enviarle un mensaje y se creara automaticamente</p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Message Input */}
            <div className="p-3 border-t bg-[#f0f2f5] flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-white"
                disabled={sendMutation.isPending}
              />
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || sendMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
