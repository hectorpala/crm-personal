import { Hono } from 'hono'
import { db } from '../db'
import { conversations, contacts } from '../db/schema'
import { eq, asc, desc, and } from 'drizzle-orm'

export const conversationsRoutes = new Hono()

// Get conversations for a contact
conversationsRoutes.get('/contact/:contactId', async (c) => {
  const contactId = parseInt(c.req.param('contactId'))
  const convs = await db.select()
    .from(conversations)
    .where(eq(conversations.contactId, contactId))
    .orderBy(asc(conversations.createdAt))
    .all()
  return c.json(convs)
})

// Create conversation (note, call, etc)
conversationsRoutes.post('/', async (c) => {
  const body = await c.req.json()
  const result = await db.insert(conversations).values({
    contactId: body.contactId,
    type: body.type || 'nota',
    subject: body.subject,
    content: body.content,
    direction: body.direction || 'saliente',
    channel: body.channel || 'manual',
    createdAt: new Date().toISOString(),
  }).returning()
  
  // Update contact score (simple scoring: +5 per interaction)
  if (body.contactId) {
    const contact = await db.select().from(contacts).where(eq(contacts.id, body.contactId)).get()
    if (contact) {
      await db.update(contacts)
        .set({ score: (contact.score || 0) + 5 })
        .where(eq(contacts.id, body.contactId))
    }
  }
  
  return c.json(result[0], 201)
})


// Get recent contacts with conversations (unique contacts, ordered by last message)
conversationsRoutes.get('/recent', async (c) => {
  const limit = parseInt(c.req.query('limit') || '10')

  // Get all recent conversations ordered by date
  const allConversations = await db.select()
    .from(conversations)
    .orderBy(desc(conversations.createdAt))
    .all()

  // Group by contactId, keep only the most recent per contact
  const contactMap = new Map<number, typeof allConversations[0]>()
  for (const conv of allConversations) {
    if (conv.contactId && !contactMap.has(conv.contactId)) {
      contactMap.set(conv.contactId, conv)
    }
  }

  // Get the most recent unique contacts (up to limit)
  const recentConvs = Array.from(contactMap.values()).slice(0, limit)

  // Get contact info for each
  const result = await Promise.all(recentConvs.map(async (conv) => {
    const contact = await db.select().from(contacts).where(eq(contacts.id, conv.contactId!)).get()
    return { ...conv, contact }
  }))

  return c.json(result)
})

// Delete conversation
conversationsRoutes.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  await db.delete(conversations).where(eq(conversations.id, id))
  return c.json({ success: true })
})

// Delete all conversations for a contact
conversationsRoutes.delete('/contact/:contactId', async (c) => {
  const contactId = parseInt(c.req.param('contactId'))
  await db.delete(conversations).where(eq(conversations.contactId, contactId))
  return c.json({ success: true })
})
