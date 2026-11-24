import { request } from './api.js'

const collection = (group) => `/groups/${encodeURIComponent(group)}/community_projects`
const project = (group, id) => `${collection(group)}/${encodeURIComponent(id)}`

export const listProjects = (group, page) =>
  request('GET', collection(group), { params: { page }, auth: 'optional' })

export const getProject = (group, id) =>
  request('GET', project(group, id), { auth: 'optional' })

export const createProject = (group, fields) =>
  request('POST', collection(group), { body: { project: fields }, auth: true })

export const updateProject = (group, id, fields) =>
  request('PATCH', project(group, id), { body: { project: fields }, auth: true })

export const hideProject = (group, id) =>
  request('POST', `${project(group, id)}/hide`, { auth: true })

export const inviteProjectMember = (group, id, username, role) =>
  request('POST', `${project(group, id)}/invite`, { body: { username, role }, auth: true })

export const acceptProjectInvite = (group, id, member) =>
  request('POST', `${project(group, id)}/members/${encodeURIComponent(member)}/accept`, { auth: true })

export const removeProjectMember = (group, id, member) =>
  request('DELETE', `${project(group, id)}/members/${encodeURIComponent(member)}`, { auth: true })

export const listProjectComments = (group, id, page) =>
  request('GET', `${project(group, id)}/comments`, { params: { page }, auth: 'optional' })

export const addProjectComment = (group, id, content) =>
  request('POST', `${project(group, id)}/comments`, { body: { content }, auth: true })

export const removeProjectComment = (group, id, comment) =>
  request('DELETE', `${project(group, id)}/comments/${encodeURIComponent(comment)}`, { auth: true })
