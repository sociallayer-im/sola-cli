import { request } from './api.js'

const enc = encodeURIComponent

// ── Event registration forms (/events/:id/form) ───────────────────
// Flat top-level body (no wrapper key). `fields` is the authoritative list:
// omitted fields are deleted along with their answers.

export const getEventForm = (eventId) =>
  request('GET', `/events/${enc(eventId)}/form`, { auth: 'optional' })

export const saveEventForm = (eventId, body) =>
  request('POST', `/events/${enc(eventId)}/form`, { body, auth: true })

export const clearEventForm = (eventId) =>
  request('DELETE', `/events/${enc(eventId)}/form`, { auth: true })

export const getEventFormSubmission = (eventId, userId) =>
  request('GET', `/events/${enc(eventId)}/form/submission`, { params: { user_id: userId }, auth: true })

export const getMyEventFormSubmission = (eventId) =>
  request('GET', `/events/${enc(eventId)}/form/my_submission`, { auth: true })

export const updateEventFormSubmission = (eventId, formAnswers) =>
  request('PATCH', `/events/${enc(eventId)}/form/submission`, { body: { form_answers: formAnswers }, auth: true })

export const listEventFormSubmissions = (eventId) =>
  request('GET', `/events/${enc(eventId)}/form/submissions`, { auth: true })

// ── Standalone forms (/forms) ─────────────────────────────────────

export const listForms = (params) => request('GET', '/forms', { params, auth: true })

export const listMyFormSubmissions = (params) =>
  request('GET', '/forms/submissions', { params, auth: true })

export const getForm = (slug) =>
  request('GET', `/forms/${enc(slug)}`, { auth: 'optional' })

export const createForm = (body) => request('POST', '/forms', { body, auth: true })

export const updateForm = (slug, body) =>
  request('PATCH', `/forms/${enc(slug)}`, { body, auth: true })

export const removeForm = (slug) => request('DELETE', `/forms/${enc(slug)}`, { auth: true })

export const listFormSubmissions = (slug, params) =>
  request('GET', `/forms/${enc(slug)}/submissions`, { params, auth: 'optional' })

export const getMyFormSubmission = (slug) =>
  request('GET', `/forms/${enc(slug)}/my_submission`, { auth: true })

export const submitForm = (slug, answers) =>
  request('POST', `/forms/${enc(slug)}/submissions`, { body: { answers }, auth: true })

// ── Teams ─────────────────────────────────────────────────────────
// Writes wrap fields under `team`.

export const listTeams = (params) => request('GET', '/teams', { params, auth: true })

export const createTeam = (fields) =>
  request('POST', '/teams', { body: { team: fields }, auth: true })

export const updateTeam = (id, fields) =>
  request('PATCH', `/teams/${enc(id)}`, { body: { team: fields }, auth: true })

export const removeTeam = (id) => request('DELETE', `/teams/${enc(id)}`, { auth: true })

export const listTeamMembers = (id, params) =>
  request('GET', `/teams/${enc(id)}/members`, { params, auth: true })

export const addTeamMember = (id, userId) =>
  request('POST', `/teams/${enc(id)}/members`, { body: { user_id: userId }, auth: true })

export const removeTeamMember = (id, userId) =>
  request('DELETE', `/teams/${enc(id)}/members/${enc(userId)}`, { auth: true })

// ── Markers ───────────────────────────────────────────────────────
// Writes wrap fields under `marker`. show is public (no token read).

export const listMarkers = (params) =>
  request('GET', '/markers', { params, auth: 'optional' })

export const getMarker = (id) => request('GET', `/markers/${enc(id)}`)

export const createMarker = (fields) =>
  request('POST', '/markers', { body: { marker: fields }, auth: true })

export const updateMarker = (id, fields) =>
  request('PATCH', `/markers/${enc(id)}`, { body: { marker: fields }, auth: true })

export const removeMarker = (id) => request('DELETE', `/markers/${enc(id)}`, { auth: true })

// ── Event roles ───────────────────────────────────────────────────
// Writes wrap fields under `event_role`. index requires a token too.

export const listEventRoles = (eventId) =>
  request('GET', `/events/${enc(eventId)}/event_roles`, { auth: true })

export const createEventRole = (eventId, fields) =>
  request('POST', `/events/${enc(eventId)}/event_roles`, { body: { event_role: fields }, auth: true })

export const updateEventRole = (eventId, id, fields) =>
  request('PATCH', `/events/${enc(eventId)}/event_roles/${enc(id)}`, { body: { event_role: fields }, auth: true })

export const removeEventRole = (eventId, id) =>
  request('DELETE', `/events/${enc(eventId)}/event_roles/${enc(id)}`, { auth: true })

// ── Recurring series ──────────────────────────────────────────────
// Flat top-level bodies.

export const getRecurring = (id) =>
  request('GET', `/recurring/${enc(id)}`, { auth: 'optional' })

export const createRecurring = (body) => request('POST', '/recurring', { body, auth: true })

export const updateRecurring = (id, body) =>
  request('PATCH', `/recurring/${enc(id)}`, { body, auth: true })

export const cancelRecurring = (id, body) =>
  request('POST', `/recurring/${enc(id)}/cancel`, { body, auth: true })

// ── Comments ──────────────────────────────────────────────────────
// create wraps under `comment`; star/unstar/index take top-level params.

export const listComments = (params) =>
  request('GET', '/comments', { params })

export const createComment = (fields) =>
  request('POST', '/comments', { body: { comment: fields }, auth: true })

export const starItem = (itemType, itemId) =>
  request('POST', '/comments/star', { body: { item_type: itemType, item_id: itemId }, auth: true })

export const unstarItem = (itemType, itemId) =>
  request('POST', '/comments/unstar', { body: { item_type: itemType, item_id: itemId }, auth: true })

export const removeComment = (id) =>
  request('POST', `/comments/${enc(id)}/remove`, { auth: true })

// ── Activities ────────────────────────────────────────────────────

export const listActivities = (params) =>
  request('GET', '/activities', { params, auth: true })

export const markActivitiesRead = (ids) =>
  request('POST', '/activities/mark_read', { body: { ids }, auth: true })
