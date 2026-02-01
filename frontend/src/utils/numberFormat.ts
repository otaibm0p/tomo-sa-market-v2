/**
 * Format numbers in English (Western) digits regardless of locale
 * This ensures all numbers display consistently across the site
 */

/**
 * Format a number to string with English digits
 * @param value - The number to format
 * @param options - Formatting options (decimals, etc.)
 * @returns Formatted string with English digits
 */
export function formatNumber(value: number | string | null | undefined, options?: {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  useGrouping?: boolean
}): string {
  if (value === null || value === undefined || value === '') {
    return '0'
  }

  const num = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(num)) {
    return '0'
  }

  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    useGrouping = false
  } = options || {}

  // Use 'en-US' locale to ensure English digits
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping
  }).format(num)
}

/**
 * Parse a number from input, handling both English and Arabic digits
 * @param value - Input string (may contain Arabic or English digits)
 * @returns Parsed number or NaN
 */
export function parseNumber(value: string): number {
  if (!value || value.trim() === '') {
    return NaN
  }

  // Replace Arabic-Indic digits (٠-٩) with English digits (0-9)
  const arabicToEnglish = value
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48))
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))

  // Remove any non-numeric characters except decimal point and minus
  // Allow only one decimal point
  let cleaned = arabicToEnglish.replace(/[^\d.-]/g, '')
  
  // Ensure only one decimal point
  const parts = cleaned.split('.')
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('')
  }
  
  return parseFloat(cleaned)
}

/**
 * Clean input value for smooth decimal entry
 * Allows typing decimals naturally (e.g., "9.95")
 */
export function cleanDecimalInput(value: string): string {
  if (!value) return ''
  
  // Replace Arabic digits with English
  let cleaned = value
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48))
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
  
  // Remove everything except digits, one decimal point, and minus sign
  cleaned = cleaned.replace(/[^\d.-]/g, '')
  
  // Ensure only one decimal point
  const parts = cleaned.split('.')
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('')
  }
  
  // Remove minus if not at start
  if (cleaned.includes('-') && !cleaned.startsWith('-')) {
    cleaned = cleaned.replace(/-/g, '')
  }
  
  return cleaned
}

/**
 * Format number for display in admin panels (always English digits)
 */
export function formatAdminNumber(value: number | string | null | undefined, decimals: number = 2): string {
  return formatNumber(value, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: false
  })
}

