import { getEvent, listEvents, createEvent, updateEvent } from '../api.js'
import { handleError } from '../utils.js'

export const command = 'event <subcommand>'
export const describe = 'Event commands'

export function builder(yargs) {
  return yargs
    .command(
      'get',
      'Get a single event by ID',
      (y) => y.option('id', { type: 'number', demandOption: true }),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getEvent(argv.id), null, 2))
      })
    )
    .command(
      'list',
      'List events for a group',
      (y) => y
        .option('group',      { type: 'number', demandOption: true, describe: 'Group ID' })
        .option('collection', { type: 'string',  describe: 'Filter: upcoming, past, etc.' })
        .option('tags',       { type: 'string',  describe: 'Comma-separated tags' })
        .option('start-date', { type: 'string',  describe: 'ISO start date filter' })
        .option('end-date',   { type: 'string',  describe: 'ISO end date filter' })
        .option('limit',      { type: 'number',  describe: 'Results per page' })
        .option('page',       { type: 'number',  describe: 'Page number' }),
      handleError(async (argv) => {
        const params = {
          group_id:   argv.group,
          collection: argv.collection,
          tags:       argv.tags,
          start_date: argv['start-date'],
          end_date:   argv['end-date'],
          limit:      argv.limit,
          page:       argv.page,
        }
        console.log(JSON.stringify(await listEvents(params), null, 2))
      })
    )
    .command(
      'create',
      'Create a new event',
      (y) => y
        .option('group',    { type: 'number', demandOption: true })
        .option('title',    { type: 'string', demandOption: true })
        .option('start',    { type: 'string', demandOption: true, describe: 'ISO start time' })
        .option('end',      { type: 'string', demandOption: true, describe: 'ISO end time' })
        .option('timezone', { type: 'string' })
        .option('location', { type: 'string' })
        .option('content',  { type: 'string', describe: 'Event description' })
        .option('cover-url',{ type: 'string' })
        .option('tags',     { type: 'string' })
        .option('max-participant',   { type: 'number' })
        .option('require-approval',  { type: 'boolean' })
        .option('meeting-url',       { type: 'string' })
        .option('display',           { type: 'string' }),
      handleError(async (argv) => {
        const params = {
          group_id:         argv.group,
          title:            argv.title,
          start_time:       argv.start,
          end_time:         argv.end,
          timezone:         argv.timezone,
          location:         argv.location,
          content:          argv.content,
          cover_url:        argv['cover-url'],
          tags:             argv.tags,
          max_participant:  argv['max-participant'],
          require_approval: argv['require-approval'],
          meeting_url:      argv['meeting-url'],
          display:          argv.display,
        }
        console.log(JSON.stringify(await createEvent(params), null, 2))
      })
    )
    .command(
      'update',
      'Update an event',
      (y) => y
        .option('id',       { type: 'number', demandOption: true })
        .option('title',    { type: 'string' })
        .option('start',    { type: 'string' })
        .option('end',      { type: 'string' })
        .option('timezone', { type: 'string' })
        .option('location', { type: 'string' })
        .option('content',  { type: 'string' })
        .option('cover-url',{ type: 'string' })
        .option('tags',     { type: 'string' }),
      handleError(async (argv) => {
        const params = {
          id:         argv.id,
          title:      argv.title,
          start_time: argv.start,
          end_time:   argv.end,
          timezone:   argv.timezone,
          location:   argv.location,
          content:    argv.content,
          cover_url:  argv['cover-url'],
          tags:       argv.tags,
        }
        console.log(JSON.stringify(await updateEvent(params), null, 2))
      })
    )
}

export const handler = () => {}
