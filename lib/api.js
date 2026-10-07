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

// context 'bind_email' mints a code for attaching an email to a signed-in
// account (see bindEmail) instead of a login code.
export const requestCode = (email, context) =>
  request('POST', '/auth/request_code', { body: { email, context } })

export const verifyCode = (email, code) =>
  request('POST', '/auth/verify_code', { body: { email, code } })

// CN only: the three phone endpoints 404 unless the server has
// PHONE_LOGIN_ENABLED=true (only the juluo.xyz deployment does), and only
// +86 mainland mobile numbers are accepted. context 'bind_phone' mints a code
// for bindPhone instead of a login code. Rate limited (30s cooldown, 10/hour).
export const requestPhoneCode = (phone, context) =>
  request('POST', '/auth/request_phone_code', { body: { phone, context } })

export const verifyPhoneCode = (phone, code) =>
  request('POST', '/auth/verify_phone_code', { body: { phone, code } })

// Both bind calls need a session. May answer {token, merged: true} when the
// identity already has an account and a merge happened — the caller must then
// replace its saved token.
export const bindPhone = (phone, code) =>
  request('POST', '/auth/bind_phone', { body: { phone, code }, auth: true })

export const bindEmail = (email, code) =>
  request('POST', '/auth/bind_email', { body: { email, code }, auth: true })

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

// Platform-admin only and irreversible: moves everything `fromId` owns onto
// `intoId`, then destroys `fromId`. Does not carry login identity.
export const mergeUsers = (fromId, intoId) =>
  request('POST', '/users/merge', { body: { from_id: fromId, into_id: intoId }, auth: true })

// ── Groups ────────────────────────────────────────────────────────
// Group IS the popup city (one table) — start_date/end_date/location double
// as popup-city fields. `name` is the unique slug; `nickname` the display name.

export const getGroup = (id) =>
  request('GET', `/groups/${encodeURIComponent(id)}`)

// Paginated: { data, meta }. params: { page, limit } (limit capped at 500).
export const listMyGroups = (params) =>
  request('GET', '/groups', { params, auth: true })

// Public, paginated list of ALL active groups (the only list that shows
// untagged ones), card view with member/event counts and tags.
export const groupDirectory = (params) =>
  request('GET', '/groups/directory', { params })

// Public iCalendar feed of a group's published events (id = TSID or slug).
// Subscribe in a calendar app via this URL (or webcal:// + the same path).
export const groupCalendarUrl = (id) =>
  `${BASE}/api/v1/groups/${encodeURIComponent(id)}/calendar.ics`

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

// Paginated: { data, meta }. params: { page, limit }.
export const listMemberships = (groupId, params) =>
  request('GET', `/groups/${groupId}/memberships`, { params, auth: 'optional' })

export const addMembership = (groupId, userId, role) =>
  request('POST', `/groups/${groupId}/memberships`, {
    body: { role, user_id: userId },
    auth: true,
  })

// fields: { role?, admin_notification? } — only the keys present are written.
export const updateMembership = (groupId, membershipId, fields) =>
  request('PATCH', `/groups/${groupId}/memberships/${membershipId}`, {
    body: { membership: fields },
    auth: true,
  })

export const removeMembership = (groupId, membershipId) =>
  request('DELETE', `/groups/${groupId}/memberships/${membershipId}`, { auth: true })

// ── Group invites ─────────────────────────────────────────────────
// Every action here requires auth, including reads — group_invites carry PII
// (receiver_address) so there's no anonymous view, unlike most public GETs.

export const listGroupInvites = (groupId, params) =>
  request('GET', `/groups/${groupId}/group_invites`, { params, auth: true })

export const pendingInvites = () =>
  request('GET', '/group_invites/pending', { auth: true })

export const getInvite = (id) =>
  request('GET', `/group_invites/${id}`, { auth: true })

// Known users (matched by CN phone/name/email/eth) are added to the group
// directly — no invite record. Unmatched emails get an email GroupInvite;
// unmatched CN phone numbers get a whitelist invite (auto-join on sign-in/bind,
// no SMS, never expires). Response: { results: [{ address, result, message? }] }.
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

// includeParticipants=false drops the attendee array (lighter payload); the
// viewer's own participant row is still returned.
export const getEvent = (id, { includeParticipants } = {}) =>
  request('GET', `/events/${id}`, {
    params: includeParticipants === false ? { include_participants: 'false' } : undefined,
    auth: 'optional',
  })

export const listEvents = (params) =>
  request('GET', '/events', { params, auth: 'optional' })

export const pendingApprovalEvents = (params) =>
  request('GET', '/events/pending_approval', { params, auth: true })

// eventRoles/tickets are optional nested arrays created atomically with the
// event (see EventsController#create) — sent as top-level params, not nested
// under `event:`. isGroupTicketEvent (top-level too, manager-only) designates
// the event whose tickets grant group membership.
export const createEvent = (fields, { eventRoles, tickets, isGroupTicketEvent } = {}) =>
  request('POST', '/events', {
    body: { event: fields, event_roles: eventRoles, tickets, is_group_ticket_event: isGroupTicketEvent },
    auth: true,
  })

export const updateEvent = (id, fields, { isGroupTicketEvent } = {}) =>
  request('PATCH', `/events/${id}`, {
    body: { event: fields, is_group_ticket_event: isGroupTicketEvent },
    auth: true,
  })

// Soft-cancel — flips status to "cancelled" and notifies attendees. Does not
// destroy the record (participants/tickets/coupons are kept).
export const cancelEvent = (id) =>
  request('DELETE', `/events/${id}`, { auth: true })

export const approveEvent = (id) =>
  request('POST', `/events/${id}/approve`, { auth: true })

// Event roles (co-host / speaker / judge / ...) — every action needs auth;
// writes need event owner, an existing role holder, or a group manager.
export const listEventRoles = (eventId) =>
  request('GET', `/events/${eventId}/event_roles`, { auth: true })

export const addEventRole = (eventId, fields) =>
  request('POST', `/events/${eventId}/event_roles`, { body: { event_role: fields }, auth: true })

export const updateEventRole = (eventId, id, fields) =>
  request('PATCH', `/events/${eventId}/event_roles/${id}`, { body: { event_role: fields }, auth: true })

export const removeEventRole = (eventId, id) =>
  request('DELETE', `/events/${eventId}/event_roles/${id}`, { auth: true })

// Public .ics feed URL (subscribable via webcal://). Pure URL builder — no request.
export const eventCalendarUrl = (id, { webcal } = {}) => {
  const url = `${BASE}/api/v1/events/${id}/calendar.ics`
  return webcal ? url.replace(/^https?:/, 'webcal:') : url
}

// Fetch the .ics body itself (text/calendar, not JSON, so bypasses `request`).
export async function fetchEventCalendar(id) {
  const res = await fetch(eventCalendarUrl(id))
  if (!res.ok) throw new SolaApiError(`Request failed (${res.status})`, res.status)
  return res.text()
}

// ── Participants ──────────────────────────────────────────────────
// index is public (auth optional, gated by the event's own visibility); every
// other action requires auth.

export const listParticipants = (eventId, params) =>
  request('GET', `/events/${eventId}/participants`, { params, auth: 'optional' })

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
// show is public (no token sent); index and every write require auth.

export const getVenue = (id) =>
  request('GET', `/venues/${id}`)

export const listVenues = (groupId, { limit, page } = {}) =>
  request('GET', '/venues', { params: { group_id: groupId, limit, page }, auth: true })

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

export const listPlaces = ({ limit, page } = {}) =>
  request('GET', '/places', { params: { limit, page }, auth: true })

export const getPlace = (id) =>
  request('GET', `/places/${id}`, { auth: true })

export const searchPlaces = (query) =>
  request('GET', '/places/search', { params: { query }, auth: true })

// Find-or-create by name: an existing name returns the existing record.
export const createPlace = (fields) =>
  request('POST', '/places', { body: { place: fields }, auth: true })

// ── Tracks ────────────────────────────────────────────────────────
// index/show are public; create/update/destroy require a manager.

export const listTracks = (groupId, { limit, page } = {}) =>
  request('GET', '/tracks', { params: { group_id: groupId, limit, page } })

export const getTrack = (id) =>
  request('GET', `/tracks/${id}`)

export const createTrack = (fields) =>
  request('POST', '/tracks', { body: { track: fields }, auth: true })

export const updateTrack = (id, fields) =>
  request('PATCH', `/tracks/${id}`, { body: { track: fields }, auth: true })

export const removeTrack = (id) =>
  request('DELETE', `/tracks/${id}`, { auth: true })

// ── Tickets ───────────────────────────────────────────────────────
// Auth modes follow TicketsController: list_group_ticket_types, check_coupon,
// coupon_price and set_payment_status skip authentication; everything else
// needs a token. Stripe's client-side payment element and webhooks aren't
// wrapped — but checkout_session returns a hosted `checkout_url` a CLI can print.

export const listGroupTicketTypes = (groupId) =>
  request('GET', '/tickets/list_group_ticket_types', { params: { group_id: groupId } })

export const checkCoupon = (eventId, code) =>
  request('GET', '/tickets/check_coupon', { params: { event_id: eventId, code } })

export const couponPrice = (code, paymentMethodId, amount) =>
  request('GET', '/tickets/coupon_price', { params: { code, payment_method_id: paymentMethodId, amount } })

export const listEventTickets = (eventId, { limit, page } = {}) =>
  request('GET', `/events/${eventId}/tickets`, { params: { limit, page }, auth: true })

export const createTicket = (eventId, fields) =>
  request('POST', `/events/${eventId}/tickets`, { body: { ticket: fields }, auth: true })

export const updateTicket = (eventId, ticketId, fields) =>
  request('PATCH', `/events/${eventId}/tickets/${ticketId}`, { body: { ticket: fields }, auth: true })

// Sold tickets are retired (status: inactive) rather than destroyed — the
// server decides which, based on whether any ticket_items reference it.
export const removeTicket = (eventId, ticketId) =>
  request('DELETE', `/events/${eventId}/tickets/${ticketId}`, { auth: true })

// Free tickets confirm immediately; paid ones create a pending ticket_item —
// follow up with verifyPayment (crypto), checkoutSession (stripe) or
// wechatPrepay (wechat).
export const rsvpTicket = (eventId, ticketId, opts = {}) =>
  request('POST', `/events/${eventId}/tickets/${ticketId}/rsvp`, { body: opts, auth: true })

export const verifyPayment = (ticketItemId, { txhash, senderAddress } = {}) =>
  request('POST', '/tickets/verify_payment', {
    body: { ticket_item_id: ticketItemId, txhash, sender_address: senderAddress },
    auth: true,
  })

// Identify the order either by ticket_item id, or by (chain, event, order id).
export const cancelUnpaidItem = (chain, eventId, orderId, ticketItemId) =>
  request('POST', '/tickets/cancel_unpaid_item', {
    body: ticketItemId ? { ticket_item_id: ticketItemId } : { chain, product_id: eventId, item_id: orderId },
    auth: true,
  })

// Shared-secret (NEXT_TOKEN) endpoint; crypto orders only — card/WeChat
// orders are refused (they confirm via webhook).
export const setPaymentStatus = ({ nextToken, ticketItemId, chain, eventId, orderId, amount, txhash, senderAddress }) =>
  request('POST', '/tickets/set_payment_status', {
    body: {
      next_token: nextToken, ticket_item_id: ticketItemId, chain,
      product_id: eventId, item_id: orderId, amount, txhash, sender_address: senderAddress,
    },
  })

// Stripe-hosted Checkout for a pending stripe order: { checkout_url, session_id }.
export const checkoutSession = (ticketItemId) =>
  request('POST', '/tickets/checkout_session', { body: { ticket_item_id: ticketItemId }, auth: true })

// WeChat JSAPI prepay for a pending wechat order: { pay_params }.
export const wechatPrepay = (ticketItemId) =>
  request('POST', '/tickets/wechat_prepay', { body: { ticket_item_id: ticketItemId }, auth: true })

// Organizer-initiated refund of a card/WeChat order. amount (minor units)
// omitted = refund the whole remaining balance.
export const refundTicketItem = (ticketItemId, { amount, reason } = {}) =>
  request('POST', `/tickets/${ticketItemId}/refund`, { body: { amount, reason }, auth: true })

// Group manager grants a group ticket by email (membership now, or a pending
// invite if the email has no account yet). `title` is the ticket type's content text.
export const addGroupTicketItem = (groupId, { email, title }) =>
  request('POST', '/tickets/add_group_ticket_item', {
    body: { group_id: groupId, email, title },
    auth: true,
  })

// Orders for an event. Managers: all (optionally one user via profileHandle);
// a buyer may list only their own (profileHandle = their username).
export const listTicketItems = (eventId, { profileHandle, status } = {}) =>
  request('GET', '/tickets/list', {
    params: { event_id: eventId, profile_handle: profileHandle, status },
    auth: true,
  })

// Organizer revenue rollup per rail/currency.
export const orderSummary = (eventId) =>
  request('GET', '/tickets/order_summary', { params: { event_id: eventId }, auth: true })

// Coupons are replaced/edited as a batch: [{id?, selector_type, code, label,
// discount_type, discount, expires_at, max_allowed_usages, applicable_ticket_ids,
// _destroy}]. Entries with id update; with id + _destroy soft-delete; without id create.
export const setCoupons = (eventId, coupons) =>
  request('POST', '/tickets/set_coupon', { body: { event_id: eventId, coupons }, auth: true })

export const listCoupons = (eventId) =>
  request('GET', '/tickets/coupons', { params: { event_id: eventId }, auth: true })

export const getCoupon = (id) =>
  request('GET', '/tickets/coupon', { params: { id }, auth: true })

// Just { coupon_id, code } for an id.
export const getCouponCode = (id) =>
  request('GET', '/tickets/get_coupon', { params: { id }, auth: true })

export const couponUsage = (couponId) =>
  request('GET', '/tickets/coupon_usage', { params: { coupon_id: couponId }, auth: true })

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

// Domain modules added after the sails→soon rewrite; each imports request from ./api.js.
export * from './api-forms.js'
export * from './api-community.js'
export * from './api-assets.js'
