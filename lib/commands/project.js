import {
  acceptProjectInvite, addProjectComment, createProject, getProject, hideProject,
  inviteProjectMember, listProjectComments, listProjects, removeProjectComment,
  removeProjectMember, updateProject,
} from '../api-projects.js'
import { uploadImage } from '../api.js'
import { handleError, parseJsonOption } from '../utils.js'

export const command = 'project <subcommand>'
export const describe = 'Create and manage community projects, participants, and comments'

const groupOption = (y) => y.option('group', { type: 'string', demandOption: true, describe: 'Community group ID or handle' })
const projectOptions = (y) => groupOption(y).option('id', { type: 'string', demandOption: true, describe: 'Project ID' })
const pageOption = (y) => y.option('page', { type: 'number', default: 1, describe: 'Page number' })
const memberOptions = (y) => projectOptions(y).option('member', { type: 'string', demandOption: true, describe: 'Project membership ID from project get or invite' })

const fieldsOptions = (y) => y
  .option('title', { type: 'string' })
  .option('tagline', { type: 'string' })
  .option('content', { type: 'string', describe: 'Project description' })
  .option('website-url', { type: 'string' })
  .option('status', { choices: ['draft', 'published'] })
  .option('icon-url', { type: 'string' })
  .option('cover-url', { type: 'string' })
  .option('icon-file', { type: 'string', conflicts: 'icon-url', describe: 'Upload a local icon' })
  .option('cover-file', { type: 'string', conflicts: 'cover-url', describe: 'Upload a local cover' })
  .option('gallery-json', { type: 'string', describe: 'Ordered JSON array of {url, caption}; [] clears the gallery' })
  .option('product-image', { type: 'array', string: true, describe: 'Upload local product images in order; replaces the gallery on update' })

async function projectFields(argv) {
  const suppliedGallery = parseJsonOption(argv['gallery-json'], 'gallery-json')
  if (suppliedGallery !== undefined && !Array.isArray(suppliedGallery)) {
    throw new Error('--gallery-json must be a JSON array')
  }
  const files = argv['product-image'] || []
  if ((suppliedGallery?.length || 0) + files.length > 8) {
    throw new Error('A project can have at most eight product images')
  }
  let gallery = suppliedGallery
  if (files.length) {
    gallery = [...(suppliedGallery || [])]
    for (const file of files) {
      gallery.push({ url: (await uploadImage(file)).url })
    }
  }
  return {
    title: argv.title,
    tagline: argv.tagline,
    content: argv.content,
    website_url: argv['website-url'],
    status: argv.status,
    icon_url: argv['icon-file'] ? (await uploadImage(argv['icon-file'])).url : argv['icon-url'],
    cover_url: argv['cover-file'] ? (await uploadImage(argv['cover-file'])).url : argv['cover-url'],
    gallery,
  }
}

const output = (run) => handleError(async (argv) => {
  console.log(JSON.stringify((await run(argv)) ?? { result: 'ok' }, null, 2))
})

export function builder(yargs) {
  return yargs
    .command('list', 'List community projects', (y) => pageOption(groupOption(y)),
      output(({ group, page }) => listProjects(group, page)))
    .command('get', 'Get a project and its participants', projectOptions,
      output(({ group, id }) => getProject(group, id)))
    .command('create', 'Create a project (draft by default)', (y) => fieldsOptions(groupOption(y)).demandOption('title'),
      output(async (argv) => createProject(argv.group, await projectFields(argv))))
    .command('update', 'Update a project or change its publication status', (y) => fieldsOptions(projectOptions(y)),
      output(async (argv) => updateProject(argv.group, argv.id, await projectFields(argv))))
    .command('hide', 'Hide a project as a community administrator', projectOptions,
      output(({ group, id }) => hideProject(group, id)))
    .command('invite', 'Invite a participant by Sola username', (y) => projectOptions(y)
      .option('username', { type: 'string', demandOption: true })
      .option('role', { type: 'string', describe: 'Optional project role' }),
    output(({ group, id, username, role }) => inviteProjectMember(group, id, username, role)))
    .command('accept-invite', 'Accept your invitation to a project', memberOptions,
      output(({ group, id, member }) => acceptProjectInvite(group, id, member)))
    .command('remove-member', 'Remove a participant or leave the project', memberOptions,
      output(({ group, id, member }) => removeProjectMember(group, id, member)))
    .command('comments', 'List project comments', (y) => pageOption(projectOptions(y)),
      output(({ group, id, page }) => listProjectComments(group, id, page)))
    .command('comment', 'Post a project comment as a community member', (y) => projectOptions(y)
      .option('content', { type: 'string', demandOption: true }),
    output(({ group, id, content }) => addProjectComment(group, id, content)))
    .command('remove-comment', 'Delete your comment or moderate as a community administrator', (y) => projectOptions(y)
      .option('comment', { type: 'string', demandOption: true, describe: 'Comment ID' }),
    output(({ group, id, comment }) => removeProjectComment(group, id, comment)))
    .demandCommand(1, 'Specify a project command')
}
