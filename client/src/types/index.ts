export type LeadSource = 'referido' | 'web' | 'redes' | 'evento' | 'llamada_fria' | 'otro'

export interface Contact {
  id: number
  googleSheetRowId?: string
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
  category: 'cliente' | 'prospecto' | 'proveedor' | 'personal'
  tags: string[]
  avatarUrl?: string
  score: number
  // Campos de gestion comercial
  leadSource?: LeadSource
  lastContactDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Opportunity {
  id: number
  contactId: number
  contact?: Contact
  title: string
  value: number
  probability: number
  stage: string
  expectedCloseDate?: string
  nextFollowup?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface PipelineStage {
  id: number
  name: string
  order: number
  color: string
}

export interface Conversation {
  id: number
  contactId: number
  type: 'nota' | 'llamada' | 'email' | 'reunion' | 'whatsapp'
  subject?: string
  content: string
  direction: 'entrante' | 'saliente'
  channel: 'manual' | 'email' | 'whatsapp' | 'telefono'
  createdAt: string
}

export interface Task {
  id: number
  contactId?: number
  contact?: Contact
  opportunityId?: number
  title: string
  description?: string
  dueDate: string
  completed: boolean
  priority: 'baja' | 'media' | 'alta'
  createdAt: string
}

export interface MessageTemplate {
  id: number
  name: string
  subject?: string
  content: string
  channel: 'email' | 'whatsapp'
  variables: string[]
}

export interface Campaign {
  id: number
  name: string
  templateId: number
  template?: MessageTemplate
  channel: 'email' | 'whatsapp'
  status: 'borrador' | 'programada' | 'enviando' | 'completada' | 'fallida'
  scheduledAt?: string
  sentCount: number
  createdAt: string
}

export interface DashboardStats {
  totalContacts: number
  activeOpportunities: number
  pendingTasks: number
  totalValue: number
  recentContacts: Contact[]
  upcomingTasks: Task[]
}

// Constantes para opciones de lead source
export const LEAD_SOURCE_OPTIONS = [
  { value: 'referido', label: 'Referido' },
  { value: 'web', label: 'Sitio Web' },
  { value: 'redes', label: 'Redes Sociales' },
  { value: 'evento', label: 'Evento' },
  { value: 'llamada_fria', label: 'Llamada en Frio' },
  { value: 'otro', label: 'Otro' },
] as const
