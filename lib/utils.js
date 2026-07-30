import { getToken } from './config.js'

export function handleError(fn) {
  return async (argv) => {
    try {
      await fn(argv)
    } catch (err) {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    }
  }
}

export async function requireAuth() {
  const token = await getToken()
  if (!token) throw new Error('Not authenticated. Run: sola auth signin')
  return token
}

// Query params (GET) and JSON bodies (POST/PATCH) both use this shape: soon
// (Rails) parses repeated `key[]=` as an array, so arrays are expanded that
// way for query strings; JSON bodies pass arrays through natively.
export function buildQueryString(params) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) {
      value.forEach((item) => qs.append(`${key}[]`, String(item)))
    } else {
      qs.set(key, String(value))
    }
  })
  return qs.size > 0 ? '?' + qs.toString() : ''
}

export function splitList(v) {
  return v === undefined ? undefined : v.split(',').map((s) => s.trim()).filter(Boolean)
}

export function parseJsonOption(v, flagName) {
  if (v === undefined) return undefined
  try {
    return JSON.parse(v)
  } catch {
    throw new Error(`--${flagName} must be valid JSON`)
  }
}
