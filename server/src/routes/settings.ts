import { Hono } from 'hono'
import { db } from '../db'
import { settings } from '../db/schema'
import { eq } from 'drizzle-orm'

export const settingsRoutes = new Hono()

// Get all settings
settingsRoutes.get('/', async (c) => {
  const allSettings = await db.select().from(settings).all()
  const settingsObj: Record<string, string> = {}
  allSettings.forEach(s => {
    settingsObj[s.key] = s.value || ''
  })
  return c.json(settingsObj)
})

// Get single setting
settingsRoutes.get('/:key', async (c) => {
  const key = c.req.param('key')
  const setting = await db.select().from(settings).where(eq(settings.key, key)).get()
  return c.json({ value: setting?.value || null })
})

// Set setting
settingsRoutes.put('/:key', async (c) => {
  const key = c.req.param('key')
  const body = await c.req.json()
  
  const existing = await db.select().from(settings).where(eq(settings.key, key)).get()
  
  if (existing) {
    await db.update(settings)
      .set({ value: body.value })
      .where(eq(settings.key, key))
  } else {
    await db.insert(settings).values({ key, value: body.value })
  }
  
  return c.json({ success: true })
})

// Delete setting
settingsRoutes.delete('/:key', async (c) => {
  const key = c.req.param('key')
  await db.delete(settings).where(eq(settings.key, key))
  return c.json({ success: true })
})
