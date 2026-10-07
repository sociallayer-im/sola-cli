import {
  listHackathonProjects, getHackathonProject, createHackathonProject, updateHackathonProject,
  removeHackathonProject, hackathonProjectAction, unsubmitHackathonProject,
  unstarHackathonProject, leaveHackathonProject, addHackathonProjectMember,
  removeHackathonProjectMember,
} from '../api-community.js'
import { handleError, splitList } from '../utils.js'

export const command = 'hackathon-project <subcommand>'
export const describe = 'Hackathon projects (a project is its team). Requires HACKATHON_ENABLED on the server and hackathon enabled on the group, otherwise every call 404s. Reads are public (token optional, subject to the hackathon\'s projects-visibility); writes require auth.'

const idOpt = (y) => y.option('id', { type: 'string', demandOption: true, describe: 'Project id' })
const out = (v) => console.log(JSON.stringify(v, null, 2))

const fieldOpts = (y) => y
  .option('track-id', { type: 'string', describe: 'Track id (from the hackathon\'s tracks)' })
  .option('tagline', { type: 'string', describe: 'One-line tagline' })
  .option('content', { type: 'string', describe: 'Description (markdown)' })
  .option('cover-url', { type: 'string', describe: 'Cover image URL' })
  .option('repo-url', { type: 'string', describe: 'Repository URL' })
  .option('demo-url', { type: 'string', describe: 'Demo URL' })
  .option('video-url', { type: 'string', describe: 'Video URL' })
  .option('recruiting', { type: 'boolean', describe: 'Looking for teammates' })
  .option('tech', { type: 'string', describe: 'Comma-separated tech stack' })
  .option('seeking', { type: 'string', describe: 'Comma-separated roles being sought' })

const fieldsFrom = (argv) => ({
  track_id: argv['track-id'],
  tagline: argv.tagline,
  content: argv.content,
  cover_url: argv['cover-url'],
  repo_url: argv['repo-url'],
  demo_url: argv['demo-url'],
  video_url: argv['video-url'],
  recruiting: argv.recruiting,
  tech: splitList(argv.tech),
  seeking: splitList(argv.seeking),
})

export function builder(yargs) {
  return yargs
    .command(
      'list',
      'List projects of a hackathon.',
      (y) => y
        .option('hackathon', { type: 'string', demandOption: true, describe: 'Hackathon id' })
        .option('track-id', { type: 'string', describe: 'Filter by track id' })
        .option('recruiting', { type: 'boolean', describe: 'Only projects looking for teammates (includes recruiting drafts)' })
        .option('status', { type: 'string', choices: ['draft', 'submitted', 'approved', 'rejected'], describe: 'Filter by state' })
        .option('sort', { type: 'string', choices: ['stars', 'newest'], describe: 'Sort order (default newest)' })
        .option('page', { type: 'number', describe: 'Page number' })
        .option('limit', { type: 'number', describe: 'Page size (default 20, max 500)' }),
      handleError(async (argv) => {
        out(await listHackathonProjects({
          hackathon_id: argv.hackathon,
          track_id: argv['track-id'],
          recruiting: argv.recruiting ? 'true' : undefined,
          status: argv.status,
          sort: argv.sort,
          page: argv.page,
          limit: argv.limit,
        }))
      })
    )
    .command('get', 'Fetch one project.', (y) => idOpt(y),
      handleError(async (argv) => out(await getHackathonProject(argv.id))))
    .command(
      'create',
      'Create a draft project; you become its owner. Requires auth and eligibility per the hackathon\'s can-submit-project; one project per person per hackathon.',
      (y) => fieldOpts(y
        .option('hackathon', { type: 'string', demandOption: true, describe: 'Hackathon id' })
        .option('title', { type: 'string', demandOption: true, describe: 'Project title' })),
      handleError(async (argv) => {
        out(await createHackathonProject({ hackathon_id: argv.hackathon, title: argv.title, ...fieldsFrom(argv) }))
      })
    )
    .command('update', 'Update a project (owner/members/manager per policy).',
      (y) => fieldOpts(idOpt(y).option('title', { type: 'string', describe: 'New title' })),
      handleError(async (argv) => out(await updateHackathonProject(argv.id, { title: argv.title, ...fieldsFrom(argv) }))))
    .command('remove', 'Hard-delete a DRAFT project (irreversible; submitted projects must be unsubmitted first).', (y) => idOpt(y),
      handleError(async (argv) => out(await removeHackathonProject(argv.id))))
    .command('submit', 'Submit the project (owner only, while submissions are open). Locks membership.', (y) => idOpt(y),
      handleError(async (argv) => out(await hackathonProjectAction(argv.id, 'submit'))))
    .command('unsubmit', 'Withdraw a submitted project back to draft.', (y) => idOpt(y),
      handleError(async (argv) => out(await unsubmitHackathonProject(argv.id))))
    .command(
      'review',
      'Approve or reject a submitted project (organisers).',
      (y) => idOpt(y)
        .option('decision', { type: 'string', demandOption: true, choices: ['approve', 'reject'], describe: 'Decision' })
        .option('note', { type: 'string', describe: 'Reviewer note' }),
      handleError(async (argv) => out(await hackathonProjectAction(argv.id, 'review', { decision: argv.decision, note: argv.note })))
    )
    .command(
      'award',
      'Set (or clear, with --clear) a project\'s award label (organisers).',
      (y) => idOpt(y)
        .option('award', { type: 'string', describe: 'Award text, e.g. "Best idea"' })
        .option('clear', { type: 'boolean', describe: 'Remove the award' })
        .check((a) => a.award || a.clear || (() => { throw new Error('Pass --award <text> or --clear') })()),
      handleError(async (argv) => out(await hackathonProjectAction(argv.id, 'award', { award: argv.clear ? null : argv.award })))
    )
    .command('star', 'Star a project.', (y) => idOpt(y),
      handleError(async (argv) => out(await hackathonProjectAction(argv.id, 'star'))))
    .command('unstar', 'Remove your star.', (y) => idOpt(y),
      handleError(async (argv) => out(await unstarHackathonProject(argv.id))))
    .command('leave', 'Leave a project you are a member of.', (y) => idOpt(y),
      handleError(async (argv) => out(await leaveHackathonProject(argv.id))))
    .command(
      'add-member',
      'Add a teammate (owner only; no self-join; not after submission). The user must be eligible for the hackathon.',
      (y) => idOpt(y).option('user', { type: 'string', demandOption: true, describe: 'User TSID' }),
      handleError(async (argv) => out(await addHackathonProjectMember(argv.id, argv.user)))
    )
    .command(
      'remove-member',
      'Remove a teammate (owner only; the owner themself cannot be removed — transfer first).',
      (y) => idOpt(y).option('user', { type: 'string', demandOption: true, describe: 'User TSID' }),
      handleError(async (argv) => out(await removeHackathonProjectMember(argv.id, argv.user)))
    )
    .command(
      'transfer',
      'Transfer ownership to an existing member (owner only).',
      (y) => idOpt(y).option('user', { type: 'string', demandOption: true, describe: 'User TSID of the new owner' }),
      handleError(async (argv) => out(await hackathonProjectAction(argv.id, 'transfer', { user_id: argv.user })))
    )
    .command('flag', 'Flag (hide) a project for review.',
      (y) => idOpt(y).option('reason', { type: 'string', describe: 'Reason' }),
      handleError(async (argv) => out(await hackathonProjectAction(argv.id, 'flag', { reason: argv.reason }))))
    .command('unflag', 'Remove a project flag.', (y) => idOpt(y),
      handleError(async (argv) => out(await hackathonProjectAction(argv.id, 'unflag'))))
}
