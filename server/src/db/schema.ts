import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const contacts = sqliteTable('contacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  googleSheetRowId: text('google_sheet_row_id'),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  company: text('company'),
  address: text('address'),
  category: text('category', { enum: ['cliente', 'prospecto', 'proveedor', 'personal'] }).default('prospecto'),
  tags: text('tags').default('[]'),
  avatarUrl: text('avatar_url'),
  score: integer('score').default(0),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
})

export const pipelineStages = sqliteTable('pipeline_stages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  order: integer('order').notNull(),
  color: text('color').default('#94a3b8'),
})

export const opportunities = sqliteTable('opportunities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contactId: integer('contact_id').references(() => contacts.id),
  title: text('title').notNull(),
  value: real('value').default(0),
  probability: integer('probability').default(50),
  stage: text('stage').default('Lead'),
  expectedCloseDate: text('expected_close_date'),
  notes: text('notes'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
})

export const conversations = sqliteTable('conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contactId: integer('contact_id').references(() => contacts.id),
  type: text('type', { enum: ['nota', 'llamada', 'email', 'reunion', 'whatsapp'] }).default('nota'),
  subject: text('subject'),
  content: text('content').notNull(),
  direction: text('direction', { enum: ['entrante', 'saliente'] }).default('saliente'),
  channel: text('channel', { enum: ['manual', 'email', 'whatsapp', 'telefono'] }).default('manual'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contactId: integer('contact_id').references(() => contacts.id),
  opportunityId: integer('opportunity_id').references(() => opportunities.id),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: text('due_date').notNull(),
  completed: integer('completed', { mode: 'boolean' }).default(false),
  priority: text('priority', { enum: ['baja', 'media', 'alta'] }).default('media'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const messageTemplates = sqliteTable('message_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  subject: text('subject'),
  content: text('content').notNull(),
  channel: text('channel', { enum: ['email', 'whatsapp'] }).notNull(),
  variables: text('variables').default('[]'),
})

export const campaigns = sqliteTable('campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  templateId: integer('template_id').references(() => messageTemplates.id),
  channel: text('channel', { enum: ['email', 'whatsapp'] }).notNull(),
  status: text('status', { enum: ['borrador', 'programada', 'enviando', 'completada', 'fallida'] }).default('borrador'),
  scheduledAt: text('scheduled_at'),
  sentCount: integer('sent_count').default(0),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value'),
})
