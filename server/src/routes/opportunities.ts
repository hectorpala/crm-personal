import { Hono } from 'hono'
import { db } from '../db'
import { opportunities, contacts, pipelineStages } from '../db/schema'
import { eq } from 'drizzle-orm'

export const opportunitiesRoutes = new Hono()

// Get all opportunities with contact info
opportunitiesRoutes.get('/', async (c) => {
  try {
    const allOpps = await db.select().from(opportunities).all()
    const result = await Promise.all(allOpps.map(async (opp) => {
      const contact = opp.contactId 
        ? await db.select().from(contacts).where(eq(contacts.id, opp.contactId)).get()
        : null
      return { ...opp, contact }
    }))
    return c.json(result)
  } catch (error: any) {
    console.error('Error fetching opportunities:', error)
    return c.json({ error: error.message, stack: error.stack }, 500)
  }
})

// Get pipeline stages
opportunitiesRoutes.get('/stages', async (c) => {
  const stages = await db.select().from(pipelineStages).orderBy(pipelineStages.order).all()
  return c.json(stages)
})

// Create opportunity
opportunitiesRoutes.post('/', async (c) => {
  const body = await c.req.json()
  const result = await db.insert(opportunities).values({
    contactId: body.contactId,
    title: body.title,
    value: body.value || 0,
    probability: body.probability || 50,
    stage: body.stage || 'Lead',
    expectedCloseDate: body.expectedCloseDate,
    notes: body.notes,
  }).returning()
  return c.json(result[0], 201)
})

// Update opportunity (partial update)
opportunitiesRoutes.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()
  
  // Build update object with only provided fields
  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  }
  
  if (body.title !== undefined) updateData.title = body.title
  if (body.value !== undefined) updateData.value = body.value
  if (body.probability !== undefined) updateData.probability = body.probability
  if (body.stage !== undefined) updateData.stage = body.stage
  if (body.expectedCloseDate !== undefined) updateData.expectedCloseDate = body.expectedCloseDate
  if (body.notes !== undefined) updateData.notes = body.notes
  if (body.contactId !== undefined) updateData.contactId = body.contactId
  
  const result = await db.update(opportunities)
    .set(updateData)
    .where(eq(opportunities.id, id))
    .returning()
  return c.json(result[0])
})

// Update opportunity stage (for drag & drop)
opportunitiesRoutes.patch('/:id/stage', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()
  const result = await db.update(opportunities)
    .set({ stage: body.stage, updatedAt: new Date().toISOString() })
    .where(eq(opportunities.id, id))
    .returning()
  return c.json(result[0])
})

// Delete opportunity
opportunitiesRoutes.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  await db.delete(opportunities).where(eq(opportunities.id, id))
  return c.json({ success: true })
})

// Update pipeline stages
opportunitiesRoutes.put('/stages', async (c) => {
  const body = await c.req.json()
  // Delete all and reinsert
  await db.delete(pipelineStages)
  for (const stage of body) {
    await db.insert(pipelineStages).values(stage)
  }
  const stages = await db.select().from(pipelineStages).orderBy(pipelineStages.order).all()
  return c.json(stages)
})
