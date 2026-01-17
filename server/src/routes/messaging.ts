import { Hono } from 'hono'
import { db } from '../db'
import { messageTemplates, campaigns, contacts } from '../db/schema'
import { eq } from 'drizzle-orm'

export const messagingRoutes = new Hono()

// Templates
messagingRoutes.get('/templates', async (c) => {
  const templates = await db.select().from(messageTemplates).all()
  return c.json(templates.map(t => ({
    ...t,
    variables: JSON.parse(t.variables || '[]')
  })))
})

messagingRoutes.post('/templates', async (c) => {
  const body = await c.req.json()
  const result = await db.insert(messageTemplates).values({
    name: body.name,
    subject: body.subject,
    content: body.content,
    channel: body.channel,
    variables: JSON.stringify(body.variables || []),
  }).returning()
  return c.json(result[0], 201)
})

messagingRoutes.delete('/templates/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  await db.delete(messageTemplates).where(eq(messageTemplates.id, id))
  return c.json({ success: true })
})

// Campaigns
messagingRoutes.get('/campaigns', async (c) => {
  const allCampaigns = await db.select().from(campaigns).all()
  const result = await Promise.all(allCampaigns.map(async (campaign) => {
    const template = campaign.templateId
      ? await db.select().from(messageTemplates).where(eq(messageTemplates.id, campaign.templateId)).get()
      : null
    return { ...campaign, template }
  }))
  return c.json(result)
})

messagingRoutes.post('/campaigns', async (c) => {
  const body = await c.req.json()
  const result = await db.insert(campaigns).values({
    name: body.name,
    templateId: body.templateId,
    channel: body.channel,
    status: 'borrador',
    scheduledAt: body.scheduledAt,
  }).returning()
  return c.json(result[0], 201)
})

// Send campaign (simplified - in real app would be async job)
messagingRoutes.post('/campaigns/:id/send', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()
  const contactIds = body.contactIds as number[]
  
  // Get campaign and template
  const campaign = await db.select().from(campaigns).where(eq(campaigns.id, id)).get()
  if (!campaign) {
    return c.json({ error: 'Campaign not found' }, 404)
  }
  
  const template = campaign.templateId
    ? await db.select().from(messageTemplates).where(eq(messageTemplates.id, campaign.templateId)).get()
    : null
    
  if (!template) {
    return c.json({ error: 'Template not found' }, 404)
  }
  
  // Update status to sending
  await db.update(campaigns)
    .set({ status: 'enviando' })
    .where(eq(campaigns.id, id))
  
  // TODO: Implement actual email/whatsapp sending
  // For now, just simulate
  let sentCount = 0
  for (const contactId of contactIds) {
    // Simulate sending
    sentCount++
  }
  
  // Update to completed
  await db.update(campaigns)
    .set({ status: 'completada', sentCount })
    .where(eq(campaigns.id, id))
  
  return c.json({ success: true, sentCount })
})
