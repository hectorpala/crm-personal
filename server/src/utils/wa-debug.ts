import { existsSync, mkdirSync, appendFileSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const LOGS_DIR = './logs'
const LOG_FILE = join(LOGS_DIR, 'whatsapp-debug.log')

// Only log if env var is set
const isDebugEnabled = () => process.env.WHATSAPP_DEBUG_LOG === 'true'

// Ensure logs directory exists
function ensureLogsDir() {
  if (!existsSync(LOGS_DIR)) {
    mkdirSync(LOGS_DIR, { recursive: true })
  }
}

interface WaLogEntry {
  event: string
  messageId?: string
  fromMe?: boolean
  to?: string
  from?: string
  hasMedia?: boolean
  hasBody?: boolean
  skipReason?: string
  contactFound?: boolean
  contactCreated?: boolean
  contactName?: string
  phone?: string | null
  error?: string
  extra?: Record<string, any>
}

export function logWaDebug(entry: WaLogEntry) {
  if (!isDebugEnabled()) return

  try {
    ensureLogsDir()
    const timestamp = new Date().toISOString()
    const logLine = JSON.stringify({ timestamp, ...entry }) + '\n'
    appendFileSync(LOG_FILE, logLine)
  } catch (e) {
    // Silently ignore write errors
  }
}

export function readWaDebugLogs(lines: number = 200): string[] {
  try {
    if (!existsSync(LOG_FILE)) {
      return []
    }
    const content = readFileSync(LOG_FILE, 'utf-8')
    const allLines = content.trim().split('\n').filter(l => l)
    return allLines.slice(-lines)
  } catch (e) {
    return []
  }
}

export function clearWaDebugLogs(): boolean {
  try {
    ensureLogsDir()
    writeFileSync(LOG_FILE, '')
    return true
  } catch (e) {
    return false
  }
}
