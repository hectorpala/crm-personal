/**
 * Utilidades de normalización de teléfonos mexicanos
 * Formato único: +52XXXXXXXXXX (12 dígitos después del +)
 */

/**
 * Normaliza un teléfono al formato canónico +52XXXXXXXXXX
 * Maneja variantes: 521, 52, solo 10 dígitos, con/sin +
 */
export function normalizePhoneToCanonical(phone: string | null | undefined): string | null {
  if (!phone || phone === '-') return null

  // Limpiar todo excepto números
  let cleaned = phone.replace(/[^0-9]/g, '')
  if (!cleaned || cleaned.length < 10) return null

  // Si tiene 10 dígitos, agregar código de país mexicano
  if (cleaned.length === 10) {
    return '+52' + cleaned
  }

  // Si empieza con 521 (formato móvil antiguo), convertir a 52
  if (cleaned.startsWith('521') && cleaned.length === 13) {
    return '+52' + cleaned.substring(3)
  }

  // Si empieza con 52 y tiene 12 dígitos, es el formato correcto
  if (cleaned.startsWith('52') && cleaned.length === 12) {
    return '+' + cleaned
  }

  // Si tiene 11+ dígitos y empieza con otro código de país, mantenerlo
  if (cleaned.length >= 11) {
    return '+' + cleaned
  }

  return null
}

/**
 * Genera todas las variantes de un teléfono para búsqueda en BD
 * Útil cuando no sabemos cómo está guardado el teléfono
 */
export function getPhoneVariants(phone: string): string[] {
  const variants: string[] = []
  const cleaned = phone.replace(/[^0-9]/g, '')

  if (!cleaned || cleaned.length < 10) return variants

  // Últimos 10 dígitos (número local)
  const last10 = cleaned.slice(-10)

  // Agregar variantes comunes
  variants.push('+52' + last10)           // Formato canónico
  variants.push('52' + last10)            // Sin +
  variants.push('+521' + last10)          // Formato móvil antiguo con +
  variants.push('521' + last10)           // Formato móvil antiguo sin +
  variants.push(last10)                   // Solo 10 dígitos

  // Si el original tiene otro formato, incluirlo también
  if (!variants.includes(cleaned)) {
    variants.push(cleaned)
  }
  if (!variants.includes('+' + cleaned)) {
    variants.push('+' + cleaned)
  }

  return [...new Set(variants)] // Eliminar duplicados
}

/**
 * Compara si dos teléfonos son equivalentes
 */
export function phonesMatch(phone1: string | null | undefined, phone2: string | null | undefined): boolean {
  if (!phone1 || !phone2) return false

  const norm1 = normalizePhoneToCanonical(phone1)
  const norm2 = normalizePhoneToCanonical(phone2)

  return norm1 !== null && norm1 === norm2
}
