import pkg from 'whatsapp-web.js'
const { Client, LocalAuth } = pkg
import QRCode from 'qrcode'
import { db } from '../db'
import { conversations, contacts } from '../db/schema'
import { eq, or, like } from 'drizzle-orm'
import { platform } from 'os'

// Get Chrome/Chromium path based on OS
function getChromePath(): string {
  if (platform() === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  }
  // Linux - try common paths
  return '/usr/bin/chromium-browser'
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

  // Handle incoming messages
  client.on('message', async (message: any) => {
    try {
      console.log('Incoming message from:', message.from, message.body)

      // Get the contact info to extract the real phone number
      const waContact = await message.getContact()
      let phone = waContact?.number || ''

      // If no number from contact, try to extract from message.from
      if (!phone) {
        phone = message.from.replace(/@c\.us$/, '').replace(/@lid$/, '')
      }

      // Skip if no valid phone number (e.g., group messages)
      if (!phone || phone.includes('@g.us')) {
        console.log('Skipping non-contact message')
        return
      }

      // Get all possible phone formats to search
      const phoneVariants = normalizeMexicanPhone(phone)
      console.log('Searching for phone variants:', phoneVariants)

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
        // Log incoming message
        await db.insert(conversations).values({
          contactId: contact.id,
          type: 'whatsapp',
          content: message.body,
          direction: 'entrante',
          channel: 'whatsapp',
          createdAt: new Date().toISOString(),
        })

        // Update lastContactDate
        await db.update(contacts)
          .set({ lastContactDate: new Date().toISOString() })
          .where(eq(contacts.id, contact.id))

        console.log('Message saved for contact:', contact.name)
      } else {
        console.log('Contact not found for phone variants:', phoneVariants)
      }
    } catch (error) {
      console.error('Error processing incoming message:', error)
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
