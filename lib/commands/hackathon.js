import {
  listHackathons, getHackathon, createHackathon, updateHackathon, removeHackathon,
  hackathonAction, setHackathonTracks, exportHackathon,
} from '../api-community.js'
import { handleError, parseJsonOption } from '../utils.js'

export const command = 'hackathon <subcommand>'
export const describe = 'Group hackathons. Requires HACKATHON_ENABLED on the server and hackathon enabled on the group, otherwise every call 404s. Reads are public (token optional, drafts hidden from non-managers); writes require auth. Registration is an ordinary Event linked via --event.'

const idOpt = (y) => y.option('id', { type: 'string', demandOption: true, describe: 'Hackathon id' })
const out = (v) => console.log(JSON.stringify(v, null, 2))

const fieldOpts = (y) => y
  .option('event', { type: 'string', describe: 'Registration event id (participants of this event are eligible)' })
  .option('tagline', { type: 'string', describe: 'One-line tagline' })
  .option('content', { type: 'string', describe: 'Description (markdown)' })
  .option('cover-url', { type: 'string', describe: 'Cover image URL' })
  .option('start-at', { type: 'string', describe: 'ISO datetime' })
  .option('end-at', { type: 'string', describe: 'ISO datetime' })
  .option('submit-open-at', { type: 'string', describe: 'ISO datetime submissions open' })
  .option('submit-close-at', { type: 'string', describe: 'ISO datetime submissions close' })
  .option('projects-visibility', { type: 'string', choices: ['always', 'after_submit', 'after_review'], describe: 'When submitted projects become public' })
  .option('can-submit-project', { type: 'string', choices: ['participant', 'member', 'everyone'], describe: 'Who may create a project' })
  .option('tracks', { type: 'string', describe: 'JSON array [{"id"?,"title","description","color"}] — the full desired track list' })

const fieldsFrom = (argv) => ({
  event_id: argv.event,
  tagline: argv.tagline,
  content: argv.content,
  cover_url: argv['cover-url'],
  start_at: argv['start-at'],
  end_at: argv['end-at'],
  submit_open_at: argv['submit-open-at'],
  submit_close_at: argv['submit-close-at'],
  projects_visibility: argv['projects-visibility'],
  can_submit_project: argv['can-submit-project'],
  tracks: parseJsonOption(argv.tracks, 'tracks'),
})

export function builder(yargs) {
  return yargs
    .command(
      'list',
      'List hackathons in a group, newest first.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID or handle' })
        .option('status', { type: 'string', choices: ['draft', 'published'], describe: 'Filter by status' })
        .option('page', { type: 'number', describe: 'Page number' })
        .option('limit', { type: 'number', describe: 'Page size (default 20, max 500)' }),
      handleError(async (argv) => {
        out(await listHackathons({ group_id: argv.group, status: argv.status, page: argv.page, limit: argv.limit }))
      })
    )
    .command('get', 'Fetch one hackathon with tracks and permissions.', (y) => idOpt(y),
      handleError(async (argv) => out(await getHackathon(argv.id))))
    .command(
      'create',
      'Create a hackathon (starts as draft). Requires auth and the group\'s can_create_hackathon tier (default manager).',
      (y) => fieldOpts(y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID or handle' })
        .option('title', { type: 'string', demandOption: true, describe: 'Title' }))
        .example('$0 hackathon create --group solaverse --title "Spring Hack"', 'Create a draft'),
      handleError(async (argv) => {
        out(await createHackathon({ group_id: argv.group, title: argv.title, ...fieldsFrom(argv) }))
      })
    )
    .command(
      'update',
      'Update a hackathon. Passing --tracks replaces the whole track list. Requires auth.',
      (y) => fieldOpts(idOpt(y).option('title', { type: 'string', describe: 'New title' })),
      handleError(async (argv) => {
        out(await updateHackathon(argv.id, { title: argv.title, ...fieldsFrom(argv) }))
      })
    )
    .command('remove', 'Soft-delete a hackathon. Reversible with `hackathon restore`.', (y) => idOpt(y),
      handleError(async (argv) => out(await removeHackathon(argv.id))))
    .command('publish', 'Publish a draft hackathon.', (y) => idOpt(y),
      handleError(async (argv) => out(await hackathonAction(argv.id, 'publish'))))
    .command('unpublish', 'Return a hackathon to draft.', (y) => idOpt(y),
      handleError(async (argv) => out(await hackathonAction(argv.id, 'unpublish'))))
    .command(
      'tracks',
      'Replace the hackathon\'s tracks. Tracks have server-minted ids: pass an existing id to keep/rename a track, omit it to create one.',
      (y) => idOpt(y)
        .option('tracks', { type: 'string', demandOption: true, describe: 'JSON array [{"id"?,"title","description","color"}]' })
        .example('$0 hackathon tracks --id abc --tracks \'[{"title":"AI","color":"#00f"}]\'', 'Set tracks'),
      handleError(async (argv) => {
        out(await setHackathonTracks(argv.id, parseJsonOption(argv.tracks, 'tracks')))
      })
    )
    .command(
      'judges-team',
      'Snapshot the registration event\'s judges into a private group team (idempotent; re-running diffs the roster). Returns {team, added, removed, skipped}. Needs a linked registration event.',
      (y) => idOpt(y),
      handleError(async (argv) => out(await hackathonAction(argv.id, 'judges_team')))
    )
    .command('flag', 'Flag (hide) a hackathon for review.',
      (y) => idOpt(y).option('reason', { type: 'string', describe: 'Reason' }),
      handleError(async (argv) => out(await hackathonAction(argv.id, 'flag', { reason: argv.reason }))))
    .command('unflag', 'Remove a hackathon flag.', (y) => idOpt(y),
      handleError(async (argv) => out(await hackathonAction(argv.id, 'unflag'))))
    .command('restore', 'Restore a soft-deleted hackathon.', (y) => idOpt(y),
      handleError(async (argv) => out(await hackathonAction(argv.id, 'restore'))))
    .command('export', 'Print the projects CSV to stdout (organisers only).', (y) => idOpt(y),
      handleError(async (argv) => { process.stdout.write(await exportHackathon(argv.id)) }))
}
