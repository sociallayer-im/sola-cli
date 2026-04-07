import { getToken } from './config.js'

const BASE = 'https://api.sola.day'

export async function request(method, path, params = {}, auth = false) {
  const headers = { 'Content-Type': 'application/json' }
  let url = `${BASE}${path}`
  let body
  let queryParams = {}

  if (auth) {
    const token = await getToken()
    if (!token) throw new Error('Not authenticated. Run: sola auth signin')
    queryParams.auth_token = token
  }

  if (method === 'GET') {
    // For GET, params go in query string
    queryParams = { ...queryParams, ...params }
    const qs = new URLSearchParams(
      Object.entries(queryParams).filter(([, v]) => v != null)
    )
    if (qs.size > 0) url += '?' + qs.toString()
  } else {
    // For POST, params go in body, auth_token goes in query string
    body = JSON.stringify(params)
    const qs = new URLSearchParams(
      Object.entries(queryParams).filter(([, v]) => v != null)
    )
    if (qs.size > 0) url += '?' + qs.toString()
  }

  const res = await fetch(url, { method, headers, body })
  const json = await res.json()

  if (json.result === 'error') {
    throw new Error(json.message ?? 'API error')
  }

  return json
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const sendEmail = (email) =>
  request('POST', '/service/send_email', { email, context: 'email-signin' })

export const signinWithEmail = (email, code) =>
  request('POST', '/profile/signin_with_email', { email, code })

// ── Profile ───────────────────────────────────────────────────────────────────
export const createProfile = (handle) =>
  request('POST', '/profile/create', { handle }, true)

export const getProfileByEmail = (email) =>
  request('GET', '/profile/get_by_email', { email })

export const getProfileByHandle = (handle) =>
  request('GET', '/profile/get_by_handle', { handle })

// ── Events ────────────────────────────────────────────────────────────────────
export const getEvent = (id) =>
  request('GET', '/event/get', { id })

export const listEvents = (params) =>
  request('GET', '/event/list', params)

export const createEvent = (params) =>
  request('POST', '/event/create', params, true)

export const updateEvent = (params) =>
  request('POST', '/event/update', params, true)

// ── Venues ────────────────────────────────────────────────────────────────────
export const getVenue = (id) =>
  request('GET', '/venue/get', { id })

export const listVenues = (group_id) =>
  request('GET', '/venue/list', { group_id }, true)

export const createVenue = (group_id, venueFields) =>
  request('POST', '/venue/create', { group_id, venue: venueFields }, true)

export const updateVenue = (id, venueFields) =>
  request('POST', '/venue/update', { id, venue: venueFields }, true)

// ── Groups ────────────────────────────────────────────────────────────────────
export const getGroup = (group_id) =>
  request('GET', '/group/get', { group_id })
