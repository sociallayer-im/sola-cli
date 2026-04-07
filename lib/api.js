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

export const sendEmail = (email) =>
  request('POST', '/service/send_email', { email, context: 'email-signin' })

export const signinWithEmail = (email, code) =>
  request('POST', '/profile/signin_with_email', { email, code })

export const createProfile = (handle) =>
  request('POST', '/profile/create', { handle }, true)

export const getProfileByEmail = (email) =>
  request('GET', '/profile/get_by_email', { email })

export const getProfileByHandle = (handle) =>
  request('GET', '/profile/get_by_handle', { handle })

export const getEvent = (id) =>
  request('GET', '/event/get', { id })

export const listEvents = (params) =>
  request('GET', '/event/list', params)

export const createEvent = (params) =>
  request('POST', '/event/create', params, true)

export const updateEvent = (params) =>
  request('POST', '/event/update', params, true)

export const getVenue = (id) =>
  request('GET', '/venue/get', { id })

export const listVenues = (group_id) =>
  request('GET', '/venue/list', { group_id }, true)

export const createVenue = (group_id, venueFields) =>
  request('POST', '/venue/create', { group_id, venue: venueFields }, true)

export const updateVenue = (id, venueFields) =>
  request('POST', '/venue/update', { id, venue: venueFields }, true)

export const getGroup = (group_id) =>
  request('GET', '/group/get', { group_id })

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
