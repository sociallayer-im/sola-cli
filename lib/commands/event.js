import { getEvent, listEvents, createEvent, updateEvent } from '../api.js'
import { handleError } from '../utils.js'

export const command = 'event <subcommand>'
export const describe = 'Get, list, create, and update events. Create/update require auth.'

export function builder(yargs) {
  return yargs
    .command(
      'get',
      'Fetch a single event by numeric ID. Returns full event details including title, times, location, participants, tickets, and roles.',
      (y) => y
        .option('id', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric event ID (e.g. 42)',
        })
        .example('$0 event get --id 42', 'Get event with ID 42'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getEvent(argv.id), null, 2))
      })
    )
    .command(
      'list',
      'List events for a group. Supports filtering by time window, collection preset, tags, and pagination.',
      (y) => y
        .option('group', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric group ID to list events for (e.g. 10)',
        })
        .option('collection', {
          type: 'string',
          describe: 'Preset filter. One of: upcoming, past, today, pinned, currentweek',
        })
        .option('tags', {
          type: 'string',
          describe: 'Comma-separated tag filter — returns events matching ANY tag (e.g. "web3,defi")',
        })
        .option('start-date', {
          type: 'string',
          describe: 'ISO date lower bound, inclusive (e.g. 2025-06-01). Interpreted in the group\'s timezone.',
        })
        .option('end-date', {
          type: 'string',
          describe: 'ISO date upper bound, inclusive (e.g. 2025-06-30). Interpreted in the group\'s timezone.',
        })
        .option('limit', {
          type: 'number',
          describe: 'Max events to return per page (default 40, max 1000)',
        })
        .option('page', {
          type: 'number',
          describe: 'Page number for pagination (default 1)',
        })
        .example('$0 event list --group 10 --collection upcoming --limit 20', 'Next 20 upcoming events')
        .example('$0 event list --group 10 --tags "web3,defi" --start-date 2025-06-01', 'Tagged events from June'),
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
      'Create a new event in a group. Requires auth. Returns the created event object.',
      (y) => y
        .option('group', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric ID of the group that will host this event (e.g. 10)',
        })
        .option('title', {
          type: 'string',
          demandOption: true,
          describe: 'Event title (e.g. "DeFi Workshop #3")',
        })
        .option('start', {
          type: 'string',
          demandOption: true,
          describe: 'ISO 8601 start datetime (e.g. "2025-06-15T09:00:00"). Use --timezone to set context.',
        })
        .option('end', {
          type: 'string',
          demandOption: true,
          describe: 'ISO 8601 end datetime (e.g. "2025-06-15T11:00:00"). Must be after --start.',
        })
        .option('timezone', {
          type: 'string',
          describe: 'IANA timezone for the event (e.g. Asia/Singapore, America/New_York). Defaults to group timezone.',
        })
        .option('location', {
          type: 'string',
          describe: 'Human-readable location string (e.g. "Raffles Place, Singapore")',
        })
        .option('content', {
          type: 'string',
          describe: 'Event description. Markdown supported.',
        })
        .option('cover-url', {
          type: 'string',
          describe: 'URL of the event cover image (e.g. https://cdn.example.com/cover.jpg)',
        })
        .option('tags', {
          type: 'string',
          describe: 'Comma-separated tags to categorize the event (e.g. "web3,workshop,beginner")',
        })
        .option('max-participant', {
          type: 'number',
          describe: 'Max number of attendees allowed. Omit for unlimited.',
        })
        .option('require-approval', {
          type: 'boolean',
          describe: 'If true, RSVPs require organizer approval before confirmed (default false)',
        })
        .option('meeting-url', {
          type: 'string',
          describe: 'Virtual meeting link shown to confirmed attendees (e.g. https://meet.google.com/abc)',
        })
        .option('display', {
          type: 'string',
          describe: 'Visibility setting. One of: public, private, hidden, normal (default: normal)',
        })
        .example('$0 event create --group 10 --title "Workshop" --start "2025-06-15T09:00:00" --end "2025-06-15T11:00:00" --timezone Asia/Singapore', 'Create a basic event'),
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
      'Update fields on an existing event. Only the fields you pass are changed. Requires auth and event ownership or group manager role.',
      (y) => y
        .option('id', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric ID of the event to update (e.g. 42)',
        })
        .option('title',    { type: 'string', describe: 'New event title' })
        .option('start',    { type: 'string', describe: 'New ISO 8601 start datetime (e.g. "2025-06-15T10:00:00")' })
        .option('end',      { type: 'string', describe: 'New ISO 8601 end datetime (e.g. "2025-06-15T12:00:00")' })
        .option('timezone', { type: 'string', describe: 'New IANA timezone (e.g. Asia/Tokyo)' })
        .option('location', { type: 'string', describe: 'New location string' })
        .option('content',  { type: 'string', describe: 'New event description. Markdown supported.' })
        .option('cover-url',{ type: 'string', describe: 'New cover image URL' })
        .option('tags',     { type: 'string', describe: 'Comma-separated tags, replaces existing tags' })
        .example('$0 event update --id 42 --title "Renamed Event" --location "Online"', 'Update title and location'),
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
