import { Hono } from 'hono'
import { db } from '../db'
import { tasks, contacts } from '../db/schema'
import { eq } from 'drizzle-orm'
import { google } from 'googleapis'
import * as fs from 'fs'
import * as path from 'path'

export const googleCalendarRoutes = new Hono()

// Use data directory for credentials in production
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

function getAuthenticatedClient() {
  const tokPath = getTokenPath()
  if (!fs.existsSync(tokPath)) {
    throw new Error('Not authenticated with Google')
  }

  const oauth2Client = getOAuth2Client()
  const tokens = JSON.parse(fs.readFileSync(tokPath, 'utf8'))
  oauth2Client.setCredentials(tokens)
  return oauth2Client
}

// Check if calendar is connected
googleCalendarRoutes.get('/status', async (c) => {
  try {
    const tokPath = getTokenPath()
    if (!fs.existsSync(tokPath)) {
      return c.json({ connected: false })
    }

    const auth = getAuthenticatedClient()
    const calendar = google.calendar({ version: 'v3', auth })

    // Test the connection by getting calendar list
    await calendar.calendarList.list({ maxResults: 1 })

    return c.json({ connected: true })
  } catch (error: any) {
    return c.json({ connected: false, error: error.message })
  }
})

// Schedule a job - creates task + calendar event
googleCalendarRoutes.post('/schedule-job', async (c) => {
  try {
    const body = await c.req.json()
    const { contactId, title, description, startDateTime, endDateTime, value, notes } = body

    if (!contactId || !title || !startDateTime) {
      return c.json({ error: 'contactId, title, and startDateTime are required' }, 400)
    }

    // Get contact info
    const contact = await db.select().from(contacts).where(eq(contacts.id, contactId)).get()
    if (!contact) {
      return c.json({ error: 'Contact not found' }, 404)
    }

    const auth = getAuthenticatedClient()
    const calendar = google.calendar({ version: 'v3', auth })

    // Create Google Calendar event
    const eventDescription = [
      description || '',
      notes ? `Notas: ${notes}` : '',
      value ? `Valor cotizado: $${value.toLocaleString()}` : '',
      `Cliente: ${contact.name}`,
      contact.phone ? `Tel: ${contact.phone}` : '',
      contact.address ? `Direccion: ${contact.address}` : '',
    ].filter(Boolean).join('\n')

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `${title} - ${contact.name}`,
        description: eventDescription,
        start: {
          dateTime: startDateTime,
          timeZone: 'America/Mexico_City',
        },
        end: {
          dateTime: endDateTime || new Date(new Date(startDateTime).getTime() + 2 * 60 * 60 * 1000).toISOString(),
          timeZone: 'America/Mexico_City',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      },
    })

    // Create task in database
    const task = await db.insert(tasks).values({
      contactId,
      title,
      description: eventDescription,
      dueDate: startDateTime.split('T')[0],
      priority: 'alta',
      completed: false,
      googleCalendarEventId: event.data.id,
    }).returning()

    // Update contact category to 'cliente' and lastContactDate
    await db.update(contacts)
      .set({
        category: 'cliente',
        lastContactDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(contacts.id, contactId))

    return c.json({
      success: true,
      task: task[0],
      calendarEventId: event.data.id,
      calendarEventLink: event.data.htmlLink,
    })
  } catch (error: any) {
    console.error('Schedule job error:', error)
    return c.json({ error: error.message || 'Failed to schedule job' }, 500)
  }
})

// Update calendar event
googleCalendarRoutes.put('/events/:taskId', async (c) => {
  try {
    const taskId = parseInt(c.req.param('taskId'))
    const body = await c.req.json()
    const { title, description, startDateTime, endDateTime } = body

    const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get()
    if (!task || !task.googleCalendarEventId) {
      return c.json({ error: 'Task not found or no calendar event' }, 404)
    }

    const auth = getAuthenticatedClient()
    const calendar = google.calendar({ version: 'v3', auth })

    await calendar.events.patch({
      calendarId: 'primary',
      eventId: task.googleCalendarEventId,
      requestBody: {
        summary: title,
        description,
        start: startDateTime ? { dateTime: startDateTime, timeZone: 'America/Mexico_City' } : undefined,
        end: endDateTime ? { dateTime: endDateTime, timeZone: 'America/Mexico_City' } : undefined,
      },
    })

    // Update task
    await db.update(tasks)
      .set({
        title: title || task.title,
        description: description || task.description,
        dueDate: startDateTime ? startDateTime.split('T')[0] : task.dueDate,
      })
      .where(eq(tasks.id, taskId))

    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to update event' }, 500)
  }
})

// Delete calendar event
googleCalendarRoutes.delete('/events/:taskId', async (c) => {
  try {
    const taskId = parseInt(c.req.param('taskId'))

    const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get()
    if (!task) {
      return c.json({ error: 'Task not found' }, 404)
    }

    if (task.googleCalendarEventId) {
      try {
        const auth = getAuthenticatedClient()
        const calendar = google.calendar({ version: 'v3', auth })

        await calendar.events.delete({
          calendarId: 'primary',
          eventId: task.googleCalendarEventId,
        })
      } catch (e) {
        // Event may already be deleted, continue
      }
    }

    // Delete task
    await db.delete(tasks).where(eq(tasks.id, taskId))

    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to delete event' }, 500)
  }
})
