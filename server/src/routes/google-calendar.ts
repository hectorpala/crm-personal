import { Hono } from 'hono'
import { db } from '../db'
import { tasks, contacts } from '../db/schema'
import { eq } from 'drizzle-orm'
import { google } from 'googleapis'
import * as fs from 'fs'
import * as path from 'path'

export const googleCalendarRoutes = new Hono()

const dataDir = process.env.DATABASE_PATH ? path.dirname(process.env.DATABASE_PATH) : '.'
const credentialsPath = path.join(dataDir, 'credentials.json')
const tokenPath = path.join(dataDir, 'token.json')

const getCredentialsPath = () => fs.existsSync(credentialsPath) ? credentialsPath : 'credentials.json'
const getTokenPath = () => fs.existsSync(tokenPath) ? tokenPath : 'token.json'

function getOAuth2Client() {
  const credPath = getCredentialsPath()
  const isProduction = process.env.NODE_ENV === 'production'
  const baseUrl = isProduction ? 'http://crm-plomero.duckdns.org:3000' : 'http://localhost:3000'

  let credentials = {
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirect_uri: baseUrl + '/api/google-sheets/callback',
  }

  if (fs.existsSync(credPath)) {
    const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'))
    credentials = {
      client_id: creds.web?.client_id || creds.installed?.client_id || '',
      client_secret: creds.web?.client_secret || creds.installed?.client_secret || '',
      redirect_uri: baseUrl + '/api/google-sheets/callback',
    }
  }

  return new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    credentials.redirect_uri
  )
}

googleCalendarRoutes.post('/schedule-job', async (c) => {
  const body = await c.req.json()
  const { contactId, title, date, time, value, notes } = body

  if (!contactId || !title || !date) {
    return c.json({ error: 'contactId, title, and date are required' }, 400)
  }

  try {
    const tokPath = getTokenPath()
    if (!fs.existsSync(tokPath)) {
      return c.json({ error: 'Not authenticated with Google' }, 401)
    }

    const oauth2Client = getOAuth2Client()
    const tokens = JSON.parse(fs.readFileSync(tokPath, 'utf8'))
    oauth2Client.setCredentials(tokens)

    const contact = await db.select().from(contacts).where(eq(contacts.id, contactId)).get()
    if (!contact) {
      return c.json({ error: 'Contact not found' }, 404)
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const startDateTime = time ? date + 'T' + time + ':00' : date + 'T09:00:00'
    const endDate = new Date(startDateTime)
    endDate.setHours(endDate.getHours() + 2)

    const event = {
      summary: title + ' - ' + contact.name,
      description: 'Cliente: ' + contact.name + '\nTelefono: ' + (contact.phone || 'N/A') + '\nValor: $' + (value || 0) + '\n\n' + (notes || ''),
      start: {
        dateTime: startDateTime,
        timeZone: 'America/Mexico_City',
      },
      end: {
        dateTime: endDate.toISOString().slice(0, 19),
        timeZone: 'America/Mexico_City',
      },
    }

    const calendarEvent = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    })

    const task = await db.insert(tasks).values({
      contactId,
      title,
      description: notes || '',
      dueDate: date,
      priority: 'alta',
      googleCalendarEventId: calendarEvent.data.id,
    }).returning().get()

    if (contact.category === 'prospecto') {
      await db.update(contacts)
        .set({ category: 'cliente', updatedAt: new Date().toISOString() })
        .where(eq(contacts.id, contactId))
    }

    return c.json({
      success: true,
      task,
      calendarEventId: calendarEvent.data.id,
      calendarLink: calendarEvent.data.htmlLink,
    })
  } catch (error: any) {
    console.error('Schedule job error:', error)
    return c.json({ error: error.message || 'Failed to schedule job' }, 500)
  }
})

googleCalendarRoutes.get('/status', async (c) => {
  const tokPath = getTokenPath()
  const connected = fs.existsSync(tokPath)
  return c.json({ connected })
})
