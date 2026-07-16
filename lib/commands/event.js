import {
  getEvent, listEvents, createEvent, updateEvent,
  discoverEvents, myEvents, joinEvent, cancelEvent, unpublishEvent,
  approveParticipant, rejectParticipant, removeParticipant,
} from '../api.js'
import { handleError } from '../utils.js'

export const command = 'event <subcommand>'
export const describe = 'Get, list, create, update events and manage participation. Write actions require auth.'

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
        .option('ticket-title', {
          type: 'string',
          describe: 'Title for a single ticket type to create with this event (e.g. "General Admission"). Omit for no tickets.',
        })
        .option('ticket-quantity', {
          type: 'number',
          describe: 'Number of tickets available. Omit for unlimited.',
        })
        .option('ticket-status', {
          type: 'string',
          describe: 'Ticket status: normal, nosale, hidden, inactive (default: normal)',
        })
        .option('ticket-type', {
          type: 'string',
          describe: 'Ticket type: event or group (default: event)',
        })
        .option('tickets-json', {
          type: 'string',
          describe: 'Full tickets_attributes as a JSON array for multiple tickets or paid tickets with payment methods. Overrides --ticket-* flags.',
        })
        .example('$0 event create --group 10 --title "Workshop" --start "2025-06-15T09:00:00" --end "2025-06-15T11:00:00" --timezone Asia/Singapore', 'Create a basic event')
        .example('$0 event create --group 10 --title "Workshop" --start "2025-06-15T09:00:00" --end "2025-06-15T11:00:00" --timezone Asia/Singapore --ticket-title "General" --ticket-quantity 50', 'Create event with a free ticket'),
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
        if (argv['tickets-json']) {
          params.tickets_attributes = JSON.parse(argv['tickets-json'])
        } else if (argv['ticket-title']) {
          params.tickets_attributes = [{
            title:       argv['ticket-title'],
            ticket_type: argv['ticket-type'] ?? 'event',
            status:      argv['ticket-status'] ?? 'normal',
            quantity:    argv['ticket-quantity'] ?? null,
          }]
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
        .option('tickets-json', {
          type: 'string',
          describe: 'tickets_attributes as a JSON array. Include "id" on existing tickets to update them, "_destroy: true" to remove. Omit "id" to add new ones.',
        })
        .example('$0 event update --id 42 --title "Renamed Event" --location "Online"', 'Update title and location')
        .example('$0 event update --id 42 --tickets-json \'[{"title":"VIP","quantity":10,"ticket_type":"event","status":"normal"}]\'', 'Add a ticket to an existing event'),
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
        if (argv['tickets-json']) {
          params.tickets_attributes = JSON.parse(argv['tickets-json'])
        }
        console.log(JSON.stringify(await updateEvent(params), null, 2))
      })
    )
    .command(
      'discover',
      'Get featured events, popups, and top groups for the discover page. No auth required.',
      (y) => y
        .example('$0 event discover', 'Fetch featured events and groups'),
      handleError(async () => {
        console.log(JSON.stringify(await discoverEvents(), null, 2))
      })
    )
    .command(
      'my-events',
      'List events related to you (attending, starred, or past). Requires auth.',
      (y) => y
        .option('collection', {
          type: 'string',
          describe: 'Filter: upcoming, past, or my_stars. Omit for all your participated events.',
        })
        .option('limit', { type: 'number', describe: 'Max events per page (default 40, max 1000)' })
        .option('page',  { type: 'number', describe: 'Page number for pagination (default 1)' })
        .example('$0 event my-events --collection upcoming', 'Your upcoming events')
        .example('$0 event my-events --collection my_stars', 'Events you starred'),
      handleError(async (argv) => {
        const params = {
          collection: argv.collection,
          limit:      argv.limit,
          page:       argv.page,
        }
        console.log(JSON.stringify(await myEvents(params), null, 2))
      })
    )
    .command(
      'join',
      'RSVP / join an event. Requires auth. If the event has a required form, pass answers with --form-answers.',
      (y) => y
        .option('id', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric event ID to join (e.g. 42)',
        })
        .option('form-answers', {
          type: 'string',
          describe: 'JSON array of {field_id, value} answers, required only if the event has a required form',
        })
        .example('$0 event join --id 42', 'Join event 42')
        .example('$0 event join --id 42 --form-answers \'[{"field_id":1,"value":"Vegan"}]\'', 'Join with form answers'),
      handleError(async (argv) => {
        const formAnswers = argv['form-answers'] ? JSON.parse(argv['form-answers']) : undefined
        console.log(JSON.stringify(await joinEvent(argv.id, formAnswers), null, 2))
      })
    )
    .command(
      'cancel',
      'Cancel your own participation in an event. Requires auth.',
      (y) => y
        .option('id', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric event ID to cancel your RSVP for (e.g. 42)',
        })
        .example('$0 event cancel --id 42', 'Cancel your RSVP for event 42'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await cancelEvent(argv.id), null, 2))
      })
    )
    .command(
      'unpublish',
      'Unpublish / cancel an event. Requires auth and event ownership or group manager role.',
      (y) => y
        .option('id', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric event ID to unpublish (e.g. 42)',
        })
        .example('$0 event unpublish --id 42', 'Unpublish event 42'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await unpublishEvent(argv.id), null, 2))
      })
    )
    .command(
      'approve',
      'Approve a pending participant on an approval-required event. Requires auth and organizer role.',
      (y) => y
        .option('participant', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric participant record ID (not a profile ID) — from the event\'s participant list',
        })
        .example('$0 event approve --participant 9001', 'Approve participant 9001'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await approveParticipant(argv.participant), null, 2))
      })
    )
    .command(
      'reject',
      'Reject a pending participant on an approval-required event. Requires auth and organizer role.',
      (y) => y
        .option('participant', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric participant record ID (not a profile ID)',
        })
        .example('$0 event reject --participant 9001', 'Reject participant 9001'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await rejectParticipant(argv.participant), null, 2))
      })
    )
    .command(
      'remove-participant',
      'Remove a participant from an event by profile ID. Requires auth and organizer role.',
      (y) => y
        .option('id', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric event ID (e.g. 42)',
        })
        .option('profile', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric profile ID of the participant to remove (e.g. 123)',
        })
        .example('$0 event remove-participant --id 42 --profile 123', 'Remove profile 123 from event 42'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await removeParticipant(argv.id, argv.profile), null, 2))
      })
    )
}
