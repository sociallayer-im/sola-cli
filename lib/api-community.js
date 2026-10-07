// Community modules of soon: discussion (categories/topics/replies), polls,
// hackathons and hackathon projects. Kept in its own file so api.js stays
// manageable; imports the shared transport from api.js.
//
// Feature gates: DISCUSSION_ENABLED / POLL_ENABLED / HACKATHON_ENABLED (and the
// per-group groups.*_enabled switches) make every endpoint here 404 when off.
// Write bodies nest under the Rails strong-params key (`category`, `topic`,
// `reply`, `poll`, `hackathon`, `hackathon_project`); action endpoints
// (vote, review, award, ...) take top-level keys.

import { request } from './api.js'
import { requireAuth, buildQueryString } from './utils.js'

const id = (v) => encodeURIComponent(v)

// CSV endpoints (export) are not JSON, so request() can't be used.
async function requestText(path, { params } = {}) {
  const base = process.env.SOLA_API_URL || 'https://api.sola.day'
  const token = await requireAuth()
  const res = await fetch(`${base}/api/v1${path}${params ? buildQueryString(params) : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error || `Request failed (${res.status})`)
  }
  return res.text()
}

// ── Categories (discussion boards) ────────────────────────────────

export const listCategories = (params) =>
  request('GET', '/categories', { params, auth: 'optional' })

export const createCategory = (fields) =>
  request('POST', '/categories', { body: { category: fields }, auth: true })

export const updateCategory = (cid, fields) =>
  request('PATCH', `/categories/${id(cid)}`, { body: { category: fields }, auth: true })

export const removeCategory = (cid) =>
  request('DELETE', `/categories/${id(cid)}`, { auth: true })

// ── Topics ────────────────────────────────────────────────────────

export const listTopics = (params) =>
  request('GET', '/topics', { params, auth: 'optional' })

export const getTopic = (tid) =>
  request('GET', `/topics/${id(tid)}`, { auth: 'optional' })

export const createTopic = (fields) =>
  request('POST', '/topics', { body: { topic: fields }, auth: true })

export const updateTopic = (tid, fields) =>
  request('PATCH', `/topics/${id(tid)}`, { body: { topic: fields }, auth: true })

export const removeTopic = (tid) =>
  request('DELETE', `/topics/${id(tid)}`, { auth: true })

// action: pin | unpin | close | open | flag | unflag | restore
export const topicAction = (tid, action, body) =>
  request('POST', `/topics/${id(tid)}/${action}`, { body, auth: true })

// ── Replies ───────────────────────────────────────────────────────

export const listReplies = (tid, params) =>
  request('GET', `/topics/${id(tid)}/replies`, { params, auth: 'optional' })

export const createReply = (tid, fields) =>
  request('POST', `/topics/${id(tid)}/replies`, { body: { reply: fields }, auth: true })

export const updateReply = (rid, fields) =>
  request('PATCH', `/replies/${id(rid)}`, { body: { reply: fields }, auth: true })

export const removeReply = (rid) =>
  request('DELETE', `/replies/${id(rid)}`, { auth: true })

// action: flag | unflag | restore
export const replyAction = (rid, action, body) =>
  request('POST', `/replies/${id(rid)}/${action}`, { body, auth: true })

// ── Polls ─────────────────────────────────────────────────────────

export const listPolls = (params) =>
  request('GET', '/polls', { params, auth: 'optional' })

export const getPoll = (pid) =>
  request('GET', `/polls/${id(pid)}`, { auth: 'optional' })

export const createPoll = (fields) =>
  request('POST', '/polls', { body: { poll: fields }, auth: true })

export const updatePoll = (pid, fields) =>
  request('PATCH', `/polls/${id(pid)}`, { body: { poll: fields }, auth: true })

export const removePoll = (pid) =>
  request('DELETE', `/polls/${id(pid)}`, { auth: true })

// body: { option_id } | { option_ids } | { value }
export const votePoll = (pid, body) =>
  request('POST', `/polls/${id(pid)}/vote`, { body, auth: true })

export const retractPollVote = (pid) =>
  request('DELETE', `/polls/${id(pid)}/vote`, { auth: true })

// action: close | flag | unflag | restore
export const pollAction = (pid, action, body) =>
  request('POST', `/polls/${id(pid)}/${action}`, { body, auth: true })

// Returns CSV text. by: option | voter
export const exportPoll = (pid, by) =>
  requestText(`/polls/${id(pid)}/export`, { params: { by } })

// ── Hackathons ────────────────────────────────────────────────────

export const listHackathons = (params) =>
  request('GET', '/hackathons', { params, auth: 'optional' })

export const getHackathon = (hid) =>
  request('GET', `/hackathons/${id(hid)}`, { auth: 'optional' })

export const createHackathon = (fields) =>
  request('POST', '/hackathons', { body: { hackathon: fields }, auth: true })

export const updateHackathon = (hid, fields) =>
  request('PATCH', `/hackathons/${id(hid)}`, { body: { hackathon: fields }, auth: true })

export const removeHackathon = (hid) =>
  request('DELETE', `/hackathons/${id(hid)}`, { auth: true })

// action: publish | unpublish | judges_team | flag | unflag | restore
export const hackathonAction = (hid, action, body) =>
  request('POST', `/hackathons/${id(hid)}/${action}`, { body, auth: true })

// tracks: [{id?, title, description, color}] — the full desired list.
export const setHackathonTracks = (hid, tracks) =>
  request('PATCH', `/hackathons/${id(hid)}/tracks`, { body: { tracks }, auth: true })

export const exportHackathon = (hid) =>
  requestText(`/hackathons/${id(hid)}/export`)

// ── Hackathon projects ────────────────────────────────────────────

export const listHackathonProjects = (params) =>
  request('GET', '/hackathon_projects', { params, auth: 'optional' })

export const getHackathonProject = (pid) =>
  request('GET', `/hackathon_projects/${id(pid)}`, { auth: 'optional' })

export const createHackathonProject = (fields) =>
  request('POST', '/hackathon_projects', { body: { hackathon_project: fields }, auth: true })

export const updateHackathonProject = (pid, fields) =>
  request('PATCH', `/hackathon_projects/${id(pid)}`, { body: { hackathon_project: fields }, auth: true })

export const removeHackathonProject = (pid) =>
  request('DELETE', `/hackathon_projects/${id(pid)}`, { auth: true })

// action: submit | review | award | star | transfer | flag | unflag
export const hackathonProjectAction = (pid, action, body) =>
  request('POST', `/hackathon_projects/${id(pid)}/${action}`, { body, auth: true })

export const unsubmitHackathonProject = (pid) =>
  request('DELETE', `/hackathon_projects/${id(pid)}/submit`, { auth: true })

export const unstarHackathonProject = (pid) =>
  request('DELETE', `/hackathon_projects/${id(pid)}/star`, { auth: true })

export const leaveHackathonProject = (pid) =>
  request('DELETE', `/hackathon_projects/${id(pid)}/join`, { auth: true })

export const addHackathonProjectMember = (pid, userId) =>
  request('POST', `/hackathon_projects/${id(pid)}/members`, { body: { user_id: userId }, auth: true })

export const removeHackathonProjectMember = (pid, userId) =>
  request('DELETE', `/hackathon_projects/${id(pid)}/members/${id(userId)}`, { auth: true })
