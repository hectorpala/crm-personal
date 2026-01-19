import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { contactsRoutes } from './routes/contacts'
import { opportunitiesRoutes } from './routes/opportunities'
import { tasksRoutes } from './routes/tasks'
import { conversationsRoutes } from './routes/conversations'
import { messagingRoutes } from './routes/messaging'
import { settingsRoutes } from './routes/settings'
import { googleSheetsRoutes } from './routes/google-sheets'
import { emailRoutes } from './routes/email'
import { whatsappRoutes } from './routes/whatsapp'
import { initWhatsAppClient, isLocalMode } from './services/whatsapp-web'

const app = new Hono()

// Environment
const isProduction = process.env.NODE_ENV === 'production'
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
const port = parseInt(process.env.PORT || '3000')

// Middleware
app.use('*', logger())
app.use('/api/*', cors({
  origin: isProduction ? '*' : corsOrigin,
  credentials: true,
}))

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// API Routes
app.route('/api/contacts', contactsRoutes)
app.route('/api/opportunities', opportunitiesRoutes)
app.route('/api/tasks', tasksRoutes)
app.route('/api/conversations', conversationsRoutes)
app.route('/api/messaging', messagingRoutes)
app.route('/api/settings', settingsRoutes)
app.route('/api/google-sheets', googleSheetsRoutes)
app.route('/api/email', emailRoutes)
app.route('/api/whatsapp', whatsappRoutes)

// Serve static files in production
if (isProduction) {
  app.use('/*', serveStatic({ root: './public' }))
  app.get('*', serveStatic({ path: './public/index.html' }))
}

// Start server
console.log('CRM Personal API running on port ' + port + ' (' + (isProduction ? 'production' : 'development') + ')')

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
})

// Auto-initialize WhatsApp in local mode
if (isLocalMode()) {
  console.log('Auto-initializing WhatsApp Web client...')
  initWhatsAppClient()
}
