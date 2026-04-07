import { getToken } from './config.js'

const BASE = 'https://api.sola.day'

export async function request(method, path, params = {}, auth = false) {
  const headers = {}

  if (auth) {
    const token = await getToken()
    if (!token) throw new Error('Not authenticated. Run: sola auth signin')
    headers['Authorization'] = `Bearer ${token}`
  }

  let url = `${BASE}${path}`
  let body

  if (method === 'GET') {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null)
    )
    if (qs.size > 0) url += '?' + qs.toString()
  } else {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(params)
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
  request('POST', '/api/service/send_email', { email, context: 'signin' })

export const signinWithEmail = (email, code) =>
  request('POST', '/api/profile/signin_with_email', { email, code })

// ── Profile ───────────────────────────────────────────────────────────────────
export const createProfile = (handle) =>
  request('POST', '/api/profile/create', { handle }, true)

export const getProfileByEmail = (email) =>
  request('GET', '/api/profile/get_by_email', { email })

export const getProfileByHandle = (handle) =>
  request('GET', '/api/profile/get_by_handle', { handle })

// ── Events ────────────────────────────────────────────────────────────────────
export const getEvent = (id) =>
  request('GET', '/api/event/get', { id })

export const listEvents = (params) =>
  request('GET', '/api/event/list', params)

export const createEvent = (params) =>
  request('POST', '/api/event/create', params, true)

export const updateEvent = (params) =>
  request('POST', '/api/event/update', params, true)

// ── Venues ────────────────────────────────────────────────────────────────────
export const getVenue = (id) =>
  request('GET', '/api/venue/get', { id })

export const listVenues = (group_id) =>
  request('GET', '/api/venue/list', { group_id }, true)

export const createVenue = (group_id, venueFields) =>
  request('POST', '/api/venue/create', { group_id, venue: venueFields }, true)

export const updateVenue = (id, venueFields) =>
  request('POST', '/api/venue/update', { id, venue: venueFields }, true)

// ── Groups ────────────────────────────────────────────────────────────────────
export const getGroup = (group_id) =>
  request('GET', '/api/group/get', { group_id })
