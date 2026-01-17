import { Hono } from 'hono'
import { db } from '../db'
import { tasks, contacts } from '../db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'

export const tasksRoutes = new Hono()

// Get all tasks with optional filters
tasksRoutes.get('/', async (c) => {
  const contactId = c.req.query('contactId')
  const completed = c.req.query('completed')
  
  let query = db.select().from(tasks)
  const allTasks = await query.all()
  
  const result = await Promise.all(allTasks.map(async (task) => {
    const contact = task.contactId
      ? await db.select().from(contacts).where(eq(contacts.id, task.contactId)).get()
      : null
    return { ...task, contact }
  }))
  
  return c.json(result)
})

// Create task
tasksRoutes.post('/', async (c) => {
  const body = await c.req.json()
  const result = await db.insert(tasks).values({
    contactId: body.contactId,
    opportunityId: body.opportunityId,
    title: body.title,
    description: body.description,
    dueDate: body.dueDate,
    priority: body.priority || 'media',
    completed: false,
  }).returning()
  return c.json(result[0], 201)
})

// Update task
tasksRoutes.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()
  const result = await db.update(tasks)
    .set({
      title: body.title,
      description: body.description,
      dueDate: body.dueDate,
      priority: body.priority,
      completed: body.completed,
    })
    .where(eq(tasks.id, id))
    .returning()
  return c.json(result[0])
})

// Toggle task completion
tasksRoutes.patch('/:id/toggle', async (c) => {
  const id = parseInt(c.req.param('id'))
  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get()
  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }
  const result = await db.update(tasks)
    .set({ completed: !task.completed })
    .where(eq(tasks.id, id))
    .returning()
  return c.json(result[0])
})

// Delete task
tasksRoutes.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  await db.delete(tasks).where(eq(tasks.id, id))
  return c.json({ success: true })
})
