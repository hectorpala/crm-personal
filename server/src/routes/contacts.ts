import { Hono } from 'hono'
import { db } from '../db'
import { contacts } from '../db/schema'
import { eq } from 'drizzle-orm'

export const contactsRoutes = new Hono()

// Get all contacts
contactsRoutes.get('/', async (c) => {
  const allContacts = await db.select().from(contacts).all()
  const parsed = allContacts.map(contact => ({
    ...contact,
    tags: JSON.parse(contact.tags || '[]')
  }))
  return c.json(parsed)
})

// Get single contact
contactsRoutes.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const contact = await db.select().from(contacts).where(eq(contacts.id, id)).get()
  if (!contact) {
    return c.json({ error: 'Contact not found' }, 404)
  }
  return c.json({
    ...contact,
    tags: JSON.parse(contact.tags || '[]')
  })
})

// Create contact
contactsRoutes.post('/', async (c) => {
  const body = await c.req.json()
  const result = await db.insert(contacts).values({
    name: body.name,
    email: body.email,
    phone: body.phone,
    company: body.company,
    address: body.address,
    category: body.category || 'prospecto',
    tags: JSON.stringify(body.tags || []),
    avatarUrl: body.avatarUrl,
    googleSheetRowId: body.googleSheetRowId,
  }).returning()
  return c.json(result[0], 201)
})

// Update contact
contactsRoutes.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()
  const result = await db.update(contacts)
    .set({
      name: body.name,
      email: body.email,
      phone: body.phone,
      company: body.company,
      address: body.address,
      category: body.category,
      tags: JSON.stringify(body.tags || []),
      avatarUrl: body.avatarUrl,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(contacts.id, id))
    .returning()
  if (result.length === 0) {
    return c.json({ error: 'Contact not found' }, 404)
  }
  return c.json(result[0])
})

// Delete contact
contactsRoutes.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  await db.delete(contacts).where(eq(contacts.id, id))
  return c.json({ success: true })
})

// Update contact score
contactsRoutes.patch('/:id/score', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()
  const result = await db.update(contacts)
    .set({ score: body.score })
    .where(eq(contacts.id, id))
    .returning()
  return c.json(result[0])
})
