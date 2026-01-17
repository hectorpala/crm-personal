import { Hono } from 'hono'

export const whatsappRoutes = new Hono()

// Clean phone number for WhatsApp
function cleanPhone(phone: string): string {
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^0-9+]/g, '')
  
  // If starts with +, keep it, otherwise assume Mexican number
  if (!cleaned.startsWith('+')) {
    // Add Mexico country code if not present
    if (!cleaned.startsWith('52')) {
      cleaned = '521' + cleaned
    }
  } else {
    cleaned = cleaned.substring(1) // Remove + for wa.me URL
  }
  
  return cleaned
}

// Generate WhatsApp Web URL
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

// Generate bulk WhatsApp links for mass messaging
whatsappRoutes.post('/generate-bulk-links', async (c) => {
  const body = await c.req.json()
  const { recipients, message } = body

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return c.json({ error: 'Recipients array required' }, 400)
  }

  const links = recipients.map((recipient: { phone: string; name?: string }) => {
    const cleanedPhone = cleanPhone(recipient.phone)
    // Personalize message with {{name}} placeholder
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
