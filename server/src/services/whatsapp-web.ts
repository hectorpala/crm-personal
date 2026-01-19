import pkg from 'whatsapp-web.js'
const { Client, LocalAuth } = pkg
import QRCode from 'qrcode'
import { db } from '../db'
import { conversations, contacts, opportunities } from '../db/schema'
import { eq, or, like } from 'drizzle-orm'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { platform } from 'os'

// Get Chrome/Chromium path based on OS
function getChromePath(): string {
  if (platform() === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  }
  // Linux - try common paths
  return '/usr/bin/chromium-browser'
}

// Uploads directory for media files
const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads'
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true })
}

// WhatsApp Web client state
let client: typeof Client.prototype | null = null
let qrCodeData: string | null = null
let isReady = false
let clientInfo: any = null

// Normalize Mexican phone numbers (remove the extra 1 after 52)
function normalizeMexicanPhone(phone: string): string[] {
  const variants: string[] = []
  const clean = phone.replace(/[^0-9]/g, '')

  // Original format with +
  variants.push('+' + clean)
  variants.push(clean)

  // If starts with 521, also try 52 (Mexican mobile format)
  if (clean.startsWith('521') && clean.length === 13) {
    const without1 = '52' + clean.substring(3)
    variants.push('+' + without1)
    variants.push(without1)
  }

  // If starts with 52 (without 1), also try 521
  if (clean.startsWith('52') && !clean.startsWith('521') && clean.length === 12) {
    const with1 = '521' + clean.substring(2)
    variants.push('+' + with1)
    variants.push(with1)
  }

  return variants
}

// Save media file and return the path
async function saveMediaFile(media: any, messageId: string): Promise<{ mediaType: string; mediaUrl: string } | null> {
  try {
    if (!media || !media.data) return null

    // Determine file extension based on mimetype
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'audio/ogg; codecs=opus': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'video/mp4': 'mp4',
      'application/pdf': 'pdf',
    }

    const ext = mimeToExt[media.mimetype] || media.mimetype.split('/')[1] || 'bin'
    const timestamp = Date.now()
    const filename = timestamp + '_' + messageId.replace(/[^a-zA-Z0-9]/g, '_') + '.' + ext
    const filepath = join(UPLOADS_DIR, filename)

    // Save the file
    writeFileSync(filepath, Buffer.from(media.data, 'base64'))

    // Determine media type category
    let mediaType = 'document'
    if (media.mimetype.startsWith('image/')) mediaType = 'image'
    else if (media.mimetype.startsWith('audio/')) mediaType = 'audio'
    else if (media.mimetype.startsWith('video/')) mediaType = 'video'

    console.log('Saved media file:', filename, 'type:', mediaType)
    return { mediaType, mediaUrl: '/api/media/' + filename }
  } catch (error) {
    console.error('Error saving media file:', error)
    return null
  }
}

// Initialize WhatsApp client
export function initWhatsAppClient() {
  if (client) {
    console.log('WhatsApp client already initialized')
    return
  }

  console.log('Initializing WhatsApp Web client...')

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
      headless: true,
      executablePath: getChromePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    }
  })

  client.on('qr', async (qr: string) => {
    console.log('QR Code received')
    qrCodeData = await QRCode.toDataURL(qr)
    isReady = false
  })

  client.on('ready', () => {
    console.log('WhatsApp client is ready!')
    isReady = true
    qrCodeData = null
    clientInfo = client?.info
  })

  client.on('authenticated', () => {
    console.log('WhatsApp client authenticated')
  })

  client.on('auth_failure', (msg: string) => {
    console.error('WhatsApp auth failure:', msg)
    isReady = false
  })

  client.on('disconnected', (reason: string) => {
    console.log('WhatsApp client disconnected:', reason)
    isReady = false
    client = null
  })

  // Handle INCOMING messages only (outgoing handled by message_create)
  client.on('message', async (message: any) => {
    try {
      // Skip outgoing messages - they are handled by message_create event
      if (message.fromMe) {
        return
      }

      // Debug: log incoming message events
      console.log('message event (incoming):', {
        from: message.from,
        hasMedia: message.hasMedia,
        body: message.body?.substring(0, 50)
      })

      // Skip status broadcasts
      if (message.from === 'status@broadcast') {
        console.log('Skipping status broadcast')
        return
      }

      // Get the contact info to extract the real phone number
      const waContact = await message.getContact()
      let phone = waContact?.number || ''

      // Get phone from message.from for incoming messages
      if (!phone) {
        phone = message.from.replace(/@c\.us$/, '').replace(/@lid$/, '')
      }

      // Skip if no valid phone number or group messages
      if (!phone || phone.includes('@g.us')) {
        console.log('Skipping group or invalid message')
        return
      }

      // Handle media if present
      let mediaData: { mediaType: string; mediaUrl: string } | null = null
      if (message.hasMedia) {
        try {
          const media = await message.downloadMedia()
          if (media) {
            mediaData = await saveMediaFile(media, message.id._serialized || String(Date.now()))
          }
        } catch (mediaError) {
          console.error('Error downloading media:', mediaError)
        }
      }

      // Get content - use caption for media or body for text
      const content = message.body || (mediaData ? '[' + mediaData.mediaType + ']' : '[mensaje sin contenido]')

      // Get all possible phone formats to search
      const phoneVariants = normalizeMexicanPhone(phone)
      console.log('Searching for phone variants:', phoneVariants, 'direction: entrante')

      // Find contact by any phone variant
      let contact = null
      for (const variant of phoneVariants) {
        contact = await db.select()
          .from(contacts)
          .where(eq(contacts.phone, variant))
          .get()
        if (contact) break
      }

      if (contact) {
        // Log incoming message with media info
        await db.insert(conversations).values({
          contactId: contact.id,
          type: 'whatsapp',
          content: content,
          direction: 'entrante',
          channel: 'whatsapp',
          mediaType: mediaData?.mediaType || null,
          mediaUrl: mediaData?.mediaUrl || null,
          createdAt: new Date().toISOString(),
        })

        // Update lastContactDate
        await db.update(contacts)
          .set({ lastContactDate: new Date().toISOString() })
          .where(eq(contacts.id, contact.id))

        console.log('Incoming message saved for contact:', contact.name, 'media:', mediaData?.mediaType || 'none')
      } else {
        // Auto-create new contact from unknown incoming number
        const waName = waContact?.name || waContact?.pushname || null
        const formattedPhone = phoneVariants[0] // Use first variant (with +)
        const contactName = waName || "Nuevo - " + phone

        const newContact = await db.insert(contacts).values({
          name: contactName,
          email: phone + "@whatsapp",
          phone: formattedPhone,
          category: "prospecto",
          leadSource: "otro",
          tags: JSON.stringify(["WhatsApp", "Auto-creado"]),
          score: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).returning()

        if (newContact[0]) {
          // Save the message to the new contact with media
          await db.insert(conversations).values({
            contactId: newContact[0].id,
            type: "whatsapp",
            content: content,
            direction: "entrante",
            channel: "whatsapp",
            mediaType: mediaData?.mediaType || null,
            mediaUrl: mediaData?.mediaUrl || null,
            createdAt: new Date().toISOString(),
          })

          // Update lastContactDate
          await db.update(contacts)
            .set({ lastContactDate: new Date().toISOString() })
            .where(eq(contacts.id, newContact[0].id))

          // Create opportunity in pipeline for new WhatsApp contact
          await db.insert(opportunities).values({
            contactId: newContact[0].id,
            title: "WhatsApp - " + contactName,
            value: 0,
            probability: 50,
            stage: "Lead",
            notes: "Oportunidad creada automaticamente desde WhatsApp",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })

          console.log("New contact and opportunity created from WhatsApp:", contactName, formattedPhone)
        }
      }
    } catch (error) {
      console.error('Error processing incoming message:', error)
    }
  })


  // Handle outgoing messages sent from phone (message_create captures ALL messages)
  client.on('message_create', async (message: any) => {
    try {
      // Only process messages sent by us (outgoing)
      if (!message.fromMe) return

      // Skip status broadcasts
      if (message.to === 'status@broadcast') return

      console.log('message_create (outgoing):', { to: message.to, hasMedia: message.hasMedia, body: message.body?.substring(0, 50) })

      // Get the recipient phone number
      const phone = message.to.replace(/@c\.us$/, '').replace(/@lid$/, '')

      // Skip group messages
      if (!phone || phone.includes('@g.us')) return

      // Handle media if present
      let mediaData: { mediaType: string; mediaUrl: string } | null = null
      if (message.hasMedia) {
        try {
          const media = await message.downloadMedia()
          if (media) {
            mediaData = await saveMediaFile(media, message.id._serialized || String(Date.now()))
          }
        } catch (mediaError) {
          console.error('Error downloading media:', mediaError)
        }
      }

      // Get content
      const content = message.body || (mediaData ? '[' + mediaData.mediaType + ']' : '[mensaje sin contenido]')

      // Get all possible phone formats
      const phoneVariants = normalizeMexicanPhone(phone)
      console.log('Searching outgoing phone variants:', phoneVariants)

      // Find contact by phone
      let contact = null
      for (const variant of phoneVariants) {
        contact = await db.select()
          .from(contacts)
          .where(eq(contacts.phone, variant))
          .get()
        if (contact) break
      }

      if (contact) {
        // Log outgoing message with media
        await db.insert(conversations).values({
          contactId: contact.id,
          type: 'whatsapp',
          content: content,
          direction: 'saliente',
          channel: 'whatsapp',
          mediaType: mediaData?.mediaType || null,
          mediaUrl: mediaData?.mediaUrl || null,
          createdAt: new Date().toISOString(),
        })

        // Update lastContactDate
        await db.update(contacts)
          .set({ lastContactDate: new Date().toISOString() })
          .where(eq(contacts.id, contact.id))

        console.log('Outgoing message saved for contact:', contact.name, 'media:', mediaData?.mediaType || 'none')
      } else {
        console.log('No contact found for outgoing message to:', phone, 'variants:', phoneVariants)
      }
    } catch (error) {
      console.error('Error processing outgoing message:', error)
    }
  })

  client.initialize()
}

// Get current status
export function getWhatsAppStatus() {
  return {
    initialized: !!client,
    ready: isReady,
    qrCode: qrCodeData,
    info: clientInfo ? {
      phoneNumber: clientInfo.wid?.user,
      name: clientInfo.pushname
    } : null
  }
}

// Send message
export async function sendWhatsAppMessage(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!client || !isReady) {
    return { success: false, error: 'WhatsApp not connected' }
  }

  try {
    // Format phone number for WhatsApp
    let formattedPhone = phone.replace(/[^0-9]/g, '')
    if (formattedPhone.length === 10) {
      formattedPhone = '52' + formattedPhone
    }

    // Verify number is registered on WhatsApp
    const numberId = await client.getNumberId(formattedPhone)
    if (!numberId) {
      return { success: false, error: 'Numero no registrado en WhatsApp' }
    }

    // Use the verified number ID to send
    await client.sendMessage(numberId._serialized, message, { sendSeen: false })

    return { success: true }
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error)
    return { success: false, error: error.message }
  }
}

// Disconnect client
export async function disconnectWhatsApp() {
  if (client) {
    await client.logout()
    client = null
    isReady = false
    qrCodeData = null
    clientInfo = null
  }
}

// Check if running locally (not in production)
export function isWhatsAppEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_WHATSAPP === 'true'
}

// Get all WhatsApp chats
export async function getAllWhatsAppChats(): Promise<any[]> {
  if (!client || !isReady) {
    return []
  }

  try {
    const chats = await client.getChats()
    // Filter out groups and status broadcasts, return individual chats
    const individualChats = chats
      .filter((chat: any) => !chat.isGroup && chat.id._serialized !== 'status@broadcast')
      .map((chat: any) => ({
        id: chat.id._serialized,
        phone: chat.id.user,
        name: chat.name || chat.id.user,
        lastMessage: chat.lastMessage?.body || '',
        lastMessageTime: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000).toISOString() : null,
        unreadCount: chat.unreadCount || 0,
      }))
      .slice(0, 100) // Limit to 100 chats

    return individualChats
  } catch (error) {
    console.error('Error getting WhatsApp chats:', error)
    return []
  }
}
