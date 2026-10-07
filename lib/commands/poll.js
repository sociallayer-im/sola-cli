import {
  listPolls, getPoll, createPoll, updatePoll, removePoll,
  votePoll, retractPollVote, pollAction, exportPoll,
} from '../api-community.js'
import { handleError, splitList, parseJsonOption } from '../utils.js'

export const command = 'poll <subcommand>'
export const describe = 'Group polls. Requires POLL_ENABLED on the server and poll enabled on the group, otherwise every call 404s. Reads are public (token optional, visibility permitting); writes require auth.'

const idOpt = (y) => y.option('id', { type: 'string', demandOption: true, describe: 'Poll id' })
const out = (v) => console.log(JSON.stringify(v, null, 2))

// --options takes a JSON array ([{id?, title}] or plain strings) or a comma list.
function parseOptions(v) {
  if (v === undefined) return undefined
  const trimmed = v.trim()
  if (trimmed.startsWith('[')) return parseJsonOption(trimmed, 'options')
  return splitList(v).map((title) => ({ title }))
}

const pollFields = (y) => y
  .option('content', { type: 'string', describe: 'Description' })
  .option('poll-type', { type: 'string', choices: ['single', 'multiple', 'number'], describe: 'Poll type' })
  .option('options', { type: 'string', describe: 'Choices: comma list, or JSON [{"id"?:..,"title":..}]. 2+ required unless type=number. On update this is the FULL desired list (missing ids are deleted with their votes).' })
  .option('min-value', { type: 'number', describe: 'number polls: minimum' })
  .option('max-value', { type: 'number', describe: 'number polls: maximum' })
  .option('visibility', { type: 'string', choices: ['public', 'participants', 'secret'], describe: 'Who sees individual choices (frozen after first vote)' })
  .option('results', { type: 'string', choices: ['always', 'on_vote', 'on_close', 'manager_only'], describe: 'When results are shown' })
  .option('close-at', { type: 'string', describe: 'ISO datetime at which voting closes' })
  .option('eligible-group-ids', { type: 'string', describe: 'Comma-separated group TSIDs whose members may vote' })
  .option('eligible-team-ids', { type: 'string', describe: 'Comma-separated team TSIDs whose members may vote' })

const fieldsFrom = (argv) => ({
  content: argv.content,
  poll_type: argv['poll-type'],
  options: parseOptions(argv.options),
  min_value: argv['min-value'],
  max_value: argv['max-value'],
  visibility: argv.visibility,
  results: argv.results,
  close_at: argv['close-at'],
  eligible_group_ids: splitList(argv['eligible-group-ids']),
  eligible_team_ids: splitList(argv['eligible-team-ids']),
})

export function builder(yargs) {
  return yargs
    .command(
      'list',
      'List polls in a group, newest first.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID or handle' })
        .option('status', { type: 'string', choices: ['open', 'closed'], describe: 'Filter by state' })
        .option('page', { type: 'number', describe: 'Page number' })
        .option('limit', { type: 'number', describe: 'Page size (default 20, max 500)' }),
      handleError(async (argv) => {
        out(await listPolls({ group_id: argv.group, status: argv.status, page: argv.page, limit: argv.limit }))
      })
    )
    .command('get', 'Fetch one poll with options and (if permitted) results.', (y) => idOpt(y),
      handleError(async (argv) => out(await getPoll(argv.id))))
    .command(
      'create',
      'Create a poll in a group. Requires auth and the group\'s can_create_poll tier.',
      (y) => pollFields(y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID or handle' })
        .option('title', { type: 'string', demandOption: true, describe: 'Question' }))
        .example('$0 poll create --group solaverse --title "Lunch?" --options "Pizza,Sushi"', 'Single-choice poll'),
      handleError(async (argv) => {
        out(await createPoll({ group_id: argv.group, title: argv.title, ...fieldsFrom(argv) }))
      })
    )
    .command(
      'update',
      'Update a poll (author or manager). After the first vote, title/type/range/options/eligibility are editable only within a short grace window and visibility is frozen.',
      (y) => pollFields(idOpt(y).option('title', { type: 'string', describe: 'New question' })),
      handleError(async (argv) => {
        out(await updatePoll(argv.id, { title: argv.title, ...fieldsFrom(argv) }))
      })
    )
    .command('remove', 'Soft-delete a poll. Reversible with `poll restore`.', (y) => idOpt(y),
      handleError(async (argv) => out(await removePoll(argv.id))))
    .command(
      'vote',
      'Cast or replace your vote. single: --option-id; multiple: --option-ids (the full set); number: --value.',
      (y) => idOpt(y)
        .option('option-id', { type: 'string', describe: 'Option id (single-choice)' })
        .option('option-ids', { type: 'string', describe: 'Comma-separated option ids (multiple-choice)' })
        .option('value', { type: 'number', describe: 'Numeric answer (number poll)' }),
      handleError(async (argv) => {
        out(await votePoll(argv.id, {
          option_id: argv['option-id'],
          option_ids: splitList(argv['option-ids']),
          value: argv.value,
        }))
      })
    )
    .command('retract', 'Withdraw your vote.', (y) => idOpt(y),
      handleError(async (argv) => out(await retractPollVote(argv.id))))
    .command('close', 'Close a poll now (author or manager).', (y) => idOpt(y),
      handleError(async (argv) => out(await pollAction(argv.id, 'close'))))
    .command('flag', 'Flag (hide) a poll for review.',
      (y) => idOpt(y).option('reason', { type: 'string', describe: 'Reason' }),
      handleError(async (argv) => out(await pollAction(argv.id, 'flag', { reason: argv.reason }))))
    .command('unflag', 'Remove a poll flag.', (y) => idOpt(y),
      handleError(async (argv) => out(await pollAction(argv.id, 'unflag'))))
    .command('restore', 'Restore a soft-deleted poll.', (y) => idOpt(y),
      handleError(async (argv) => out(await pollAction(argv.id, 'restore'))))
    .command(
      'export',
      'Print results as CSV to stdout (author/manager). --by voter is refused (403) when the poll hides individual choices.',
      (y) => idOpt(y).option('by', { type: 'string', choices: ['option', 'voter'], default: 'option', describe: 'Aggregate by option or list voters' }),
      handleError(async (argv) => {
        process.stdout.write(await exportPoll(argv.id, argv.by))
      })
    )
}
