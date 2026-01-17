import { create } from 'zustand'
import type { Contact, Opportunity, Task, PipelineStage } from '@/types'

interface AppState {
  // Contacts
  contacts: Contact[]
  setContacts: (contacts: Contact[]) => void
  addContact: (contact: Contact) => void
  updateContact: (id: number, contact: Partial<Contact>) => void
  removeContact: (id: number) => void

  // Opportunities
  opportunities: Opportunity[]
  setOpportunities: (opportunities: Opportunity[]) => void
  addOpportunity: (opportunity: Opportunity) => void
  updateOpportunity: (id: number, opportunity: Partial<Opportunity>) => void
  removeOpportunity: (id: number) => void

  // Pipeline Stages
  stages: PipelineStage[]
  setStages: (stages: PipelineStage[]) => void

  // Tasks
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: number, task: Partial<Task>) => void
  removeTask: (id: number) => void

  // Settings
  googleConnected: boolean
  setGoogleConnected: (connected: boolean) => void
  spreadsheetId: string | null
  setSpreadsheetId: (id: string | null) => void
}

export const useStore = create<AppState>((set) => ({
  // Contacts
  contacts: [],
  setContacts: (contacts) => set({ contacts }),
  addContact: (contact) => set((state) => ({ contacts: [...state.contacts, contact] })),
  updateContact: (id, updates) => set((state) => ({
    contacts: state.contacts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
  })),
  removeContact: (id) => set((state) => ({
    contacts: state.contacts.filter((c) => c.id !== id),
  })),

  // Opportunities
  opportunities: [],
  setOpportunities: (opportunities) => set({ opportunities }),
  addOpportunity: (opportunity) => set((state) => ({ opportunities: [...state.opportunities, opportunity] })),
  updateOpportunity: (id, updates) => set((state) => ({
    opportunities: state.opportunities.map((o) => (o.id === id ? { ...o, ...updates } : o)),
  })),
  removeOpportunity: (id) => set((state) => ({
    opportunities: state.opportunities.filter((o) => o.id !== id),
  })),

  // Stages
  stages: [],
  setStages: (stages) => set({ stages }),

  // Tasks
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  })),
  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id),
  })),

  // Settings
  googleConnected: false,
  setGoogleConnected: (connected) => set({ googleConnected: connected }),
  spreadsheetId: null,
  setSpreadsheetId: (id) => set({ spreadsheetId: id }),
}))
