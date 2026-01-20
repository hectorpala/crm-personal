import { Hono } from 'hono'
import { db } from '../db'
import { contacts, conversations, opportunities, tasks } from '../db/schema'
import { eq } from 'drizzle-orm'
import { normalizePhoneToCanonical } from '../utils/phone'

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

// Get single contact (also updates lastContactDate)
contactsRoutes.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const contact = await db.select().from(contacts).where(eq(contacts.id, id)).get()
  if (!contact) {
    return c.json({ error: 'Contact not found' }, 404)
  }
  // Update lastContactDate when viewing a contact
  await db.update(contacts)
    .set({ lastContactDate: new Date().toISOString() })
    .where(eq(contacts.id, id))
  return c.json({
    ...contact,
    lastContactDate: new Date().toISOString(),
    tags: JSON.parse(contact.tags || '[]')
  })
})

// Create contact
contactsRoutes.post('/', async (c) => {
  const body = await c.req.json()
  const result = await db.insert(contacts).values({
    name: body.name,
    email: body.email,
    phone: normalizePhoneToCanonical(body.phone),
    company: body.company,
    address: body.address,
    category: body.category || 'prospecto',
    tags: JSON.stringify(body.tags || []),
    avatarUrl: body.avatarUrl,
    googleSheetRowId: body.googleSheetRowId,
    leadSource: body.leadSource,
    score: body.score || 0,
    notes: body.notes,
  }).returning()
  return c.json(result[0], 201)
})

// Update contact
contactsRoutes.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()
  
  // Build update object, only including fields that are provided
  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  }
  
  if (body.name !== undefined) updateData.name = body.name
  if (body.email !== undefined) updateData.email = body.email
  if (body.phone !== undefined) updateData.phone = normalizePhoneToCanonical(body.phone)
  if (body.company !== undefined) updateData.company = body.company
  if (body.address !== undefined) updateData.address = body.address
  if (body.category !== undefined) updateData.category = body.category
  if (body.tags !== undefined) updateData.tags = JSON.stringify(body.tags || [])
  if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl
  if (body.leadSource !== undefined) updateData.leadSource = body.leadSource
  if (body.score !== undefined) updateData.score = body.score
  if (body.notes !== undefined) updateData.notes = body.notes
  
  const result = await db.update(contacts)
    .set(updateData)
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

// Consolidate duplicate contacts with equivalent phone numbers
contactsRoutes.post('/consolidate-duplicates', async (c) => {
  try {
    // Get all contacts
    const allContacts = await db.select().from(contacts).all()
    
    // Group contacts by normalized phone
    const phoneGroups = new Map<string, typeof allContacts>()
    
    for (const contact of allContacts) {
      if (!contact.phone) continue
      const normalized = normalizePhoneToCanonical(contact.phone)
      if (!normalized) continue
      
      if (!phoneGroups.has(normalized)) {
        phoneGroups.set(normalized, [])
      }
      phoneGroups.get(normalized)!.push(contact)
    }
    
    let consolidated = 0
    const consolidatedIds: number[] = []
    
    // For each group with duplicates, merge into the oldest contact
    for (const [phone, group] of phoneGroups) {
      if (group.length <= 1) continue
      
      // Sort by createdAt to keep the oldest as primary
      group.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
      
      const primary = group[0]
      const duplicates = group.slice(1)
      
      for (const duplicate of duplicates) {
        // Move all conversations from duplicate to primary
        await db.update(conversations)
          .set({ contactId: primary.id })
          .where(eq(conversations.contactId, duplicate.id))
        
        // Move all opportunities from duplicate to primary
        await db.update(opportunities)
          .set({ contactId: primary.id })
          .where(eq(opportunities.contactId, duplicate.id))
        
        // Move all tasks from duplicate to primary
        await db.update(tasks)
          .set({ contactId: primary.id })
          .where(eq(tasks.contactId, duplicate.id))
        
        // Delete the duplicate contact
        await db.delete(contacts).where(eq(contacts.id, duplicate.id))
        
        consolidatedIds.push(duplicate.id)
        consolidated++
      }
      
      // Update primary contact phone to canonical format
      await db.update(contacts)
        .set({ phone: phone })
        .where(eq(contacts.id, primary.id))
    }
    
    return c.json({ 
      success: true, 
      consolidated,
      consolidatedIds,
      message: consolidated > 0 
        ? `Se consolidaron ${consolidated} contactos duplicados` 
        : 'No se encontraron duplicados'
    })
  } catch (error: any) {
    console.error('Error consolidating duplicates:', error)
    return c.json({ error: error.message || 'Error al consolidar' }, 500)
  }
})

// Normalize all existing contact phones to canonical format
contactsRoutes.post('/normalize-phones', async (c) => {
  try {
    const allContacts = await db.select().from(contacts).all()
    let normalized = 0
    
    for (const contact of allContacts) {
      if (!contact.phone) continue
      const canonicalPhone = normalizePhoneToCanonical(contact.phone)
      
      if (canonicalPhone && canonicalPhone !== contact.phone) {
        await db.update(contacts)
          .set({ phone: canonicalPhone })
          .where(eq(contacts.id, contact.id))
        normalized++
      }
    }
    
    return c.json({ 
      success: true, 
      normalized,
      message: `Se normalizaron ${normalized} teléfonos`
    })
  } catch (error: any) {
    console.error('Error normalizing phones:', error)
    return c.json({ error: error.message || 'Error al normalizar' }, 500)
  }
})
