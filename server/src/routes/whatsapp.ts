import { Hono } from 'hono'
import { db } from '../db'
import { conversations, contacts } from '../db/schema'
import { eq } from 'drizzle-orm'
import { 
  initWhatsAppClient, 
  getWhatsAppStatus, 
  sendWhatsAppMessage, 
  disconnectWhatsApp,
  isLocalMode 
} from '../services/whatsapp-web'

export const whatsappRoutes = new Hono()

// WhatsApp Cloud API configuration (for production)
const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0'
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || ''

// Clean phone number for WhatsApp
function cleanPhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9+]/g, '')
  if (!cleaned.startsWith('+')) {
    if (!cleaned.startsWith('52')) {
      cleaned = '52' + cleaned
    }
  } else {
    cleaned = cleaned.substring(1)
  }
  return cleaned
}

// Format phone for WhatsApp API
function formatPhoneForAPI(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.length === 10) {
    cleaned = '52' + cleaned
  }
  return cleaned
}

// Initialize WhatsApp Web client (local mode only)
whatsappRoutes.post('/init', async (c) => {
  if (!isLocalMode()) {
    return c.json({ error: 'WhatsApp Web only available in local mode' }, 400)
  }
  
  initWhatsAppClient()
  return c.json({ success: true, message: 'Initializing WhatsApp client...' })
})

// Get WhatsApp status
whatsappRoutes.get('/status', async (c) => {
  // Check if running in local mode with whatsapp-web.js
  if (isLocalMode()) {
    const status = getWhatsAppStatus()
    return c.json({
      mode: 'local',
      configured: status.initialized,
      connected: status.ready,
      qrCode: status.qrCode,
      phoneNumber: status.info?.phoneNumber,
      verifiedName: status.info?.name,
    })
  }
  
  // Cloud API mode
  const configured = !!WHATSAPP_ACCESS_TOKEN
  if (!configured) {
    return c.json({
      mode: 'cloud',
      configured: false,
      message: 'WhatsApp API not configured'
    })
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}`,
      { headers: { 'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}` } }
    )
    const result = await response.json()

    if (!response.ok) {
      return c.json({
        mode: 'cloud',
        configured: true,
        connected: false,
        error: result.error?.message || 'Token invalid'
      })
    }

    return c.json({
      mode: 'cloud',
      configured: true,
      connected: true,
      phoneNumber: result.display_phone_number,
      verifiedName: result.verified_name,
    })
  } catch (error: any) {
    return c.json({
      mode: 'cloud',
      configured: true,
      connected: false,
      error: error.message
    })
  }
})

// Send message
whatsappRoutes.post('/send', async (c) => {
  const body = await c.req.json()
  const { contactId, phone, message } = body

  if (!phone || !message) {
    return c.json({ error: 'Phone and message required' }, 400)
  }

  // Try local mode first
  if (isLocalMode()) {
    const status = getWhatsAppStatus()
    if (status.ready) {
      const result = await sendWhatsAppMessage(phone, message)
      
      if (result.success && contactId) {
        // Log conversation
        await db.insert(conversations).values({
          contactId: parseInt(contactId),
          type: 'whatsapp',
          content: message,
          direction: 'saliente',
          channel: 'whatsapp',
          createdAt: new Date().toISOString(),
        })
        
        // Update lastContactDate
        await db.update(contacts)
          .set({ lastContactDate: new Date().toISOString() })
          .where(eq(contacts.id, parseInt(contactId)))
      }
      
      return c.json(result)
    }
  }

  // Fall back to Cloud API
  if (!WHATSAPP_ACCESS_TOKEN) {
    return c.json({ error: 'WhatsApp not connected', needsSetup: true }, 400)
  }

  const formattedPhone = formatPhoneForAPI(phone)

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: { preview_url: false, body: message },
        }),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      return c.json({ error: result.error?.message || 'Failed to send' }, response.status)
    }

    if (contactId) {
      await db.insert(conversations).values({
        contactId: parseInt(contactId),
        type: 'whatsapp',
        content: message,
        direction: 'saliente',
        channel: 'whatsapp',
        createdAt: new Date().toISOString(),
      })
      
      await db.update(contacts)
        .set({ lastContactDate: new Date().toISOString() })
        .where(eq(contacts.id, parseInt(contactId)))
    }

    return c.json({ success: true, messageId: result.messages?.[0]?.id })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// Disconnect WhatsApp Web
whatsappRoutes.post('/disconnect', async (c) => {
  if (isLocalMode()) {
    await disconnectWhatsApp()
    return c.json({ success: true })
  }
  return c.json({ error: 'Only available in local mode' }, 400)
})

// Generate wa.me link (fallback)
whatsappRoutes.post('/generate-link', async (c) => {
  const body = await c.req.json()
  const { phone, message } = body

  if (!phone) {
    return c.json({ error: 'Phone number required' }, 400)
  }

  const cleanedPhone = cleanPhone(phone)
  const encodedMessage = message ? encodeURIComponent(message) : ''
  const url = 'https://wa.me/' + cleanedPhone + (encodedMessage ? '?text=' + encodedMessage : '')

  return c.json({ success: true, url, phone: cleanedPhone })
})

// Generate bulk links
whatsappRoutes.post('/generate-bulk-links', async (c) => {
  const body = await c.req.json()
  const { recipients, message } = body

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return c.json({ error: 'Recipients array required' }, 400)
  }

  const links = recipients.map((recipient: { phone: string; name?: string }) => {
    const cleanedPhone = cleanPhone(recipient.phone)
    const personalizedMessage = message 
      ? message.replace(/\{\{name\}\}/g, recipient.name || '')
      : ''
    const encodedMessage = encodeURIComponent(personalizedMessage)

    return {
      name: recipient.name || 'Sin nombre',
      phone: recipient.phone,
      cleanedPhone,
      url: 'https://wa.me/' + cleanedPhone + (encodedMessage ? '?text=' + encodedMessage : ''),
    }
  })

  return c.json({ success: true, links, total: links.length })
})

// Webhook for Cloud API (production)
whatsappRoutes.get('/webhook', async (c) => {
  const mode = c.req.query('hub.mode')
  const token = c.req.query('hub.verify_token')
  const challenge = c.req.query('hub.challenge')
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'crm_personal_webhook_token'

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return c.text(challenge || '')
  }
  return c.json({ error: 'Verification failed' }, 403)
})

whatsappRoutes.post('/webhook', async (c) => {
  const body = await c.req.json()

  if (body.object === 'whatsapp_business_account') {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages') {
          for (const message of change.value.messages || []) {
            const from = message.from
            const text = message.text?.body || ''

            const contact = await db.select()
              .from(contacts)
              .where(eq(contacts.phone, '+' + from))
              .get()

            if (contact) {
              await db.insert(conversations).values({
                contactId: contact.id,
                type: 'whatsapp',
                content: text,
                direction: 'entrante',
                channel: 'whatsapp',
                createdAt: new Date().toISOString(),
              })

              await db.update(contacts)
                .set({ lastContactDate: new Date().toISOString() })
                .where(eq(contacts.id, contact.id))
            }
          }
        }
      }
    }
  }

  return c.json({ success: true })
})
