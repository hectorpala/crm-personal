import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { contactsRoutes } from './routes/contacts'
import { opportunitiesRoutes } from './routes/opportunities'
import { tasksRoutes } from './routes/tasks'
import { conversationsRoutes } from './routes/conversations'
import { messagingRoutes } from './routes/messaging'
import { settingsRoutes } from './routes/settings'
import { googleSheetsRoutes } from './routes/google-sheets'
import { emailRoutes } from './routes/email'
import { whatsappRoutes } from './routes/whatsapp'
import { googleCalendarRoutes } from './routes/google-calendar'
import { initWhatsAppClient, isWhatsAppEnabled } from './services/whatsapp-web'

const app = new Hono()

// Environment
const isProduction = process.env.NODE_ENV === 'production'
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
const port = parseInt(process.env.PORT || '3000')
const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads'

// Middleware
app.use('*', logger())
app.use('/api/*', cors({
  origin: isProduction ? '*' : corsOrigin,
  credentials: true,
}))

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Media files endpoint
app.get('/api/media/:filename', (c) => {
  const filename = c.req.param('filename')
  
  // Security: only allow alphanumeric, underscore, dash, and dot
  if (!/^[a-zA-Z0-9_\-.]+$/.test(filename)) {
    return c.json({ error: 'Invalid filename' }, 400)
  }
  
  const filepath = join(UPLOADS_DIR, filename)
  
  if (!existsSync(filepath)) {
    return c.json({ error: 'File not found' }, 404)
  }
  
  try {
    const file = readFileSync(filepath)
    
    // Determine content type
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'ogg': 'audio/ogg',
      'mp3': 'audio/mpeg',
      'm4a': 'audio/mp4',
      'mp4': 'video/mp4',
      'pdf': 'application/pdf',
    }
    
    const contentType = contentTypes[ext || ''] || 'application/octet-stream'
    
    return new Response(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    console.error('Error serving media file:', error)
    return c.json({ error: 'Error reading file' }, 500)
  }
})

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
app.route('/api/google-calendar', googleCalendarRoutes)

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
if (isWhatsAppEnabled()) {
  console.log('Auto-initializing WhatsApp Web client...')
  initWhatsAppClient()
}
