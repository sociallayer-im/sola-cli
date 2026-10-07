import {
  getEvent, listEvents, pendingApprovalEvents, createEvent, updateEvent,
  cancelEvent, approveEvent, listEventRoles, addEventRole, updateEventRole,
  removeEventRole, eventCalendarUrl, fetchEventCalendar,
} from '../api.js'
import { handleError, splitList, parseJsonOption } from '../utils.js'

export const command = 'event <subcommand>'
export const describe = 'Get, list, create, update, cancel, and approve events; manage co-host/speaker roles; print calendar feed URLs. Browsing is public (personalizes when signed in); writes require auth. Joining/leaving/approving participants lives under `sola participant`.'

const ROLE_NAMES = 'group_host | custom_host | co_host | speaker | judge'

// Writable event fields shared by create and update (EventsController#event_params).
// group_id is create-only — an event can't be moved between groups.
const eventOptions = (y) => y
  .option('timezone', { type: 'string', describe: 'IANA timezone (e.g. Asia/Singapore). Naive --start/--end are interpreted here; defaults to the event\'s/group\'s timezone.' })
  .option('place-id', { type: 'string', describe: 'Place id for the event location (create one with `sola place create`)' })
  .option('venue-id', { type: 'string', describe: 'Venue id to book — must belong to the group (or a venue_union partner), be free at this time, and not be smaller than --max-participant' })
  .option('track-id', { type: 'string', describe: 'Track/program id (must belong to the event\'s group)' })
  .option('content', { type: 'string', describe: 'Event description. Markdown supported.' })
  .option('notes', { type: 'string', describe: 'Organizer notes' })
  .option('image-url', { type: 'string', describe: 'Cover image URL' })
  .option('image-note', { type: 'string', describe: 'The "after you\'re in" image URL (e.g. a group QR code) — only revealed to organizers and to attendees whose RSVP is settled (approved/paid)' })
  .option('tags', { type: 'string', describe: 'Comma-separated tags (on update, replaces existing; "" clears)' })
  .option('requirement-tags', { type: 'string', describe: 'Comma-separated tags describing entry requirements ("" clears)' })
  .option('category', { type: 'string', describe: 'Event category' })
  .option('kind', { type: 'string', describe: 'Event kind (talk, workshop, ...)' })
  .option('max-participant', { type: 'number', describe: 'Max attendees (cannot exceed the venue capacity)' })
  .option('require-approval', { type: 'boolean', alias: 'requires-approval', describe: 'RSVPs require organizer approval before confirmed' })
  .option('meeting-url', { type: 'string', describe: 'Virtual meeting link' })
  .option('external-url', { type: 'string', describe: 'External event page URL' })
  .option('visibility', { type: 'string', choices: ['normal', 'open_registration', 'unlisted'], describe: 'normal (listed) | open_registration (listed; anyone may join even if the group restricts joining) | unlisted (link-only)' })
  .option('status', { type: 'string', choices: ['draft', 'pending', 'published', 'archived', 'closed', 'cancelled'], describe: 'Event status. In a group that requires event approval, non-managers are forced to "pending" (a pending event\'s status can only be changed by a manager — use `event approve`).' })
  .option('pinned', { type: 'boolean', describe: 'Feature on the homepage/carousel. Group managers only — silently ignored for anyone else.' })
  .option('is-group-ticket-event', { type: 'boolean', describe: 'Designate (or un-designate) this as the group\'s membership-ticket event — tickets on it grant group membership. Group managers only.' })

const eventFields = (argv) => ({
  title: argv.title,
  start_time: argv.start,
  end_time: argv.end,
  timezone: argv.timezone,
  place_id: argv['place-id'],
  venue_id: argv['venue-id'],
  track_id: argv['track-id'],
  content: argv.content,
  notes: argv.notes,
  image_url: argv['image-url'],
  image_note: argv['image-note'],
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
  pinned: argv.pinned,
})

export function builder(yargs) {
  return yargs
    .command(
      'get',
      'Fetch a single event by TSID (or a legacy sails id, during the migration window). Returns full detail: content, roles, participants, tickets.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Event TSID (e.g. "0GA2...")' })
        .option('include-participants', { type: 'boolean', default: true, describe: 'Pass --no-include-participants to omit the attendee array (your own participant row is still returned)' })
        .example('$0 event get --id 0GA2...', 'Get an event'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getEvent(argv.id, { includeParticipants: argv['include-participants'] }), null, 2))
      })
    )
    .command(
      'list',
      'Browse/search events. With --group, lists that group\'s events (and any cross-listed via group_union). Without --group, an authenticated caller sees events across their own groups; anonymous callers see all public events.',
      (y) => y
        .option('group', { type: 'string', describe: 'Group TSID or slug to scope to' })
        .option('collection', { type: 'string', describe: 'upcoming | past | ongoing | pending (awaiting approval; managers/owner only see these)' })
        .option('search-title', { type: 'string', describe: 'Case-insensitive substring match on title' })
        .option('tags', { type: 'string', describe: 'Comma-separated tags — matches events with ANY tag (e.g. "web3,defi")' })
        .option('venue', { type: 'string', describe: 'Venue id filter' })
        .option('track', { type: 'string', describe: 'Track id filter' })
        .option('kind', { type: 'string', describe: 'Event kind filter' })
        .option('category', { type: 'string', describe: 'Event category filter' })
        .option('pinned', { type: 'boolean', describe: 'Only pinned (featured) events' })
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
      'Create a new event in a group. Requires auth. Times are interpreted in --timezone (falling back to the group\'s timezone) — "2026-06-15T09:00:00" means 9am there, not UTC. In a group that requires event approval, non-managers\' events are forced to status "pending". Members-only / paid tickets can be created atomically via --tickets-json (see `sola ticket create` for the field list) or afterwards with `sola ticket create`.',
      (y) => eventOptions(y)
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID that will host this event' })
        .option('title', { type: 'string', demandOption: true, describe: 'Event title' })
        .option('start', { type: 'string', demandOption: true, describe: 'ISO 8601 start datetime, naive or with offset (e.g. "2026-06-15T09:00:00")' })
        .option('end', { type: 'string', demandOption: true, describe: 'ISO 8601 end datetime — must be after --start' })
        .option('roles-json', { type: 'string', describe: 'event_roles to create atomically, JSON array of {item_type: "User"|"Group", item_id, role, email, display_name, image_url} (role: ' + ROLE_NAMES + ')' })
        .option('tickets-json', { type: 'string', describe: 'tickets to create atomically, JSON array: {title, content, quantity, end_time, need_approval, status, ticket_type, group_id, start_date, end_date, days_allowed[], tracks_allowed[], check_badge_class_id, check_group_ids[] (members-only), payment_methods_attributes[{chain, kind, token_name, token_address, receiver_address, price, protocol, stripe_setting_id, chains[]}]}' })
        .example('$0 event create --group 0G1... --title "Workshop" --start "2026-06-15T09:00:00" --end "2026-06-15T11:00:00" --timezone Asia/Singapore', 'Create a basic event')
        .example('$0 event create --group 0G1... --title "Members night" --start "2026-06-15T19:00" --end "2026-06-15T21:00" --require-approval --tickets-json \'[{"title":"Members","check_group_ids":["0G1..."]}]\'', 'Approval-gated event with a members-only ticket'),
      handleError(async (argv) => {
        const fields = { group_id: argv.group, ...eventFields(argv) }
        const eventRoles = parseJsonOption(argv['roles-json'], 'roles-json')
        const tickets = parseJsonOption(argv['tickets-json'], 'tickets-json')
        console.log(JSON.stringify(await createEvent(fields, {
          eventRoles, tickets, isGroupTicketEvent: argv['is-group-ticket-event'],
        }), null, 2))
      })
    )
    .command(
      'update',
      'Update fields on an existing event. Only the fields you pass are changed. Requires auth and event ownership, an editor role (co_host/speaker/host), or group manager role. The event\'s group cannot be changed. Re-invites attendees (calendar update) when a calendar-relevant field changes.',
      (y) => eventOptions(y)
        .option('id', { type: 'string', demandOption: true, describe: 'Event TSID to update' })
        .option('title', { type: 'string', describe: 'New title' })
        .option('start', { type: 'string', describe: 'New start datetime' })
        .option('end', { type: 'string', describe: 'New end datetime' })
        .example('$0 event update --id 0GA2... --title "Renamed Event"', 'Update the title')
        .example('$0 event update --id 0GA2... --visibility unlisted --no-require-approval', 'Make link-only and drop approval'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await updateEvent(argv.id, eventFields(argv), {
          isGroupTicketEvent: argv['is-group-ticket-event'],
        }), null, 2))
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
    .command(
      'roles',
      'List an event\'s roles (co-hosts, speakers, judges, ...). Requires auth.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .example('$0 event roles --id 0GA2...', 'List roles'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await listEventRoles(argv.id), null, 2))
      })
    )
    .command(
      'add-role',
      'Add a role to an event. Requires auth and event owner / existing role holder / group manager. A "judge" is listed but cannot edit the event.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('role', { type: 'string', demandOption: true, choices: ['group_host', 'custom_host', 'co_host', 'speaker', 'judge'], describe: 'Role' })
        .option('item-type', { type: 'string', choices: ['User', 'Group'], describe: 'Who holds the role: User or Group (omit for a custom_host given only by display name)' })
        .option('item-id', { type: 'string', describe: 'User/Group TSID' })
        .option('email', { type: 'string', describe: 'Email (for a non-account role holder)' })
        .option('display-name', { type: 'string', describe: 'Display name' })
        .option('image-url', { type: 'string', describe: 'Avatar URL' })
        .example('$0 event add-role --id 0GA2... --role speaker --item-type User --item-id 0GB3...', 'Add a speaker'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await addEventRole(argv.id, {
          role: argv.role, item_type: argv['item-type'], item_id: argv['item-id'],
          email: argv.email, display_name: argv['display-name'], image_url: argv['image-url'],
        }), null, 2))
      })
    )
    .command(
      'update-role',
      'Update an event role. Find --role-id via `event roles`. Requires auth and event owner / role holder / group manager.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('role-id', { type: 'string', demandOption: true, describe: 'event_role id' })
        .option('role', { type: 'string', choices: ['group_host', 'custom_host', 'co_host', 'speaker', 'judge'], describe: 'New role' })
        .option('item-type', { type: 'string', choices: ['User', 'Group'], describe: 'User or Group' })
        .option('item-id', { type: 'string', describe: 'User/Group TSID' })
        .option('email', { type: 'string', describe: 'Email' })
        .option('display-name', { type: 'string', describe: 'Display name' })
        .option('image-url', { type: 'string', describe: 'Avatar URL' })
        .example('$0 event update-role --id 0GA2... --role-id 55 --role co_host', 'Promote to co-host'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await updateEventRole(argv.id, argv['role-id'], {
          role: argv.role, item_type: argv['item-type'], item_id: argv['item-id'],
          email: argv.email, display_name: argv['display-name'], image_url: argv['image-url'],
        }), null, 2))
      })
    )
    .command(
      'remove-role',
      'Remove a role from an event. Requires auth and event owner / role holder / group manager.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('role-id', { type: 'string', demandOption: true, describe: 'event_role id' })
        .example('$0 event remove-role --id 0GA2... --role-id 55', 'Remove a role'),
      handleError(async (argv) => {
        await removeEventRole(argv.id, argv['role-id'])
        console.log(JSON.stringify({ result: 'removed' }, null, 2))
      })
    )
    .command(
      'calendar-url',
      'Print the public .ics feed URL for an event (no auth; only publicly visible, non-draft events resolve). Use --fetch to print the iCalendar body instead.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('webcal', { type: 'boolean', describe: 'Print a webcal:// URL (opens Apple Calendar subscribe)' })
        .option('fetch', { type: 'boolean', describe: 'Download and print the .ics content' })
        .example('$0 event calendar-url --id 0GA2...', 'Print the .ics URL'),
      handleError(async (argv) => {
        if (argv.fetch) {
          process.stdout.write(await fetchEventCalendar(argv.id))
        } else {
          console.log(JSON.stringify({ url: eventCalendarUrl(argv.id, { webcal: argv.webcal }) }, null, 2))
        }
      })
    )
}
