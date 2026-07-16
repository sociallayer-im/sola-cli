import { getToken } from './config.js'
import { readFile } from 'fs/promises'
import { createReadStream } from 'fs'
import { basename } from 'path'
import { requireAuth, buildQueryString } from './utils.js'

const BASE = 'https://api.sola.day'

const PROVIDERS = {
  default: { path: '/service/upload_image' },
  s3: { path: '/service/upload_image_v1' },
  cloudflare: { path: '/service/upload_image_v2' },
}

function validateProvider(provider) {
  if (!PROVIDERS[provider]) {
    const valid = Object.keys(PROVIDERS).join(', ')
    throw new Error(`Invalid provider: ${provider}. Must be one of: ${valid}`)
  }
  return PROVIDERS[provider]
}

export async function request(method, path, params = {}, auth = false) {
  const headers = { 'Content-Type': 'application/json' }
  let url = `${BASE}${path}`
  let body
  let queryParams = {}

  if (auth) {
    const token = await requireAuth()
    queryParams.auth_token = token
  }

  if (method === 'GET') {
    queryParams = { ...queryParams, ...params }
  } else {
    body = JSON.stringify(params)
  }

  url += buildQueryString(queryParams)

  const res = await fetch(url, { method, headers, body })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }

  const json = await res.json()

  if (json.result === 'error') {
    throw new Error(json.message ?? 'API error')
  }

  return json
}

// ── Auth / sign-in ────────────────────────────────────────────────

export const sendEmail = (email) =>
  request('POST', '/service/send_email', { email, context: 'email-signin' })

export const signinWithEmail = (email, code) =>
  request('POST', '/profile/signin_with_email', { email, code })

// ── Profiles ──────────────────────────────────────────────────────

export const createProfile = (handle) =>
  request('POST', '/profile/create', { handle }, true)

export const getMe = () =>
  request('GET', '/profile/me', {}, true)

export const updateProfile = (fields) =>
  request('POST', '/profile/update', { profile: fields }, true)

export const searchProfiles = (keyword, limit) =>
  request('GET', '/profile/search', { keyword, limit })

export const getProfileById = (id) =>
  request('GET', '/profile/get_by_id', { id })

export const getProfileByEmail = (email) =>
  request('GET', '/profile/get_by_email', { email })

export const getProfileByHandle = (handle) =>
  request('GET', '/profile/get_by_handle', { handle })

export const getProfileGroups = (handle, role) =>
  request('GET', '/profile/groups', { handle, role })

// ── Groups ────────────────────────────────────────────────────────

export const getGroup = (group_id, detail = false) =>
  request('GET', '/group/get', { group_id, include_detail: detail ? true : undefined })

export const createGroup = (handle, fields) =>
  request('POST', '/group/create', { handle, group: fields }, true)

export const updateGroup = (id, fields) =>
  request('POST', '/group/update', { id, group: fields }, true)

export const listGroupMembers = (group_id) =>
  request('GET', '/group/members', { group_id })

export const addManager = (group_id, profile_id) =>
  request('POST', '/group/add_manager', { group_id, profile_id }, true)

export const removeManager = (group_id, profile_id) =>
  request('POST', '/group/remove_manager', { group_id, profile_id }, true)

export const removeMember = (group_id, profile_id) =>
  request('POST', '/group/remove_member', { group_id, profile_id }, true)

export const leaveGroup = (group_id, profile_id) =>
  request('POST', '/group/leave', { group_id, profile_id }, true)

// ── Group invites ─────────────────────────────────────────────────

export const sendInvite = (group_id, receivers, role, message) =>
  request('POST', '/group/send_invite', { group_id, receivers, role, message }, true)

export const acceptInvite = (group_invite_id) =>
  request('POST', '/group/accept_invite', { group_invite_id }, true)

export const requestInvite = (group_id, role, message) =>
  request('POST', '/group/request_invite', { group_id, role, message }, true)

export const myPendingInvites = () =>
  request('GET', '/group/my_pending_invites', {}, true)

// ── Events ────────────────────────────────────────────────────────

export const getEvent = (id) =>
  request('GET', '/event/get', { id })

export const listEvents = (params) =>
  request('GET', '/event/list', params)

export const discoverEvents = () =>
  request('GET', '/event/discover', {})

export const myEvents = (params) =>
  request('GET', '/event/my_event_list', params, true)

export const createEvent = (params) =>
  request('POST', '/event/create', params, true)

export const updateEvent = (params) =>
  request('POST', '/event/update', params, true)

export const joinEvent = (id, form_answers) =>
  request('POST', '/event/join', { id, form_answers }, true)

export const cancelEvent = (id) =>
  request('POST', '/event/cancel', { id }, true)

export const unpublishEvent = (id) =>
  request('POST', '/event/unpublish', { id }, true)

export const approveParticipant = (participant_id) =>
  request('POST', '/event/approve_participant', { participant_id }, true)

export const rejectParticipant = (participant_id) =>
  request('POST', '/event/reject_participant', { participant_id }, true)

export const removeParticipant = (id, profile_id) =>
  request('POST', '/event/remove_participant', { id, profile_id }, true)

// ── Venues ────────────────────────────────────────────────────────

export const getVenue = (id) =>
  request('GET', '/venue/get', { id })

// There is no /venue/list route. Venues are nested in the group detail view,
// so listing = group/get with include_detail, reading the `venues` array.
export async function listVenues(group_id) {
  const data = await getGroup(group_id, true)
  const group = data.group ?? data
  return { venues: group.venues ?? [] }
}

export const createVenue = (group_id, venueFields) =>
  request('POST', '/venue/create', { group_id, venue: venueFields }, true)

export const updateVenue = (id, venueFields) =>
  request('POST', '/venue/update', { id, venue: venueFields }, true)

export const removeVenue = (id) =>
  request('POST', '/venue/remove', { id }, true)

export const checkVenueAvailability = (id, start_time, end_time, timezone) =>
  request('POST', '/venue/check_availability', { id, start_time, end_time, timezone })

// ── Tickets ───────────────────────────────────────────────────────

export const rsvpTicket = (eventId, ticketId, opts = {}) =>
  request('POST', '/ticket/rsvp', { id: eventId, ticket_id: ticketId, ...opts }, true)

export const listGroupTicketTypes = (groupId) =>
  request('GET', '/ticket/list_group_ticket_types', { group_id: groupId })

export const checkCoupon = (eventId, code) =>
  request('GET', '/ticket/check_coupon', { event_id: eventId, code })

export const cancelTicketItem = (chain, eventId, orderId) =>
  request('POST', '/ticket/cancel_unpaid_item', { chain, product_id: eventId, item_id: orderId }, true)

// ── Service ───────────────────────────────────────────────────────

export async function uploadImage(filePath, provider = 'default') {
  const token = await requireAuth()
  const providerConfig = validateProvider(provider)

  const fileData = await readFile(filePath)
  const fileName = basename(filePath)

  const formData = new FormData()
  formData.append('data', new Blob([fileData]), fileName)
  if (provider === 'imagekit') formData.append('resource', 'default')

  const url = `${BASE}${providerConfig.path}?auth_token=${token}`
  const res = await fetch(url, { method: 'POST', body: formData })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }

  const json = await res.json()

  if (json.result === 'error') {
    throw new Error(json.message ?? 'Upload failed')
  }

  return json
}
