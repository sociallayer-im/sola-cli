import { getToken } from './config.js'
import { readFile } from 'fs/promises'
import { basename } from 'path'
import { requireAuth, buildQueryString } from './utils.js'

// soon (the current Rails backend) namespaces everything under /api/v1 and
// authenticates via `Authorization: Bearer <jwt>` — unlike the retired sails
// backend, which took `auth_token` as a query/body param with no path prefix.
// SOLA_API_URL lets this point at a local `soon` dev server (bin/dev on :3000).
const BASE = process.env.SOLA_API_URL || 'https://api.sola.day'

export class SolaApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'SolaApiError'
    this.status = status
  }
}

/**
 * The one transport for every soon API call. `path` is relative to /api/v1.
 *
 * `auth` mirrors soon's own three-tier model:
 *   - true      — endpoint 401s without a token (Api::BaseController#authenticate!).
 *                 Fails fast locally with a friendly message if none is saved.
 *   - 'optional'— endpoint works anonymously but personalizes with a token if
 *                 present (authenticate_optional!) — e.g. event/user views.
 *                 A stale/invalid saved token degrades to anonymous rather
 *                 than erroring, same as the server does.
 *   - falsy     — endpoint never reads a token.
 */
export async function request(method, path, { params, body, auth } = {}) {
  const url = `${BASE}/api/v1${path}${params ? buildQueryString(params) : ''}`
  const headers = {}

  if (auth === true) {
    headers['Authorization'] = `Bearer ${await requireAuth()}`
  } else if (auth === 'optional') {
    const token = await getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  let payload
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const res = await fetch(url, { method, headers, body: payload })
  if (res.status === 204) return undefined

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new SolaApiError(json.error || `Request failed (${res.status})`, res.status)
  }
  return json
}

// ── Auth ──────────────────────────────────────────────────────────

export const requestCode = (email) =>
  request('POST', '/auth/request_code', { body: { email } })

export const verifyCode = (email, code) =>
  request('POST', '/auth/verify_code', { body: { email, code } })

// ── Users ─────────────────────────────────────────────────────────
// soon's person model is `User` (sails called it Profile); handles/usernames
// live in `name`, display names in `nickname`. :id accepts a TSID, a
// username, or the literal "me".

export const getUser = (id) =>
  request('GET', `/users/${encodeURIComponent(id)}`, { auth: 'optional' })

export const getMe = () =>
  request('GET', '/users/me', { auth: true })

// The :id in the URL is ignored server-side — it always acts on current_user
// — but the route still requires one, so "me" is used for clarity.
export const updateUser = (fields) =>
  request('PATCH', '/users/me', { body: { user: fields }, auth: true })

export const getUserGroups = (id, role) =>
  request('GET', `/users/${encodeURIComponent(id)}/groups`, { params: { role } })

// ── Groups ────────────────────────────────────────────────────────
// Group IS the popup city (one table) — start_date/end_date/location double
// as popup-city fields. `name` is the unique slug; `nickname` the display name.

export const getGroup = (id) =>
  request('GET', `/groups/${encodeURIComponent(id)}`)

export const listMyGroups = () =>
  request('GET', '/groups', { auth: true })

export const createGroup = (fields) =>
  request('POST', '/groups', { body: { group: fields }, auth: true })

export const updateGroup = (id, fields) =>
  request('PATCH', `/groups/${id}`, { body: { group: fields }, auth: true })

export const deleteGroup = (id) =>
  request('DELETE', `/groups/${id}`, { auth: true })

export const freezeGroup = (id) =>
  request('POST', `/groups/${id}/freeze`, { auth: true })

export const sendGroupEmail = (id, { subject, content, testRecipient }) =>
  request('POST', `/groups/${id}/send_email`, {
    body: { subject, content, test_recipient: testRecipient },
    auth: true,
  })

// ── Memberships ───────────────────────────────────────────────────
// Addressed by membership id (from `listMemberships`), not user id — a user
// can hold at most one membership per group, and every write acts on that row.

export const listMemberships = (groupId) =>
  request('GET', `/groups/${groupId}/memberships`)

export const addMembership = (groupId, userId, role) =>
  request('POST', `/groups/${groupId}/memberships`, {
    body: { role, user_id: userId },
    auth: true,
  })

export const updateMembership = (groupId, membershipId, role) =>
  request('PATCH', `/groups/${groupId}/memberships/${membershipId}`, {
    body: { membership: { role } },
    auth: true,
  })

export const removeMembership = (groupId, membershipId) =>
  request('DELETE', `/groups/${groupId}/memberships/${membershipId}`, { auth: true })

// ── Group invites ─────────────────────────────────────────────────
// Every action here requires auth, including reads — group_invites carry PII
// (receiver_address) so there's no anonymous view, unlike most public GETs.

export const listGroupInvites = (groupId) =>
  request('GET', `/groups/${groupId}/group_invites`, { auth: true })

export const pendingInvites = () =>
  request('GET', '/group_invites/pending', { auth: true })

export const getInvite = (id) =>
  request('GET', `/group_invites/${id}`, { auth: true })

// Known users (matched by name/email/eth) are added to the group directly —
// no invite record. Only unmatched email addresses get a real GroupInvite.
export const sendGroupInvites = (groupId, receivers, role, message) =>
  request('POST', `/groups/${groupId}/group_invites`, {
    body: { receivers, role, message },
    auth: true,
  })

export const cancelInvite = (groupId, id) =>
  request('DELETE', `/groups/${groupId}/group_invites/${id}`, { auth: true })

export const revokeInvite = (groupId, id) =>
  request('POST', `/groups/${groupId}/group_invites/${id}/revoke`, { auth: true })

export const acceptInvite = (groupId, id) =>
  request('POST', `/groups/${groupId}/group_invites/${id}/accept`, { auth: true })

// Role is always "member" server-side for self-service requests.
export const requestToJoinGroup = (groupId) =>
  request('POST', `/groups/${groupId}/group_invites/request_invite`, { auth: true })

export const acceptJoinRequest = (groupId, id) =>
  request('POST', `/groups/${groupId}/group_invites/${id}/accept_request`, { auth: true })

export const sendInviteCode = (groupId, role, message) =>
  request('POST', `/groups/${groupId}/group_invites/send_with_code`, {
    body: { role, message },
    auth: true,
  })

export const acceptInviteCode = (groupId, code) =>
  request('POST', `/groups/${groupId}/group_invites/accept_with_code`, {
    body: { code },
    auth: true,
  })

// ── Events ────────────────────────────────────────────────────────

export const getEvent = (id) =>
  request('GET', `/events/${id}`, { auth: 'optional' })

export const listEvents = (params) =>
  request('GET', '/events', { params, auth: 'optional' })

export const pendingApprovalEvents = (params) =>
  request('GET', '/events/pending_approval', { params, auth: true })

// eventRoles/tickets are optional nested arrays created atomically with the
// event (see EventsController#create) — sent as top-level params, not nested
// under `event:`.
export const createEvent = (fields, { eventRoles, tickets } = {}) =>
  request('POST', '/events', {
    body: { event: fields, event_roles: eventRoles, tickets },
    auth: true,
  })

export const updateEvent = (id, fields) =>
  request('PATCH', `/events/${id}`, { body: { event: fields }, auth: true })

// Soft-cancel — flips status to "cancelled" and notifies attendees. Does not
// destroy the record (participants/tickets/coupons are kept).
export const cancelEvent = (id) =>
  request('DELETE', `/events/${id}`, { auth: true })

export const approveEvent = (id) =>
  request('POST', `/events/${id}/approve`, { auth: true })

// ── Participants ──────────────────────────────────────────────────
// Every action requires auth (ParticipantsController has no public actions).

export const listParticipants = (eventId) =>
  request('GET', `/events/${eventId}/participants`, { auth: true })

export const joinEvent = (eventId, formAnswers) =>
  request('POST', `/events/${eventId}/participants`, {
    body: { form_answers: formAnswers },
    auth: true,
  })

// Self only — the server rejects updates to anyone else's participant row.
export const updateParticipant = (eventId, id, status) =>
  request('PATCH', `/events/${eventId}/participants/${id}`, {
    body: { participant: { status } },
    auth: true,
  })

export const cancelParticipant = (eventId, id) =>
  request('DELETE', `/events/${eventId}/participants/${id}`, { auth: true })

export const approveParticipant = (eventId, id) =>
  request('POST', `/events/${eventId}/participants/${id}/approve`, { auth: true })

export const rejectParticipant = (eventId, id) =>
  request('POST', `/events/${eventId}/participants/${id}/reject`, { auth: true })

export const checkInParticipant = (eventId, userId) =>
  request('POST', `/events/${eventId}/participants/check_in`, {
    body: { user_id: userId },
    auth: true,
  })

// ── Venues ────────────────────────────────────────────────────────
// All of VenuesController requires auth (unlike groups/events, there is no
// public read path here).

export const getVenue = (id) =>
  request('GET', `/venues/${id}`, { auth: true })

export const listVenues = (groupId) =>
  request('GET', '/venues', { params: { group_id: groupId }, auth: true })

export const createVenue = (fields) =>
  request('POST', '/venues', { body: { venue: fields }, auth: true })

export const updateVenue = (id, fields) =>
  request('PATCH', `/venues/${id}`, { body: { venue: fields }, auth: true })

// Soft delete: archives the venue (events keep referencing it).
export const removeVenue = (id) =>
  request('DELETE', `/venues/${id}`, { auth: true })

// The first event that would clash with the given window, or null.
export const venueConflict = (id, { startTime, endTime, excludeEventId }) =>
  request('GET', `/venues/${id}/conflict`, {
    params: { start_time: startTime, end_time: endTime, exclude_event_id: excludeEventId },
    auth: true,
  })

// Replaces the venue's whole availability set. `availabilities` is an array
// of { day_of_week, day, intervals: [["HH:MM","HH:MM"]], role_required }.
// Empty intervals = closed that slot; no records at all = open 24/7.
export const setVenueAvailability = (id, availabilities) =>
  request('POST', `/venues/${id}/availability`, { body: { availabilities }, auth: true })

// ── Places ────────────────────────────────────────────────────────
// Venue/event/marker locations resolve through a Place (`place_id`), not
// free-text fields. All of PlacesController requires auth.

export const listPlaces = () =>
  request('GET', '/places', { auth: true })

export const getPlace = (id) =>
  request('GET', `/places/${id}`, { auth: true })

export const searchPlaces = (query) =>
  request('GET', '/places/search', { params: { query }, auth: true })

// Find-or-create by name: an existing name returns the existing record.
export const createPlace = (fields) =>
  request('POST', '/places', { body: { place: fields }, auth: true })

// ── Tracks ────────────────────────────────────────────────────────
// index/show are public; create/update/destroy require a manager.

export const listTracks = (groupId) =>
  request('GET', '/tracks', { params: { group_id: groupId } })

export const getTrack = (id) =>
  request('GET', `/tracks/${id}`)

export const createTrack = (fields) =>
  request('POST', '/tracks', { body: { track: fields }, auth: true })

export const updateTrack = (id, fields) =>
  request('PATCH', `/tracks/${id}`, { body: { track: fields }, auth: true })

export const removeTrack = (id) =>
  request('DELETE', `/tracks/${id}`, { auth: true })

// ── Tickets ───────────────────────────────────────────────────────
// Stripe-specific endpoints (stripe_config/stripe_client_secret/
// stripe_callback/set_payment_status) are deliberately not wrapped here — a
// CLI can't drive Stripe's client-side payment element or act as its webhook
// receiver, so there's nothing useful for it to call there.

export const listGroupTicketTypes = (groupId) =>
  request('GET', '/tickets/list_group_ticket_types', { params: { group_id: groupId } })

export const checkCoupon = (eventId, code) =>
  request('GET', '/tickets/check_coupon', { params: { event_id: eventId, code } })

export const couponPrice = (code, paymentMethodId, amount) =>
  request('GET', '/tickets/coupon_price', { params: { code, payment_method_id: paymentMethodId, amount } })

export const listEventTickets = (eventId) =>
  request('GET', `/events/${eventId}/tickets`, { auth: true })

export const createTicket = (eventId, fields) =>
  request('POST', `/events/${eventId}/tickets`, { body: { ticket: fields }, auth: true })

export const updateTicket = (eventId, ticketId, fields) =>
  request('PATCH', `/events/${eventId}/tickets/${ticketId}`, { body: { ticket: fields }, auth: true })

// Sold tickets are retired (status: inactive) rather than destroyed — the
// server decides which, based on whether any ticket_items reference it.
export const removeTicket = (eventId, ticketId) =>
  request('DELETE', `/events/${eventId}/tickets/${ticketId}`, { auth: true })

// Free tickets confirm immediately; paid ones create a pending ticket_item —
// follow up with verifyPayment once the on-chain tx confirms.
export const rsvpTicket = (eventId, ticketId, opts = {}) =>
  request('POST', `/events/${eventId}/tickets/${ticketId}/rsvp`, { body: opts, auth: true })

export const verifyPayment = (ticketItemId, { txhash, senderAddress } = {}) =>
  request('POST', '/tickets/verify_payment', {
    body: { ticket_item_id: ticketItemId, txhash, sender_address: senderAddress },
    auth: true,
  })

export const cancelUnpaidItem = (chain, eventId, orderId) =>
  request('POST', '/tickets/cancel_unpaid_item', {
    body: { chain, product_id: eventId, item_id: orderId },
    auth: true,
  })

// ── Discover / search ─────────────────────────────────────────────

export const discoverHome = () =>
  request('GET', '/discover')

export const search = (keyword) =>
  request('GET', '/search', { params: { keyword } })

// ── Uploads ───────────────────────────────────────────────────────
// One endpoint now (Cloudflare Images) — the old default/s3/cloudflare
// provider split doesn't exist in soon.

export async function uploadImage(filePath) {
  const token = await requireAuth()
  const fileData = await readFile(filePath)

  const formData = new FormData()
  formData.append('file', new Blob([fileData]), basename(filePath))

  const res = await fetch(`${BASE}/api/v1/upload/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new SolaApiError(json.error || `Upload failed (${res.status})`, res.status)
  return json
}
