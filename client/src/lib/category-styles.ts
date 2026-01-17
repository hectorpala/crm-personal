// Centralized category styles for consistent appearance across the app

export type ContactCategory = 'cliente' | 'prospecto' | 'proveedor' | 'personal'

// Badge/pill styles using Tailwind classes
export const categoryColors: Record<string, string> = {
  cliente: 'bg-green-100 text-green-800',
  prospecto: 'bg-blue-100 text-blue-800',
  proveedor: 'bg-purple-100 text-purple-800',
  personal: 'bg-gray-100 text-gray-800',
}

// Get category color classes, with fallback
export function getCategoryColor(category: string): string {
  return categoryColors[category.toLowerCase()] || categoryColors.prospecto
}

// Category labels in Spanish
export const categoryLabels: Record<string, string> = {
  cliente: 'Cliente',
  prospecto: 'Prospecto',
  proveedor: 'Proveedor',
  personal: 'Personal',
}

// Get category label with fallback
export function getCategoryLabel(category: string): string {
  return categoryLabels[category.toLowerCase()] || category
}
