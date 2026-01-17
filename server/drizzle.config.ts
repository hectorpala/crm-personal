import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'better-sqlite',
  dbCredentials: {
    url: './crm.db',
  },
} satisfies Config
