const API_BASE = '/api'

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(API_BASE + endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || 'API Error')
  }
  
  return response.json()
}

// Contacts
export const contactsAPI = {
  getAll: () => fetchAPI('/contacts'),
  getById: (id: number) => fetchAPI('/contacts/' + id),
  create: (data: any) => fetchAPI('/contacts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => fetchAPI('/contacts/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => fetchAPI('/contacts/' + id, { method: 'DELETE' }),
}

// Opportunities
export const opportunitiesAPI = {
  getAll: () => fetchAPI('/opportunities'),
  getStages: () => fetchAPI('/opportunities/stages'),
  create: (data: any) => fetchAPI('/opportunities', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => fetchAPI('/opportunities/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  updateStage: (id: number, stage: string) => fetchAPI('/opportunities/' + id + '/stage', { method: 'PATCH', body: JSON.stringify({ stage }) }),
  delete: (id: number) => fetchAPI('/opportunities/' + id, { method: 'DELETE' }),
}

// Tasks
export const tasksAPI = {
  getAll: () => fetchAPI('/tasks'),
  create: (data: any) => fetchAPI('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => fetchAPI('/tasks/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  toggle: (id: number) => fetchAPI('/tasks/' + id + '/toggle', { method: 'PATCH' }),
  delete: (id: number) => fetchAPI('/tasks/' + id, { method: 'DELETE' }),
}

// Conversations
export const conversationsAPI = {
  getByContact: (contactId: number) => fetchAPI('/conversations/contact/' + contactId),
  create: (data: any) => fetchAPI('/conversations', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: number) => fetchAPI('/conversations/' + id, { method: 'DELETE' }),
}

// Messaging
export const messagingAPI = {
  getTemplates: () => fetchAPI('/messaging/templates'),
  createTemplate: (data: any) => fetchAPI('/messaging/templates', { method: 'POST', body: JSON.stringify(data) }),
  deleteTemplate: (id: number) => fetchAPI('/messaging/templates/' + id, { method: 'DELETE' }),
  getCampaigns: () => fetchAPI('/messaging/campaigns'),
  createCampaign: (data: any) => fetchAPI('/messaging/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  sendCampaign: (id: number, contactIds: number[]) => fetchAPI('/messaging/campaigns/' + id + '/send', { method: 'POST', body: JSON.stringify({ contactIds }) }),
}

// Settings
export const settingsAPI = {
  getAll: () => fetchAPI('/settings'),
  get: (key: string) => fetchAPI('/settings/' + key),
  set: (key: string, value: string) => fetchAPI('/settings/' + key, { method: 'PUT', body: JSON.stringify({ value }) }),
}

// Google Sheets
export const googleSheetsAPI = {
  getAuthUrl: () => fetchAPI('/google-sheets/auth-url'),
  sync: (spreadsheetId: string) => fetchAPI('/google-sheets/sync', { method: 'POST', body: JSON.stringify({ spreadsheetId }) }),
  getStatus: () => fetchAPI('/google-sheets/status'),
}
