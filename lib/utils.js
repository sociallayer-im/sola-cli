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

export function buildQueryString(params) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null)
  )
  return qs.size > 0 ? '?' + qs.toString() : ''
}
