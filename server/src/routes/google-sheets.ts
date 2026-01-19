import { Hono } from 'hono'
import { db } from '../db'
import { contacts, settings } from '../db/schema'
import { eq } from 'drizzle-orm'
import { google } from 'googleapis'
import * as fs from 'fs'
import * as path from 'path'

export const googleSheetsRoutes = new Hono()

// Normalize phone number to Mexican WhatsApp format
function normalizePhone(phone: string | null | undefined) {
  if (!phone || phone === '-') return null
  let cleaned = phone.replace(/[^0-9+]/g, '')
  if (!cleaned) return null
  const hasPlus = cleaned.startsWith('+')
  if (hasPlus) cleaned = cleaned.substring(1)
  if (cleaned.length === 10) return '+52' + cleaned
  if (cleaned.length === 12 && cleaned.startsWith('52')) return '+' + cleaned
  if (cleaned.length >= 11) return '+' + cleaned
  return hasPlus ? '+' + cleaned : cleaned
}


// Use data directory for credentials in production
const dataDir = process.env.DATABASE_PATH ? path.dirname(process.env.DATABASE_PATH) : '.'
const credentialsPath = path.join(dataDir, 'credentials.json')
const tokenPath = path.join(dataDir, 'token.json')

// Fallback to current directory if not found in data dir
const getCredentialsPath = () => fs.existsSync(credentialsPath) ? credentialsPath : 'credentials.json'
const getTokenPath = () => fs.existsSync(tokenPath) ? tokenPath : 'token.json'

googleSheetsRoutes.get('/auth-url', async (c) => {
  try {
    const oauth2Client = getOAuth2Client()
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
    })
    return c.json({ authUrl })
  } catch (error) {
    return c.json({ error: 'Failed to generate auth URL' }, 500)
  }
})

googleSheetsRoutes.get('/callback', async (c) => {
  const code = c.req.query('code')
  if (!code) {
    return c.json({ error: 'No code provided' }, 400)
  }
  try {
    const oauth2Client = getOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)
    fs.writeFileSync(getTokenPath(), JSON.stringify(tokens))
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: 'Failed to exchange code for tokens' }, 500)
  }
})

googleSheetsRoutes.post('/sync', async (c) => {
  const body = await c.req.json()
  const spreadsheetId = body.spreadsheetId

  if (!spreadsheetId) {
    return c.json({ error: 'Spreadsheet ID required' }, 400)
  }

  try {
    const oauth2Client = getOAuth2Client()
    const tokPath = getTokenPath()

    if (fs.existsSync(tokPath)) {
      const tokens = JSON.parse(fs.readFileSync(tokPath, 'utf8'))
      oauth2Client.setCredentials(tokens)
    } else {
      return c.json({ error: 'Not authenticated' }, 401)
    }

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client })
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
    const sheetNames = spreadsheet.data.sheets
      ?.map(s => s.properties?.title)
      .filter(name => name) || []

    let imported = 0
    let updated = 0

    for (const sheetName of sheetNames) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'" + sheetName + "'!A2:O5000",
      })

      const rows = response.data.values || []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const name = row[1]
        const phone = row[5]
        const email = row[6]
        const whatsapp = row[11]
        const category = row[2]
        const company = row[7]
        const address = row[8]

        if (!name) continue

        const contactEmail = (email && email !== '-') ? email :
                            (whatsapp && whatsapp !== '-') ? whatsapp + '@whatsapp' :
                            (phone && phone !== '-') ? phone + '@phone' : null

        if (!contactEmail) continue

        const rowId = sheetName + '_row_' + (i + 2)
        const existing = await db.select()
          .from(contacts)
          .where(eq(contacts.googleSheetRowId, rowId))
          .get()

        const contactPhone = normalizePhone(phone) || normalizePhone(whatsapp)

        if (existing) {
          await db.update(contacts)
            .set({
              name: name,
              email: contactEmail,
              phone: contactPhone,
              company: (company && company !== '-') ? company : sheetName,
              category: "prospecto",
            address: (address && address !== "-") ? address : null,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(contacts.id, existing.id))
          updated++
        } else {
          await db.insert(contacts).values({
            googleSheetRowId: rowId,
            name: name,
            email: contactEmail,
            phone: contactPhone,
            company: (company && company !== '-') ? company : sheetName,
            category: "prospecto",
            address: (address && address !== "-") ? address : null,
            tags: JSON.stringify([category || 'Sin categoria', sheetName]),
            score: 0,
          })
          imported++
        }
      }
    }

    const existingSetting = await db.select().from(settings).where(eq(settings.key, 'spreadsheetId')).get()
    if (existingSetting) {
      await db.update(settings).set({ value: spreadsheetId }).where(eq(settings.key, 'spreadsheetId'))
    } else {
      await db.insert(settings).values({ key: 'spreadsheetId', value: spreadsheetId })
    }

    return c.json({ success: true, imported, updated, sheets: sheetNames })
  } catch (error: any) {
    console.error('Sync error:', error)
    return c.json({ error: error.message || 'Sync failed' }, 500)
  }
})

googleSheetsRoutes.get('/status', async (c) => {
  const tokPath = getTokenPath()
  const connected = fs.existsSync(tokPath)
  let email = null

  if (connected) {
    try {
      const oauth2Client = getOAuth2Client()
      const tokens = JSON.parse(fs.readFileSync(tokPath, 'utf8'))
      oauth2Client.setCredentials(tokens)
      
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
      const userInfo = await oauth2.userinfo.get()
      email = userInfo.data.email
    } catch (error) {
      // Token might not have userinfo scope, try Gmail
      try {
        const oauth2Client = getOAuth2Client()
        const tokens = JSON.parse(fs.readFileSync(tokPath, 'utf8'))
        oauth2Client.setCredentials(tokens)
        
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
        const profile = await gmail.users.getProfile({ userId: 'me' })
        email = profile.data.emailAddress
      } catch (e) {
        // Could not get email
      }
    }
  }

  const spreadsheetId = await db.select()
    .from(settings)
    .where(eq(settings.key, 'spreadsheetId'))
    .get()

  return c.json({
    connected,
    email,
    spreadsheetId: spreadsheetId?.value || null,
  })
})

googleSheetsRoutes.delete('/disconnect', async (c) => {
  try {
    const tokPath = getTokenPath()
    if (fs.existsSync(tokPath)) {
      fs.unlinkSync(tokPath)
    }
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: 'Failed to disconnect' }, 500)
  }
})

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
