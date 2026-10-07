import { readFile } from 'fs/promises'
import { basename, extname } from 'path'
import { request, SolaApiError } from './api.js'
import { requireAuth } from './utils.js'

// Badges, vouchers, remember, OAuth developer portal, Stripe keys,
// WeChat withdrawals and document upload. Kept apart from api.js; the
// transport is shared.

const BASE = process.env.SOLA_API_URL || 'https://api.sola.day'
const enc = encodeURIComponent

// ── Badge classes (index/show/by_user public; create/invites need auth) ──

export const listBadgeClasses = (params) =>
  request('GET', '/badge_classes', { params })

export const getBadgeClass = (id) =>
  request('GET', `/badge_classes/${enc(id)}`)

export const badgeClassesByUser = (handle) =>
  request('GET', '/badge_classes/by_user', { params: { handle } })

export const createBadgeClass = (fields) =>
  request('POST', '/badge_classes', { body: { badge_class: fields }, auth: true })

export const badgeClassInvites = (id) =>
  request('GET', `/badge_classes/${enc(id)}/invites`, { auth: true })

// ── Badges (index/show public) ───────────────────────────────────

export const listBadges = (params) =>
  request('GET', '/badges', { params })

export const getBadge = (id) =>
  request('GET', `/badges/${enc(id)}`)

// display is a top-level param, not nested.
export const updateBadge = (id, display) =>
  request('PATCH', `/badges/${enc(id)}`, { body: { display }, auth: true })

export const transferBadge = (id, target) =>
  request('POST', `/badges/${enc(id)}/transfer`, { body: { target }, auth: true })

export const burnBadge = (id) =>
  request('POST', `/badges/${enc(id)}/burn`, { auth: true })

export const badgeSwapCode = (id) =>
  request('POST', `/badges/${enc(id)}/swap_code`, { auth: true })

export const swapBadge = (id, swapToken) =>
  request('POST', `/badges/${enc(id)}/swap`, { body: { swap_token: swapToken }, auth: true })

// ── Vouchers (index/show public; everything else auth). Bodies are
// top-level params, not nested. ──────────────────────────────────────

export const listVouchers = (params) =>
  request('GET', '/vouchers', { params })

export const getVoucher = (id) =>
  request('GET', `/vouchers/${enc(id)}`)

export const createVoucher = (fields) =>
  request('POST', '/vouchers', { body: fields, auth: true })

// kind: send_badge | send_badge_by_address | send_badge_by_email
export const sendBadge = (kind, fields) =>
  request('POST', `/vouchers/${kind}`, { body: fields, auth: true })

export const getVoucherCode = (id) =>
  request('GET', `/vouchers/${enc(id)}/code`, { auth: true })

export const revokeVoucher = (id) =>
  request('POST', `/vouchers/${enc(id)}/revoke`, { auth: true })

export const useVoucher = (id, fields) =>
  request('POST', `/vouchers/${enc(id)}/use`, { body: fields || {}, auth: true })

export const rejectVoucherBadge = (id) =>
  request('POST', `/vouchers/${enc(id)}/reject_badge`, { auth: true })

// ── Remember (meta/show/related_groups public) ───────────────────

export const rememberMeta = () =>
  request('GET', '/remember/meta')

export const rememberRelatedGroups = (userIds) =>
  request('GET', '/remember/related_groups', { params: { user_ids: userIds.join(',') } })

export const createRemember = (fields) =>
  request('POST', '/remember', { body: fields, auth: true })

export const getRemember = (id) =>
  request('GET', `/remember/${enc(id)}`)

export const joinRemember = (id) =>
  request('POST', `/remember/${enc(id)}/join`, { auth: true })

export const cancelRemember = (id) =>
  request('POST', `/remember/${enc(id)}/cancel`, { auth: true })

export const mintRemember = (id) =>
  request('POST', `/remember/${enc(id)}/mint`, { auth: true })

// ── OAuth developer portal (session JWT). The protocol endpoints
// (authorize/token/userinfo/revoke) are for OAuth clients, not wrapped. ──

export const listOauthApps = () =>
  request('GET', '/oauth/applications', { auth: true })

export const getOauthApp = (id) =>
  request('GET', `/oauth/applications/${enc(id)}`, { auth: true })

// `application` is nested; group_id is a top-level sibling.
export const createOauthApp = (application, groupId) =>
  request('POST', '/oauth/applications', { body: { application, group_id: groupId }, auth: true })

export const updateOauthApp = (id, application) =>
  request('PATCH', `/oauth/applications/${enc(id)}`, { body: { application }, auth: true })

export const deleteOauthApp = (id) =>
  request('DELETE', `/oauth/applications/${enc(id)}`, { auth: true })

export const rotateOauthSecret = (id) =>
  request('POST', `/oauth/applications/${enc(id)}/rotate_secret`, { auth: true })

export const listOauthGrants = () =>
  request('GET', '/oauth/grants', { auth: true })

export const revokeOauthGrant = (id) =>
  request('DELETE', `/oauth/grants/${enc(id)}`, { auth: true })

// Platform admin only (users.admin).
export const adminListOauthApps = (params) =>
  request('GET', '/oauth/admin/applications', { params, auth: true })

export const adminGetOauthApp = (id) =>
  request('GET', `/oauth/admin/applications/${enc(id)}`, { auth: true })

export const adminReviewOauthApp = (id, reviewed) =>
  request('POST', `/oauth/admin/applications/${enc(id)}/review`, {
    body: reviewed === undefined ? {} : { reviewed }, auth: true,
  })

export const adminDisableOauthApp = (id) =>
  request('POST', `/oauth/admin/applications/${enc(id)}/disable`, { auth: true })

// ── Stripe settings (404 unless STRIPE_ENABLED). Own rows only. ──

export const listStripeSettings = () =>
  request('GET', '/stripe_settings', { auth: true })

export const stripeSettingsForEvent = (eventId) =>
  request('GET', '/stripe_settings/for_event', { params: { event_id: eventId }, auth: true })

export const createStripeSetting = (fields) =>
  request('POST', '/stripe_settings', { body: { stripe_setting: fields }, auth: true })

export const updateStripeSetting = (id, fields) =>
  request('PATCH', `/stripe_settings/${enc(id)}`, { body: { stripe_setting: fields }, auth: true })

export const deleteStripeSetting = (id) =>
  request('DELETE', `/stripe_settings/${enc(id)}`, { auth: true })

// ── Withdrawals (404 unless WECHAT_PAY_ENABLED; admin ones need users.admin) ──

export const withdrawalGroups = () =>
  request('GET', '/withdrawals/groups', { auth: true })

export const withdrawalBalance = (groupId) =>
  request('GET', '/withdrawals/balance', { params: { group_id: groupId }, auth: true })

export const listWithdrawals = (groupId) =>
  request('GET', '/withdrawals', { params: { group_id: groupId }, auth: true })

export const createWithdrawal = (fields) =>
  request('POST', '/withdrawals', { body: fields, auth: true })

export const adminListWithdrawals = (params) =>
  request('GET', '/admin/withdrawals', { params, auth: true })

export const adminUpdateWithdrawal = (id, fields) =>
  request('PATCH', `/admin/withdrawals/${enc(id)}`, { body: fields, auth: true })

// ── Upload (document rail; images use `uploadImage` in api.js) ───

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.pdf': 'application/pdf', '.txt': 'text/plain', '.csv': 'text/csv',
  '.zip': 'application/zip', '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

// The server checks the part's content type against an allow-list, so it is
// derived from the extension (or passed explicitly) rather than left generic.
export async function uploadFile(filePath, contentType) {
  const token = await requireAuth()
  const data = await readFile(filePath)
  const type = contentType || MIME[extname(filePath).toLowerCase()] || 'application/octet-stream'

  const formData = new FormData()
  formData.append('file', new Blob([data], { type }), basename(filePath))

  const res = await fetch(`${BASE}/api/v1/upload/file`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new SolaApiError(json.error || `Upload failed (${res.status})`, res.status)
  return json
}
