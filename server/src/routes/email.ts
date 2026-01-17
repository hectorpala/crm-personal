import { Hono } from 'hono'
import { google } from 'googleapis'
import * as fs from 'fs'

export const emailRoutes = new Hono()

function getOAuth2Client() {
  let credentials = {
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirect_uri: 'http://localhost:3000/api/google-sheets/callback',
  }

  if (fs.existsSync('credentials.json')) {
    const creds = JSON.parse(fs.readFileSync('credentials.json', 'utf8'))
    credentials = {
      client_id: creds.web?.client_id || creds.installed?.client_id || '',
      client_secret: creds.web?.client_secret || creds.installed?.client_secret || '',
      redirect_uri: 'http://localhost:3000/api/google-sheets/callback',
    }
  }

  const oauth2Client = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    credentials.redirect_uri
  )

  if (fs.existsSync('token.json')) {
    const tokens = JSON.parse(fs.readFileSync('token.json', 'utf8'))
    oauth2Client.setCredentials(tokens)
  }

  return oauth2Client
}

// Send single email
emailRoutes.post('/send', async (c) => {
  const body = await c.req.json()
  const { to, subject, message } = body

  if (!to || !subject || !message) {
    return c.json({ error: 'Missing required fields: to, subject, message' }, 400)
  }

  try {
    const oauth2Client = getOAuth2Client()
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Create email in RFC 2822 format
    const emailContent = [
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      'To: ' + to,
      'Subject: ' + subject,
      '',
      message,
    ].join('\n')

    const encodedMessage = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    })

    return c.json({ success: true, messageId: result.data.id })
  } catch (error: any) {
    console.error('Email send error:', error)
    return c.json({ error: error.message || 'Failed to send email' }, 500)
  }
})

// Send bulk emails
emailRoutes.post('/send-bulk', async (c) => {
  const body = await c.req.json()
  const { recipients, subject, message } = body

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return c.json({ error: 'Recipients array required' }, 400)
  }

  if (!subject || !message) {
    return c.json({ error: 'Subject and message required' }, 400)
  }

  try {
    const oauth2Client = getOAuth2Client()
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const recipient of recipients) {
      try {
        // Personalize message with {{name}} placeholder
        const personalizedMessage = message.replace(/\{\{name\}\}/g, recipient.name || '')

        const emailContent = [
          'Content-Type: text/html; charset=utf-8',
          'MIME-Version: 1.0',
          'To: ' + recipient.email,
          'Subject: ' + subject,
          '',
          personalizedMessage,
        ].join('\n')

        const encodedMessage = Buffer.from(emailContent)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')

        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage,
          },
        })

        sent++

        // Rate limiting: wait 100ms between emails to avoid hitting limits
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (err: any) {
        failed++
        errors.push(recipient.email + ': ' + (err.message || 'Unknown error'))
      }
    }

    return c.json({ success: true, sent, failed, errors })
  } catch (error: any) {
    console.error('Bulk email error:', error)
    return c.json({ error: error.message || 'Failed to send bulk emails' }, 500)
  }
})

// Get connected Gmail account info
emailRoutes.get('/account', async (c) => {
  try {
    const oauth2Client = getOAuth2Client()
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    
    const profile = await gmail.users.getProfile({ userId: 'me' })
    
    return c.json({ 
      success: true, 
      email: profile.data.emailAddress,
      messagesTotal: profile.data.messagesTotal,
      threadsTotal: profile.data.threadsTotal
    })
  } catch (error: any) {
    console.error('Get account error:', error)
    return c.json({ error: error.message || 'Failed to get account info' }, 500)
  }
})
