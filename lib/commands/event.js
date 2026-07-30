import {
  getEvent, listEvents, pendingApprovalEvents, createEvent, updateEvent,
  cancelEvent, approveEvent,
} from '../api.js'
import { handleError, splitList, parseJsonOption } from '../utils.js'

export const command = 'event <subcommand>'
export const describe = 'Get, list, create, update, and cancel events. Browsing is public (personalizes when signed in); writes require auth. Joining/leaving/approving participants lives under `sola participant`.'

export function builder(yargs) {
  return yargs
    .command(
      'get',
      'Fetch a single event by TSID (or a legacy sails id, during the migration window). Returns full detail: content, roles, participants, tickets.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Event TSID (e.g. "0GA2...")' })
        .example('$0 event get --id 0GA2...', 'Get an event'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getEvent(argv.id), null, 2))
      })
    )
    .command(
      'list',
      'Browse/search events. With --group, lists that group\'s events (and any cross-listed via group_union). Without --group, an authenticated caller sees events across their own groups; anonymous callers see all public events.',
      (y) => y
        .option('group', { type: 'string', describe: 'Group TSID or slug to scope to' })
        .option('collection', { type: 'string', describe: 'upcoming | past | ongoing' })
        .option('search-title', { type: 'string', describe: 'Case-insensitive substring match on title' })
        .option('tags', { type: 'string', describe: 'Comma-separated tags — matches events with ANY tag (e.g. "web3,defi")' })
        .option('venue', { type: 'string', describe: 'Venue id filter' })
        .option('track', { type: 'string', describe: 'Track id filter' })
        .option('kind', { type: 'string', describe: 'Event kind filter' })
        .option('category', { type: 'string', describe: 'Event category filter' })
        .option('pinned', { type: 'boolean', describe: 'Only homepage-pinned events' })
        .option('skip-recurring', { type: 'boolean', describe: 'Exclude events that belong to a recurring series' })
        .option('owner', { type: 'string', describe: 'User TSID or username — events they own (profile "hosting" tab)' })
        .option('attendee', { type: 'string', describe: 'User TSID or username — events they attend (profile "attending" tab)' })
        .option('co-host', { type: 'string', describe: 'User TSID or username — events they co-host/speak at' })
        .option('starred', { type: 'string', describe: 'User TSID or username — events they starred' })
        .option('start-date', { type: 'string', describe: 'ISO date lower bound, inclusive (e.g. 2026-06-01)' })
        .option('end-date', { type: 'string', describe: 'ISO date upper bound, inclusive (e.g. 2026-06-30)' })
        .option('timezone', { type: 'string', describe: 'Timezone the date-window filter is interpreted in (default: UTC)' })
        .option('limit', { type: 'number', describe: 'Max events per page (default 20, hard cap 500)' })
        .option('page', { type: 'number', describe: 'Page number (default 1)' })
        .example('$0 event list --group solaverse --collection upcoming --limit 20', 'Next 20 upcoming events')
        .example('$0 event list --attendee alice --collection past', 'Events alice has attended'),
      handleError(async (argv) => {
        const params = {
          group_id: argv.group,
          collection: argv.collection,
          search_title: argv['search-title'],
          tags: splitList(argv.tags),
          venue_id: argv.venue,
          track_id: argv.track,
          kind: argv.kind,
          category: argv.category,
          pinned: argv.pinned,
          skip_recurring: argv['skip-recurring'],
          owner_id: argv.owner,
          attendee_id: argv.attendee,
          co_host_id: argv['co-host'],
          starred_id: argv.starred,
          start_date: argv['start-date'],
          end_date: argv['end-date'],
          timezone: argv.timezone,
          limit: argv.limit,
          page: argv.page,
        }
        console.log(JSON.stringify(await listEvents(params), null, 2))
      })
    )
    .command(
      'pending-approval',
      'List events awaiting review across groups you manage (the manager\'s approval inbox). Requires auth.',
      (y) => y
        .option('limit', { type: 'number', describe: 'Max events per page (default 20, hard cap 500)' })
        .option('page', { type: 'number', describe: 'Page number (default 1)' })
        .example('$0 event pending-approval', 'List events awaiting your approval'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await pendingApprovalEvents({ limit: argv.limit, page: argv.page }), null, 2))
      })
    )
    .command(
      'create',
      'Create a new event in a group. Requires auth. Times are interpreted in --timezone (falling back to the group\'s timezone) — "2026-06-15T09:00:00" means 9am there, not UTC.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID that will host this event' })
        .option('title', { type: 'string', demandOption: true, describe: 'Event title' })
        .option('start', { type: 'string', demandOption: true, describe: 'ISO 8601 start datetime, naive or with offset (e.g. "2026-06-15T09:00:00")' })
        .option('end', { type: 'string', demandOption: true, describe: 'ISO 8601 end datetime — must be after --start' })
        .option('timezone', { type: 'string', describe: 'IANA timezone (e.g. Asia/Singapore). Defaults to the group\'s timezone.' })
        .option('place-id', { type: 'string', describe: 'Place id for the event location (create one with `sola place create`)' })
        .option('venue-id', { type: 'string', describe: 'Venue id to book — must belong to the group (or a venue_union partner) and be free at this time' })
        .option('track-id', { type: 'string', describe: 'Track/program id to attach to' })
        .option('content', { type: 'string', describe: 'Event description. Markdown supported.' })
        .option('image-url', { type: 'string', describe: 'Cover image URL' })
        .option('tags', { type: 'string', describe: 'Comma-separated tags' })
        .option('requirement-tags', { type: 'string', describe: 'Comma-separated tags describing entry requirements' })
        .option('category', { type: 'string', describe: 'Event category' })
        .option('kind', { type: 'string', describe: 'Event kind' })
        .option('max-participant', { type: 'number', describe: 'Max attendees. Omit for unlimited (still bounded by venue capacity, if any).' })
        .option('require-approval', { type: 'boolean', describe: 'RSVPs require organizer approval before confirmed (default false)' })
        .option('meeting-url', { type: 'string', describe: 'Virtual meeting link shown to confirmed attendees' })
        .option('external-url', { type: 'string', describe: 'External event page URL' })
        .option('visibility', { type: 'string', describe: 'Event visibility' })
        .option('status', { type: 'string', describe: 'Event status (e.g. "published", "pending"). Only group managers can pin (see --roles-json/--tickets-json note).' })
        .option('roles-json', { type: 'string', describe: 'event_roles to create atomically with the event, as a JSON array (e.g. \'[{"item_type":"User","item_id":"...","role":"speaker"}]\')' })
        .option('tickets-json', { type: 'string', describe: 'tickets to create atomically with the event, as a JSON array' })
        .example('$0 event create --group solaverse --title "Workshop" --start "2026-06-15T09:00:00" --end "2026-06-15T11:00:00" --timezone Asia/Singapore', 'Create a basic event'),
      handleError(async (argv) => {
        const fields = {
          group_id: argv.group,
          title: argv.title,
          start_time: argv.start,
          end_time: argv.end,
          timezone: argv.timezone,
          place_id: argv['place-id'],
          venue_id: argv['venue-id'],
          track_id: argv['track-id'],
          content: argv.content,
          image_url: argv['image-url'],
          tags: splitList(argv.tags),
          requirement_tags: splitList(argv['requirement-tags']),
          category: argv.category,
          kind: argv.kind,
          max_participant: argv['max-participant'],
          require_approval: argv['require-approval'],
          meeting_url: argv['meeting-url'],
          external_url: argv['external-url'],
          visibility: argv.visibility,
          status: argv.status,
        }
        const eventRoles = parseJsonOption(argv['roles-json'], 'roles-json')
        const tickets = parseJsonOption(argv['tickets-json'], 'tickets-json')
        console.log(JSON.stringify(await createEvent(fields, { eventRoles, tickets }), null, 2))
      })
    )
    .command(
      'update',
      'Update fields on an existing event. Only the fields you pass are changed. Requires auth and event ownership or group manager role. The event\'s group cannot be changed.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Event TSID to update' })
        .option('title', { type: 'string', describe: 'New title' })
        .option('start', { type: 'string', describe: 'New start datetime' })
        .option('end', { type: 'string', describe: 'New end datetime' })
        .option('timezone', { type: 'string', describe: 'New IANA timezone' })
        .option('place-id', { type: 'string', describe: 'New place id' })
        .option('venue-id', { type: 'string', describe: 'New venue id (re-validated for availability)' })
        .option('track-id', { type: 'string', describe: 'New track id' })
        .option('content', { type: 'string', describe: 'New description' })
        .option('image-url', { type: 'string', describe: 'New cover image URL' })
        .option('tags', { type: 'string', describe: 'Comma-separated tags, replaces existing tags' })
        .option('max-participant', { type: 'number', describe: 'New attendance cap' })
        .option('require-approval', { type: 'boolean', describe: 'New require-approval setting' })
        .option('meeting-url', { type: 'string', describe: 'New meeting link' })
        .option('status', { type: 'string', describe: 'New status' })
        .example('$0 event update --id 0GA2... --title "Renamed Event"', 'Update the title'),
      handleError(async (argv) => {
        const fields = {
          title: argv.title,
          start_time: argv.start,
          end_time: argv.end,
          timezone: argv.timezone,
          place_id: argv['place-id'],
          venue_id: argv['venue-id'],
          track_id: argv['track-id'],
          content: argv.content,
          image_url: argv['image-url'],
          tags: splitList(argv.tags),
          max_participant: argv['max-participant'],
          require_approval: argv['require-approval'],
          meeting_url: argv['meeting-url'],
          status: argv.status,
        }
        console.log(JSON.stringify(await updateEvent(argv.id, fields), null, 2))
      })
    )
    .command(
      'cancel',
      'Cancel an event (flips status to cancelled and emails attendees a calendar cancellation). Does not delete the record. Requires auth and event ownership or group manager role.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Event TSID to cancel' })
        .example('$0 event cancel --id 0GA2...', 'Cancel an event'),
      handleError(async (argv) => {
        await cancelEvent(argv.id)
        console.log(JSON.stringify({ result: 'cancelled' }, null, 2))
      })
    )
    .command(
      'approve',
      'Publish a pending event (one submitted where publishing requires approval). Requires auth and group manager role.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Event TSID to approve' })
        .example('$0 event approve --id 0GA2...', 'Approve and publish a pending event'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await approveEvent(argv.id), null, 2))
      })
    )
}
