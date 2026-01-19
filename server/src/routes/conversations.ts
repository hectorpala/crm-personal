import { Hono } from 'hono'
import { db } from '../db'
import { conversations, contacts } from '../db/schema'
import { eq, asc } from 'drizzle-orm'

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

// Delete conversation
conversationsRoutes.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  await db.delete(conversations).where(eq(conversations.id, id))
  return c.json({ success: true })
})
